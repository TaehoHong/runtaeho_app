import { getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';
import { toSegmentPayload } from '../services/segmentPayload';
/**
 * 오프라인 러닝 데이터 동기화 Hook
 *
 * AuthProvider에서 분리된 단일 책임 Hook
 * - 앱 시작 시 오프라인 저장된 러닝 데이터를 서버에 동기화
 * - 네트워크 복구 시 재사용 가능
 */

import { useCallback } from 'react';
import { pointService } from '~/features/point/services/pointService';
import { queryClient } from '~/services/queryClient';
import { completeRunningRecord } from '../services/runningCompletion';
import type { EndRunningRecord } from '../models';

/**
 * 오프라인 동기화 결과
 */
interface SyncResult {
  records: { success: number; failed: number };
  segments: { success: number; failed: number };
}

/**
 * 오프라인 러닝 데이터 동기화 Hook
 *
 * @example
 * ```tsx
 * const { syncOfflineData } = useOfflineSync();
 *
 * // 앱 시작 시 동기화
 * await syncOfflineData();
 * ```
 */
export const useOfflineSync = () => {
  /**
   * 오프라인 러닝 데이터 동기화
   *
   * 현재: 앱 시작 시 자동 동기화
   * TODO: 네트워크 상태 감지 후 즉시 동기화로 업그레이드
   * - @react-native-community/netinfo 설치
   * - NetInfo.addEventListener로 실시간 감지
   */
  const syncOfflineData = useCallback(async (): Promise<SyncResult | null> => {
    const session = getSessionSnapshot();
    if (session.userId === null) return null;
    let completed: { record: EndRunningRecord; pointRevision: number } | undefined;
    let rewardChanged = false;
    try {
      const { offlineStorageService } = await import('../services/OfflineStorageService');
      const { runningService } = await import('../services/runningService');
      if (!isSessionCurrent(session)) return null;
      return await offlineStorageService.serializeReplay(async () => {
      if (!isSessionCurrent(session)) return null;

      const pendingCount = await offlineStorageService.getPendingCount();

      const result: SyncResult = {
        records: { success: 0, failed: 0 },
        segments: { success: 0, failed: 0 },
      };

      // 1. 러닝 메인 기록 동기화
      if (pendingCount > 0) {
        console.log(`🔄 [useOfflineSync] ${pendingCount}개의 오프라인 러닝 데이터 동기화 시작...`);

        const recordResult = await offlineStorageService.retryAllPendingUploads(
          async (record) => {
            const pointRevision = pointService.captureUserPointRevision();
            const response = await runningService.endRunning(record, session);
            completed = { record: response, pointRevision };
            rewardChanged ||= response.acceptanceStatus === undefined || response.acceptanceStatus === 'ACCEPTED';
            return response;
          }, session
        );

        result.records = recordResult;
        console.log(`✅ [useOfflineSync] 러닝 기록 동기화 완료: 성공 ${recordResult.success}, 실패 ${recordResult.failed}`);

        if (recordResult.failed > 0) {
          console.warn(`⚠️ [useOfflineSync] ${recordResult.failed}개의 데이터 동기화 실패 (재시도 대기 중)`);
        }
      }

      // 2. 종료 ACK로 이동된 세그먼트까지 같은 동기화에서 전송한다.
      const pendingSegmentCount = await offlineStorageService.getPendingSegmentCount();
      if (pendingSegmentCount > 0) {
        console.log(`🔄 [useOfflineSync] ${pendingSegmentCount}개의 오프라인 세그먼트 동기화 시작...`);

        const segmentResult = await offlineStorageService.retryAllPendingSegmentUploads(
          async (runningRecordId, segments) => {
            const itemsForServer = segments.map(toSegmentPayload);

            await runningService.saveRunningRecordItems({
              runningRecordId,
              items: itemsForServer,
            }, session);
          }, session
        );

        result.segments = segmentResult;
        console.log(`✅ [useOfflineSync] 세그먼트 동기화 완료: 성공 ${segmentResult.success}, 실패 ${segmentResult.failed}`);

        if (segmentResult.failed > 0) {
          console.warn(`⚠️ [useOfflineSync] ${segmentResult.failed}개의 세그먼트 동기화 실패 (재시도 대기 중)`);
        }
      }

      await offlineStorageService.retryPendingShoePatches(session);
      return pendingCount === 0 && pendingSegmentCount === 0 ? null : result;
      });
    } catch (error) {
      console.error('❌ [useOfflineSync] 오프라인 데이터 동기화 실패:', error);
      return null;
    } finally {
      // Queue ACK/segment handoff completes and releases replay before any read.
      if (completed) {
        await completeRunningRecord(completed.record, session, completed.pointRevision, queryClient, rewardChanged);
      }
    }
  }, []);

  return { syncOfflineData };
};
