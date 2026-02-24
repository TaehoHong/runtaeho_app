/**
 * Running Service
 * 기존 runningApi.ts에서 마이그레이션
 * RTK Query → Axios
 */

import {
  createRunningRecord,
  type EndRunningRecord,
  type RunningRecord,
} from '~/features/running/models';
import type { CursorResult } from '~/shared/utils/dto/CursorResult';
import { apiClient } from '../../../services/api/client';
import { API_ENDPOINTS } from '../../../services/api/config';

export interface RunningRecordItemGpsPoint {
  latitude: number;
  longitude: number;
  timestampMs: number;
  speed: number;
  altitude: number;
  accuracy?: number;
}

export interface RunningRecordItemResponse {
  distance: number;
  durationSec: number;
  cadence: number;
  heartRate: number;
  minHeartRate: number;
  maxHeartRate: number;
  orderIndex: number;
  startTimeStamp: number;
  endTimeStamp: number;
  gpsPoints?: RunningRecordItemGpsPoint[];
}

interface RunningRecordItemsResponse {
  items: RunningRecordItemResponse[];
}

/**
 * Running API Service
 * 기존 runningApi.endpoints를 함수로 변환
 */
export const runningService = {
  /**
   * 러닝 시작
   * 기존: startRunning mutation
   * POST /api/v1/running
   * Request: { startTimestamp: number (s), timezone: string }
   * Response: { id: number }
   */
  startRunning: async (): Promise<RunningRecord> => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';

    const { data } = await apiClient.post<{ id: number }>(
      API_ENDPOINTS.RUNNING.BASE,
      {
        startTimestamp: (Date.now() / 1000), // seconds
        timezone,
      }
    );

    return createRunningRecord(data.id);
  },

  /**
   * 러닝 종료
   * 기존: endRunning mutation
   * POST /api/v1/running/{id}/end
   * Request: { distance, durationSec, cadence, heartRate, calorie }
   * Response: EndRunningRecord
   */
  endRunning: async (runningRecord: RunningRecord): Promise<EndRunningRecord> => {
    const { data } = await apiClient.post<EndRunningRecord>(
      API_ENDPOINTS.RUNNING.END(runningRecord.id),
      {
        distance: runningRecord.distance, // 미터
        durationSec: runningRecord.durationSec, // 초
        cadence: runningRecord.cadence || 0,
        heartRate: runningRecord.heartRate || 0,
        calorie: runningRecord.calorie || 0,
      }
    );
    return data;
  },

  /**
   * 러닝 기록 업데이트
   * 기존: updateRunningRecord mutation
   */
  updateRunningRecord: async (runningRecord: RunningRecord): Promise<void> => {
    await apiClient.put(API_ENDPOINTS.RUNNING.DETAIL(runningRecord.id), runningRecord);
  },

  /**
   * 러닝 기록 조회 (페이지네이션)
   * 기존: getRunningRecords query
   */
  getRunningRecords: async (params: {
    cursor?: number;
    size?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<CursorResult<RunningRecord>> => {
    const queryParams: Record<string, any> = {};

    if (params.cursor !== undefined) queryParams.cursor = params.cursor;
    if (params.size !== undefined) queryParams.size = params.size;
    if (params.startDate) queryParams.startTimestamp = Math.floor(params.startDate.getTime() / 1000);
    if (params.endDate) queryParams.endTimestamp = Math.floor(params.endDate.getTime() / 1000);

    const { data } = await apiClient.get<CursorResult<RunningRecord>>(
      API_ENDPOINTS.RUNNING.SEARCH,
      { params: queryParams }
    );
    return data;
  },

  /**
   * 기간별 러닝 기록 전체 로드
   * 기존: loadRunningRecords query
   */
  loadRunningRecords: async (params: {
    startDate: Date;
    endDate?: Date;
  }): Promise<RunningRecord[]> => {
    const records: RunningRecord[] = [];
    let hasNext = true;
    let cursor: number | undefined = undefined;

    // 모든 페이지를 순차적으로 로드
    while (hasNext) {
      const queryParams: Record<string, any> = {
        cursor,
        startTimestamp: Math.floor(params.startDate.getTime() / 1000),
        endTimestamp: Math.floor((params.endDate || new Date()).getTime() / 1000),
      };

      const { data } = await apiClient.get<CursorResult<RunningRecord>>(
        API_ENDPOINTS.RUNNING.SEARCH,
        { params: queryParams }
      );

      records.push(...data.content);
      cursor = data.cursor;
      hasNext = data.hasNext;
    }

    // 시작 시간 기준 내림차순 정렬 (Swift와 동일)
    records.sort((a, b) => b.startTimestamp - a.startTimestamp);

    return records;
  },

  /**
   * 더 많은 기록 로드 (무한 스크롤)
   * 기존: loadMoreRecords query
   */
  loadMoreRecords: async (params: {
    cursor?: number;
    size: number;
  }): Promise<CursorResult<RunningRecord>> => {
    const { data } = await apiClient.get<CursorResult<RunningRecord>>(
      API_ENDPOINTS.RUNNING.SEARCH,
      { params }
    );
    return data;
  },

  /**
   * 특정 러닝 기록 조회
   * 기존: getRunningRecord query
   */
  getRunningRecord: async (id: number): Promise<RunningRecord> => {
    const { data } = await apiClient.get<RunningRecord>(API_ENDPOINTS.RUNNING.DETAIL(id));
    return data;
  },

  /**
   * 러닝 기록 삭제
   * 기존: deleteRunningRecord mutation
   */
  deleteRunningRecord: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.RUNNING.DETAIL(id));
  },

  /**
   * 러닝 기록 아이템 저장 (GPS 위치 데이터)
   * POST /api/v1/running/{id}/items
   * Request: { items: CreationRunningRecordItemDto[] }
   */
  saveRunningRecordItems: async (params: {
    runningRecordId: number;
    items: {
      distance: number;           // 미터
      durationSec: number;        // 초
      cadence: number | null;            // steps/min
      heartRate: number | null;          // BPM
      minHeartRate: number | null;       // 최소 BPM
      maxHeartRate: number | null;       // 최대 BPM
      orderIndex: number;         // 순서
      startTimeStamp: number;     // Unix timestamp (초)
      endTimeStamp: number;       // Unix timestamp (초)
      gpsPoints?: RunningRecordItemGpsPoint[];
    }[];
  }): Promise<void> => {
    await apiClient.post(
      API_ENDPOINTS.RUNNING.ITEMS(params.runningRecordId),
      { items: params.items }
    );
  },

  /**
   * 러닝 기록 아이템 조회 (GPS 복원용)
   * GET /api/v1/running/{id}/items
   */
  getRunningRecordItems: async (runningRecordId: number): Promise<RunningRecordItemResponse[]> => {
    const { data } = await apiClient.get<RunningRecordItemsResponse>(
      API_ENDPOINTS.RUNNING.ITEMS(runningRecordId)
    );
    return data.items ?? [];
  },
};
