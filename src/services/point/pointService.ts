/**
 * Point Service
 * 기존 pointApi.ts에서 마이그레이션
 * RTK Query → Axios
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/config';
import type {
  PointHistory,
  PointHistoryRequest,
  CursorResult,
} from '../../features/point/models';

/**
 * Point API Service
 * 기존 pointApi.endpoints를 함수로 변환
 */
export const pointService = {
  /**
   * 포인트 히스토리 조회
   * 기존: getPointHistories query
   * Swift PointApiService.getPointHistories 메서드 대응
   */
  getPointHistories: async (params: PointHistoryRequest): Promise<CursorResult<PointHistory>> => {
    const { data } = await apiClient.get<CursorResult<PointHistory>>(
      API_ENDPOINTS.POINT.HISTORIES,
      {
        params: {
          cursor: params.cursor,
          isEarned: params.isEarned,
          startCreatedTimestamp: params.startCreatedTimestamp,
          size: params.size || 30,
        },
      }
    );
    return data;
  },

  /**
   * 사용자 포인트 잔액 조회
   * 기존: getUserPoint query
   * Swift getUserPoint 메서드 대응
   */
  getUserPoint: async (): Promise<{ userId: number; point: number }> => {
    const { data } = await apiClient.get<{ userId: number; point: number }>(
      API_ENDPOINTS.POINT.BASE
    );
    return data;
  },

  /**
   * 포인트 적립/차감
   * 기존: updateUserPoint mutation
   * Swift updateUserPoint 메서드 대응
   */
  updateUserPoint: async (params: {
    pointTypeId: number;
    point: number;
    runningRecordId?: number;
    itemId?: number;
  }): Promise<{ userId: number; point: number }> => {
    const { data } = await apiClient.post<{ userId: number; point: number }>(
      API_ENDPOINTS.POINT.BASE,
      params
    );
    return data;
  },

  /**
   * 러닝 완료 시 포인트 적립
   * 기존: earnRunningPoints mutation
   * Swift earnRunningPoints 메서드 대응
   */
  earnRunningPoints: async (params: {
    runningRecordId: number;
    distance: number;
    duration: number;
  }): Promise<{ userId: number; point: number }> => {
    const { data } = await apiClient.post<{ userId: number; point: number }>(
      API_ENDPOINTS.POINT.RUNNING,
      params
    );
    return data;
  },

  /**
   * 아이템 구매 시 포인트 차감
   * 기존: spendPointsForItem mutation
   * Swift spendPointsForItem 메서드 대응
   */
  spendPointsForItem: async (params: {
    itemId: number;
    itemPrice: number;
  }): Promise<{ userId: number; point: number }> => {
    const { data } = await apiClient.post<{ userId: number; point: number }>(
      API_ENDPOINTS.POINT.SPEND,
      params
    );
    return data;
  },

  /**
   * 일일 보너스 포인트 적립
   * 기존: earnDailyBonus mutation
   * Swift earnDailyBonus 메서드 대응
   */
  earnDailyBonus: async (params: {
    consecutiveDays: number;
  }): Promise<{ userId: number; point: number }> => {
    const { data } = await apiClient.post<{ userId: number; point: number }>(
      API_ENDPOINTS.POINT.DAILY_BONUS,
      params
    );
    return data;
  },

  /**
   * 포인트 히스토리 무한 스크롤 로드
   * 기존: loadMorePointHistories query
   * Swift PointViewModel.loadOlderHistories 메서드 대응
   */
  loadMorePointHistories: async (
    params: PointHistoryRequest
  ): Promise<CursorResult<PointHistory>> => {
    const { data } = await apiClient.get<CursorResult<PointHistory>>(
      API_ENDPOINTS.POINT.HISTORIES,
      {
        params: {
          cursor: params.cursor,
          isEarned: params.isEarned,
          startCreatedTimestamp: params.startCreatedTimestamp,
          size: params.size || 30,
        },
      }
    );
    return data;
  },

  /**
   * 최근 3개월 포인트 히스토리 조회
   * 기존: getRecentPointHistories query
   * Swift PointViewModel.loadInitialData 메서드 대응
   */
  getRecentPointHistories: async (params: {
    startDate: Date;
  }): Promise<CursorResult<PointHistory>> => {
    const { data } = await apiClient.get<CursorResult<PointHistory>>(
      API_ENDPOINTS.POINT.HISTORIES,
      {
        params: {
          startCreatedTimestamp: Math.floor(params.startDate.getTime() / 1000),
          size: 100, // 최근 3개월 데이터 충분히 로드
        },
      }
    );
    return data;
  },

  /**
   * 포인트 통계 조회
   * 기존: getPointStatistics query
   * Swift calculatePointStatistics 관련 기능
   */
  getPointStatistics: async (): Promise<{
    totalEarned: number;
    totalSpent: number;
    currentBalance: number;
    todayEarned: number;
    weeklyEarned: number;
    monthlyEarned: number;
  }> => {
    const { data } = await apiClient.get<{
      totalEarned: number;
      totalSpent: number;
      currentBalance: number;
      todayEarned: number;
      weeklyEarned: number;
      monthlyEarned: number;
    }>(API_ENDPOINTS.POINT.STATISTICS);
    return data;
  },
};
