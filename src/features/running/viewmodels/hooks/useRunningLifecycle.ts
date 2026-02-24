/**
 * useRunningLifecycle Hook
 *
 * 러닝 라이프사이클 관리를 담당하는 hook
 * Swift RunningRecordService 대응
 *
 * 책임:
 * - 러닝 시작/일시정지/재개/종료
 * - 타이머 관리
 * - Pedometer 시작/중지
 * - API 호출 (React Query mutations)
 * - 오프라인 저장 지원
 */

import { useCallback, useEffect, useState } from 'react';
import type { RunningRecord, EndRunningRecord } from '../../models';
import {
  createRunningRecord,
  updateRunningRecord,
} from '../../models';
import { useStartRunning, useEndRunning, useUpdateRunningRecord } from '../../services';
import { runningService } from '../../services/runningService';
import { pedometerService, type PedometerData } from '../../services/sensors/PedometerService';
import { offlineStorageService } from '../../services/OfflineStorageService';
import { backgroundTaskService } from '../../services/BackgroundTaskService';
import { locationService } from '../../services/LocationService';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import { permissionManager } from '~/services/PermissionManager';
import type { UseRunningLifecycleProps, UseRunningLifecycleReturn } from './types';

export const useRunningLifecycle = ({
  statsRef,
  segmentItemsRef,
  paceSnapshotsRef,
  startGpsTracking,
  stopGpsTracking,
  resetStats,
  setStats,
  initializeSegmentTracking,
  finalizeCurrentSegment,
  resetSegments,
  distance,
  elapsedTime,
  stats,
  currentSegmentItems,
  useBackgroundMode,
}: UseRunningLifecycleProps): UseRunningLifecycleReturn => {
  // App store
  const runningState = useAppStore((state) => state.runningState);
  const setRunningState = useAppStore((state) => state.setRunningState);

  // State
  const [currentRecord, setCurrentRecord] = useState<RunningRecord | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pausedDuration, setPausedDuration] = useState<number>(0);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);

  // Sensor state
  const [sensorHeartRate, setSensorHeartRate] = useState<number | undefined>(undefined);
  const [sensorCadence, setSensorCadence] = useState<number | undefined>(undefined);
  const [pedometerData, setPedometerData] = useState<PedometerData | null>(null);

  // React Query Mutations
  const { mutateAsync: startRunningMutation, isPending: isStarting } = useStartRunning();
  const { mutateAsync: endRunningMutation, isPending: isEnding } = useEndRunning();
  const { mutateAsync: updateRecordMutation } = useUpdateRunningRecord();

  /**
   * 러닝 시작
   */
  const startRunning = useCallback(async (): Promise<RunningRecord> => {
    try {
      // 1. GPS 권한 확인 (v3.0 PermissionManager)
      const permissionCheck = await permissionManager.checkRequiredPermissions();

      if (!permissionCheck.location) {
        throw new Error('Location permission required');
      }

      if (!permissionCheck.locationBackground) {
        console.warn(
          '[useRunningLifecycle] Background permission not granted, using foreground only'
        );
      }

      // 2. 백엔드 API: 러닝 시작
      const record = await startRunningMutation();
      setCurrentRecord(record);
      setStartTime(Date.now());
      setPausedDuration(0);
      setPauseStartTime(null);
      setRunningState(RunningState.Running);

      // 3. GPS 추적 시작
      await startGpsTracking(record.id);

      // 4. 센서 모니터링 (현재 미구현)
      setSensorHeartRate(undefined);
      setSensorCadence(undefined);
      console.log('[useRunningLifecycle] Sensor monitoring skipped (not implemented)');

      // 5. Pedometer 시작
      try {
        await pedometerService.startTracking((data) => {
          setPedometerData(data);
          console.log(
            '[useRunningLifecycle] Pedometer - Steps:',
            data.steps,
            'Cadence:',
            data.cadence
          );
        });
        console.log('[useRunningLifecycle] Pedometer started');
      } catch (error) {
        console.warn('[useRunningLifecycle] Pedometer unavailable:', error);
      }

      // 6. Stats/Segments 초기화
      resetStats();
      paceSnapshotsRef.current = [];
      initializeSegmentTracking();

      return record;
    } catch (error) {
      console.error('[useRunningLifecycle] Failed to start running:', error);

      // GPS 추적 중지 (에러 시 정리)
      locationService.stopTracking();
      backgroundTaskService.stopBackgroundTracking().catch(console.error);
      pedometerService.stopTracking();

      // 에러 시 더미 기록 생성
      const dummyRecord = createRunningRecord(0);
      setCurrentRecord(dummyRecord);
      setStartTime(Date.now());
      setRunningState(RunningState.Running);
      return dummyRecord;
    }
  }, [
    startRunningMutation,
    startGpsTracking,
    resetStats,
    initializeSegmentTracking,
    paceSnapshotsRef,
    setRunningState,
  ]);

  /**
   * 러닝 일시정지
   */
  const pauseRunning = useCallback(() => {
    if (useBackgroundMode) {
      backgroundTaskService.pauseBackgroundTracking().catch((error) => {
        console.error('[useRunningLifecycle] Failed to pause background tracking:', error);
      });
    } else {
      locationService.pauseTracking();
    }
    setPauseStartTime(Date.now());
    setRunningState(RunningState.Paused);
    console.log('[useRunningLifecycle] Running paused');
  }, [setRunningState, useBackgroundMode]);

  /**
   * 러닝 재개
   */
  const resumeRunning = useCallback(() => {
    if (pauseStartTime) {
      const now = Date.now();
      const pauseDuration = Math.floor((now - pauseStartTime) / 1000);
      setPausedDuration((prev) => prev + pauseDuration);
      setPauseStartTime(null);
      console.log(
        `[useRunningLifecycle] Paused for ${pauseDuration}s, total paused: ${pausedDuration + pauseDuration}s`
      );
    }

    if (useBackgroundMode) {
      backgroundTaskService.resumeBackgroundTracking().catch((error) => {
        console.error('[useRunningLifecycle] Failed to resume background tracking:', error);
      });
    } else {
      locationService.resumeTracking();
    }
    setRunningState(RunningState.Running);
    console.log('[useRunningLifecycle] Running resumed');
  }, [pauseStartTime, pausedDuration, setRunningState, useBackgroundMode]);

  /**
   * 러닝 종료
   */
  const endRunning = useCallback(async (): Promise<EndRunningRecord | null> => {
    if (!currentRecord) return null;

    try {
      // 0. 마지막 세그먼트 저장
      finalizeCurrentSegment();

      // 1. GPS 추적 중지
      const { distance: finalDistance } = await stopGpsTracking();

      // 2. Pedometer 중지
      pedometerService.stopTracking();
      const finalSteps = pedometerService.getCurrentSteps();
      const finalCadence = pedometerService.getCurrentCadence();
      console.log(
        `[useRunningLifecycle] Pedometer stopped - Steps: ${finalSteps}, Cadence: ${finalCadence}`
      );

      console.log(`[useRunningLifecycle] Final stats:`, {
        distance: finalDistance,
        duration: elapsedTime,
        segments: currentSegmentItems.length,
        heartRate: stats.bpm,
        cadence: stats.cadence,
        calories: stats.calories ? Math.round(stats.calories) : undefined,
      });

      // 3. 최종 기록 업데이트
      const finalRecord = updateRunningRecord(currentRecord, {
        distance: Math.round(finalDistance),
        steps: finalSteps > 0 ? finalSteps : null,
        cadence: finalCadence > 0 ? finalCadence : (stats.cadence ?? null),
        heartRate: stats.bpm ?? null,
        calorie: stats.calories ? Math.round(stats.calories) : 0,
        durationSec: elapsedTime,
      });

      setCurrentRecord(finalRecord);

      // 4. 10m 미만이면 API 호출 없이 완료 화면으로 전환
      if (finalDistance < 10) {
        console.log('[useRunningLifecycle] 거리 10m 미만, API 호출 스킵');
        setRunningState(RunningState.Finished);
        await backgroundTaskService.clearBackgroundData();
        return null;
      }

      // 5. 백엔드 API: 러닝 종료
      try {
        const endRecord = await endRunningMutation(finalRecord);
        setRunningState(RunningState.Finished);
        console.log('[useRunningLifecycle] Running completed, data sent to server');

        // 5. 세그먼트 비동기 업로드
        const segmentsToUpload = segmentItemsRef.current;
        if (segmentsToUpload.length > 0) {
          const itemsForServer = segmentsToUpload.map((segment) => ({
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

          // 비동기로 전송 (UI 블로킹 방지)
          runningService
            .saveRunningRecordItems({
              runningRecordId: currentRecord.id,
              items: itemsForServer,
            })
            .then(() => {
              console.log(
                `[useRunningLifecycle] ${segmentsToUpload.length} segments uploaded`
              );
            })
            .catch(async (error) => {
              console.warn(
                '[useRunningLifecycle] Segment upload failed, saving offline:',
                error
              );
              try {
                await offlineStorageService.addPendingSegmentUpload(
                  currentRecord.id,
                  segmentsToUpload
                );
                console.log(
                  `[useRunningLifecycle] ${segmentsToUpload.length} segments saved offline`
                );
              } catch (offlineError) {
                console.error(
                  '[useRunningLifecycle] Segment offline save failed:',
                  offlineError
                );
              }
            });
        }

        // 6. 백그라운드 데이터 정리
        await backgroundTaskService.clearBackgroundData();

        return endRecord;
      } catch (apiError: unknown) {
        // 네트워크 에러 시 오프라인 저장
        const errorMessage =
          apiError instanceof Error ? apiError.message : 'Unknown error';
        console.warn(
          '[useRunningLifecycle] API failed, saving offline:',
          errorMessage
        );
        await offlineStorageService.addPendingUpload(currentRecord.id, finalRecord);
        setRunningState(RunningState.Finished);
        return null;
      }
    } catch (error) {
      console.error('[useRunningLifecycle] Failed to end running:', error);

      // 에러 발생 시에도 GPS 추적 중지
      locationService.stopTracking();
      backgroundTaskService.stopBackgroundTracking().catch(console.error);
      pedometerService.stopTracking();

      throw error;
    }
  }, [
    currentRecord,
    stats,
    elapsedTime,
    currentSegmentItems,
    finalizeCurrentSegment,
    stopGpsTracking,
    endRunningMutation,
    segmentItemsRef,
    setRunningState,
  ]);

  /**
   * 러닝 기록 업데이트
   */
  const updateCurrentRecord = useCallback(async () => {
    if (!currentRecord) return;

    try {
      const updatedRecord = updateRunningRecord(currentRecord, {
        distance,
        heartRate: stats.bpm ?? null,
        cadence: stats.cadence ?? null,
        calorie: stats.calories ? Math.round(stats.calories) : 0,
        durationSec: elapsedTime,
      });

      await updateRecordMutation(updatedRecord);
      setCurrentRecord(updatedRecord);
    } catch (error) {
      console.error('[useRunningLifecycle] Failed to update record:', error);
    }
  }, [currentRecord, distance, stats, elapsedTime, updateRecordMutation]);

  /**
   * 러닝 초기화
   */
  const resetRunning = useCallback(() => {
    setRunningState(RunningState.Stopped);
    setCurrentRecord(null);
    setStartTime(null);
    setPausedDuration(0);
    setPauseStartTime(null);
    setSensorHeartRate(undefined);
    setSensorCadence(undefined);
    setPedometerData(null);

    resetStats();
    resetSegments();
    paceSnapshotsRef.current = [];

    console.log('[useRunningLifecycle] Running reset');
  }, [setRunningState, resetStats, resetSegments, paceSnapshotsRef]);

  /**
   * Pedometer 데이터로 케이던스 업데이트
   * 원본 코드와 동일하게 stats에 직접 반영
   */
  useEffect(() => {
    if (runningState !== RunningState.Running) return;
    if (!pedometerData) return;

    // Pedometer 케이던스를 stats에 반영 (원본 코드 복원)
    setStats((prev) => ({
      ...prev,
      cadence: pedometerData.cadence,
    }));
  }, [pedometerData, runningState, setStats]);

  return {
    // State
    runningState,
    currentRecord,
    startTime,
    pausedDuration,

    // Sensor state (타이머 업데이트에서 사용)
    sensorHeartRate,
    sensorCadence,
    pedometerData,

    // Loading states
    isStarting,
    isEnding,

    // Actions
    startRunning,
    pauseRunning,
    resumeRunning,
    endRunning,
    updateCurrentRecord,
    resetRunning,
  };
};
