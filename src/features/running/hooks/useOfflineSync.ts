/**
 * 오프라인 러닝 데이터 동기화 Hook
 *
 * AuthProvider에서 분리된 단일 책임 Hook
 * - 앱 시작 시 오프라인 저장된 러닝 데이터를 서버에 동기화
 * - 네트워크 복구 시 재사용 가능
 */

import { useCallback } from 'react';

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
    try {
      const { offlineStorageService } = await import('../services/OfflineStorageService');
      const { runningService } = await import('../services/runningService');

      const pendingCount = await offlineStorageService.getPendingCount();
      const pendingSegmentCount = await offlineStorageService.getPendingSegmentCount();

      if (pendingCount === 0 && pendingSegmentCount === 0) {
        console.log('⚪ [useOfflineSync] 동기화할 오프라인 데이터 없음');
        return null;
      }

      const result: SyncResult = {
        records: { success: 0, failed: 0 },
        segments: { success: 0, failed: 0 },
      };

      // 1. 러닝 메인 기록 동기화
      if (pendingCount > 0) {
        console.log(`🔄 [useOfflineSync] ${pendingCount}개의 오프라인 러닝 데이터 동기화 시작...`);

        const recordResult = await offlineStorageService.retryAllPendingUploads(
          async (record) => {
            await runningService.endRunning(record);
          }
        );

        result.records = recordResult;
        console.log(`✅ [useOfflineSync] 러닝 기록 동기화 완료: 성공 ${recordResult.success}, 실패 ${recordResult.failed}`);

        if (recordResult.failed > 0) {
          console.warn(`⚠️ [useOfflineSync] ${recordResult.failed}개의 데이터 동기화 실패 (재시도 대기 중)`);
        }
      }

      // 2. 세그먼트 동기화
      if (pendingSegmentCount > 0) {
        console.log(`🔄 [useOfflineSync] ${pendingSegmentCount}개의 오프라인 세그먼트 동기화 시작...`);

        const segmentResult = await offlineStorageService.retryAllPendingSegmentUploads(
          async (runningRecordId, segments) => {
            const itemsForServer = segments.map(segment => ({
              distance: segment.distance,
              durationSec: segment.durationSec,
              cadence: segment.cadence ?? 0,
              heartRate: segment.heartRate ?? 0,
              minHeartRate: segment.heartRate ?? 0,
              maxHeartRate: segment.heartRate ?? 0,
              orderIndex: segment.orderIndex,
              startTimeStamp: segment.startTimestamp,
              endTimeStamp: segment.startTimestamp + segment.durationSec,
              gpsPoints: (segment.locations ?? []).map((point) => ({
                latitude: point.latitude,
                longitude: point.longitude,
                timestampMs: point.timestamp.getTime(),
                speed: point.speed,
                altitude: point.altitude,
                accuracy: point.accuracy,
              })),
            }));

            await runningService.saveRunningRecordItems({
              runningRecordId,
              items: itemsForServer,
            });
          }
        );

        result.segments = segmentResult;
        console.log(`✅ [useOfflineSync] 세그먼트 동기화 완료: 성공 ${segmentResult.success}, 실패 ${segmentResult.failed}`);

        if (segmentResult.failed > 0) {
          console.warn(`⚠️ [useOfflineSync] ${segmentResult.failed}개의 세그먼트 동기화 실패 (재시도 대기 중)`);
        }
      }

      return result;
    } catch (error) {
      console.error('❌ [useOfflineSync] 오프라인 데이터 동기화 실패:', error);
      return null;
    }
  }, []);

  return { syncOfflineData };
};
