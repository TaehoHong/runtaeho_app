import { toSegmentPayload } from '../../services/segmentPayload';
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

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSessionSnapshot, isSessionCurrent, useAuthStore, type SessionSnapshot } from '~/features/auth/stores/authStore';
import { SessionSupersededError } from '~/utils/storage/errors';
import { getRunningRejectionCode } from '../../services/runningRejection';
import { RunningClock } from '../../models/RunningClock';
import type { RunningRecord, EndRunningRecord } from '../../models';
import { updateRunningRecord } from '../../models';
import { useStartRunning, useEndRunning, useUpdateRunningRecord } from '../../services';
import { runningService } from '../../services/runningService';
import { pedometerService, type PedometerData } from '../../services/sensors/PedometerService';
import { offlineStorageService } from '../../services/OfflineStorageService';
import { backgroundTaskService } from '../../services/BackgroundTaskService';
import { leagueService } from '~/features/league/services/leagueService';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import { permissionManager } from '~/services/PermissionManager';
import type { UseRunningLifecycleProps, UseRunningLifecycleReturn } from './types';

export const useRunningLifecycle = ({
  statsRef: _statsRef,
  segmentItemsRef,
  paceSnapshotsRef,
  startGpsTracking,
  stopGpsTracking,
  pauseGpsTracking,
  resumeGpsTracking,
  resetGpsTracking,
  resetStats,
  setStats,
  initializeSegmentTracking,
  finalizeCurrentSegment,
  resetSegments,
  distance,
  elapsedTime,
  stats,
  currentSegmentItems,
}: UseRunningLifecycleProps): UseRunningLifecycleReturn => {
  // App store
  const runningState = useAppStore((state) => state.runningState);
  const setRunningState = useAppStore((state) => state.setRunningState);
  const setLeagueBeforeRunningEnd = useAppStore((state) => state.setLeagueBeforeRunningEnd);

  // State
  const [currentRecord, setCurrentRecord] = useState<RunningRecord | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pausedDuration, setPausedDuration] = useState<number>(0);
  const clockRef = useRef(new RunningClock());
  const getActiveElapsedMs = useCallback(() => clockRef.current.elapsed(Date.now()), []);
  const pauseStartTimeRef = useRef<number | null>(null);

  // Sensor state
  const [sensorHeartRate, setSensorHeartRate] = useState<number | undefined>(undefined);
  const [sensorCadence, setSensorCadence] = useState<number | undefined>(undefined);
  const [pedometerData, setPedometerData] = useState<PedometerData | null>(null);

  const generationRef = useRef(0);
  const sessionRef = useRef<SessionSnapshot | null>(null);
  const startOperationRef = useRef<Promise<RunningRecord> | null>(null);
  const endOperationRef = useRef<Promise<EndRunningRecord | null> | null>(null);
  const finalRecordRef = useRef<RunningRecord | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // React Query Mutations
  const { mutateAsync: startRunningMutation } = useStartRunning();
  const { mutateAsync: endRunningMutation } = useEndRunning();
  const { mutateAsync: updateRecordMutation } = useUpdateRunningRecord();

  /**
   * 러닝 시작
   */
  const performStart = useCallback(async (session: SessionSnapshot, generation: number): Promise<RunningRecord> => {
    const checkCurrent = () => {
      if (generation !== generationRef.current || !isSessionCurrent(session)) throw new SessionSupersededError();
    };
    try {
      checkCurrent();
      const permissionCheck = await permissionManager.checkRequiredPermissions();
      checkCurrent();
      if (!permissionCheck.canStartRunning) {
        throw new Error(
          permissionManager.getMissingPermissionsMessage(permissionCheck) || 'Required permissions missing'
        );
      }

      const record = await startRunningMutation(session);
      checkCurrent();
      finalRecordRef.current = null;
      endTimeRef.current = null;
      setCurrentRecord(record);
      const startedAt = Date.now();
      clockRef.current.start(startedAt);
      setStartTime(startedAt);
      setPausedDuration(0);
      pauseStartTimeRef.current = null;
      await startGpsTracking(record.id);
      checkCurrent();

      setSensorHeartRate(undefined);
      setSensorCadence(undefined);
      console.log('[useRunningLifecycle] Heart-rate monitoring skipped (not implemented)');

      await pedometerService.startTracking((data) => {
        if (generation !== generationRef.current || !isSessionCurrent(session)) return;
        setPedometerData(data);
        console.log(
          '[useRunningLifecycle] Pedometer - Steps:',
          data.steps,
          'Cadence:',
          data.cadence
        );
      });
      checkCurrent();
      console.log('[useRunningLifecycle] Pedometer started');

      resetStats();
      paceSnapshotsRef.current = [];
      initializeSegmentTracking();
      setRunningState(RunningState.Running);

      return record;
    } catch (error) {
      checkCurrent();
      console.error('[useRunningLifecycle] Failed to start running:', error);

      resetGpsTracking();
      pedometerService.stopTracking();
      setCurrentRecord(null);
      setStartTime(null);
      setPausedDuration(0);
      pauseStartTimeRef.current = null;
      setRunningState(RunningState.Stopped);
      throw error;
    }
  }, [
    startRunningMutation,
    startGpsTracking,
    resetGpsTracking,
    resetStats,
    initializeSegmentTracking,
    paceSnapshotsRef,
    setRunningState,
  ]);

  const startRunning = useCallback((): Promise<RunningRecord> => {
    if (startOperationRef.current) return startOperationRef.current;
    if (currentRecord && runningState !== RunningState.Stopped) return Promise.resolve(currentRecord);
    setIsStarting(true);
    const session = getSessionSnapshot();
    sessionRef.current = session;
    const generation = generationRef.current;
    const operation = Promise.resolve().then(() => performStart(session, generation)).finally(() => {
      if (startOperationRef.current === operation) {
        startOperationRef.current = null;
        setIsStarting(false);
      }
    });
    startOperationRef.current = operation;
    return operation;
  }, [performStart, currentRecord, runningState]);

  const applyPauseTransition = useCallback(
    (reason: 'manual' | 'auto') => {
      if (pauseStartTimeRef.current === null) {
        const now = Date.now();
        clockRef.current.pause(now);
        pauseStartTimeRef.current = now;
      }

      setRunningState(RunningState.Paused);
      console.log(`[useRunningLifecycle] Running paused (${reason})`);
    },
    [setRunningState]
  );

  /**
   * 러닝 일시정지
   */
  const pauseRunning = useCallback(() => {
    pauseGpsTracking();
    applyPauseTransition('manual');
  }, [applyPauseTransition, pauseGpsTracking]);

  const applyAutoPause = useCallback(() => {
    applyPauseTransition('auto');
  }, [applyPauseTransition]);

  /**
   * 러닝 재개
   */
  const resumeRunning = useCallback(() => {
    if (endOperationRef.current || endTimeRef.current !== null || currentRecord?.endTimestamp !== undefined) return;
    const pauseStartedAt = pauseStartTimeRef.current;
    if (pauseStartedAt !== null) {
      const now = Date.now();
      clockRef.current.resume(now);
      const pauseDuration = (now - pauseStartedAt) / 1000;
      setPausedDuration((prev) => prev + pauseDuration);
      pauseStartTimeRef.current = null;
      console.log(`[useRunningLifecycle] Paused for ${pauseDuration}s before resume`);
    }

    resumeGpsTracking();
    setRunningState(RunningState.Running);
    console.log('[useRunningLifecycle] Running resumed');
  }, [currentRecord, resumeGpsTracking, setRunningState]);

  /**
   * 러닝 종료
   */
  const performEnd = useCallback(async (): Promise<EndRunningRecord | null> => {
    if (!currentRecord) return null;
    const generation = generationRef.current;
    const session = sessionRef.current ?? getSessionSnapshot();
    const checkCurrent = () => {
      if (generation !== generationRef.current || !isSessionCurrent(session)) throw new SessionSupersededError();
    };
    checkCurrent();
    const isRetry = finalRecordRef.current !== null || currentRecord.endTimestamp !== undefined;

    try {
      let finalRecord = finalRecordRef.current ?? currentRecord;
      // 저장 재시도에서는 첫 종료의 시각·거리·세그먼트를 그대로 사용한다.
      if (!isRetry) {
        const firstEndAttempt = endTimeRef.current === null;
        const endedAt = endTimeRef.current ?? Date.now();
        endTimeRef.current = endedAt;
        clockRef.current.pause(endedAt);
        const endTimestamp = Math.floor(endedAt / 1000);
        setLeagueBeforeRunningEnd(null);
        // 0. 마지막 세그먼트 저장
        if (firstEndAttempt) finalizeCurrentSegment();

        // 1. GPS 추적 중지
        const { distance: finalDistance } = await stopGpsTracking();
        checkCurrent();

        // 2. Pedometer 중지
        pedometerService.stopTracking();
        const finalSteps = pedometerService.getCurrentSteps();
        const cadenceSnapshot = pedometerService.getCadenceSnapshot();
        const finalCadence = pedometerService.getFinalCadence();
        console.log(
          `[useRunningLifecycle] Pedometer stopped - Steps: ${finalSteps}, Cadence: ${finalCadence}, Measured: ${cadenceSnapshot.isMeasured}`
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
        finalRecord = updateRunningRecord(currentRecord, {
          distance: Math.round(finalDistance),
          steps: finalSteps > 0 ? finalSteps : null,
          cadence: finalCadence,
          heartRate: stats.bpm ?? null,
          calorie: stats.calories ? Math.round(stats.calories) : 0,
          durationSec: Math.floor(clockRef.current.elapsed(endedAt) / 1000),
          endTimestamp,
        });

        finalRecordRef.current = finalRecord;
        setCurrentRecord(finalRecord);

        // 4. 10m 미만이면 API 호출 없이 완료 화면으로 전환
        if (finalDistance < 10) {
          console.log('[useRunningLifecycle] 거리 10m 미만, API 호출 스킵');
          setRunningState(RunningState.Finished);
          await backgroundTaskService.clearBackgroundData().catch(() => {
            console.warn('[useRunningLifecycle] Background cleanup failed after the short run ended');
          });
          return null;
        }

        // 종료 API가 리그를 갱신하기 전에 애니메이션에 사용할 순위를 보관한다.
        try {
          const league = await leagueService.getCurrentLeague();
          checkCurrent();
          setLeagueBeforeRunningEnd(league && league.myRank > 0
            ? { sessionId: league.sessionId, rank: league.myRank }
            : null);
        } catch {
          console.warn('[useRunningLifecycle] League rank lookup failed, skipping rank animation');
        }
      }

      checkCurrent();
      // 5. 백엔드 API: 러닝 종료
      try {
        const endRecord = await endRunningMutation(finalRecord, session);
        checkCurrent();
        setCurrentRecord({ ...finalRecord, acceptanceStatus: endRecord.acceptanceStatus });
        if (endRecord.acceptanceStatus === 'DUPLICATE' || endRecord.acceptanceStatus === 'PERSONAL_ONLY') {
          setLeagueBeforeRunningEnd(null);
        }
        setRunningState(RunningState.Finished);
        console.log('[useRunningLifecycle] Running completed, data sent to server');

        // 5. 세그먼트 비동기 업로드
        const segmentsToUpload = segmentItemsRef.current;
        if (segmentsToUpload.length > 0 && endRecord.acceptanceStatus !== 'DUPLICATE') {
          const itemsForServer = segmentsToUpload.map(toSegmentPayload);

          // 비동기로 전송 (UI 블로킹 방지)
          runningService
            .saveRunningRecordItems({
              runningRecordId: currentRecord.id,
              items: itemsForServer,
            }, session)
            .then(() => {
              console.log(
                `[useRunningLifecycle] ${segmentsToUpload.length} segments uploaded`
              );
            })
            .catch(async (error) => {
              if (!isSessionCurrent(session)) return;
              if (getRunningRejectionCode(error)) {
                console.warn('[useRunningLifecycle] Segment upload rejected by validation');
                return;
              }
              console.warn(
                '[useRunningLifecycle] Segment upload failed, saving offline:',
                error
              );
              try {
                await offlineStorageService.addPendingSegmentUpload(
                  currentRecord.id,
                  segmentsToUpload,
                  session
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
        try {
          await backgroundTaskService.clearBackgroundData();
        } catch {
          console.warn('[useRunningLifecycle] Background cleanup failed after the record was saved');
        }

        return endRecord;
      } catch (apiError: unknown) {
        checkCurrent();
        if (getRunningRejectionCode(apiError)) {
          setLeagueBeforeRunningEnd(null);
          throw apiError;
        }
        // 네트워크 에러 시 오프라인 저장
        const errorMessage =
          apiError instanceof Error ? apiError.message : 'Unknown error';
        console.warn(
          '[useRunningLifecycle] API failed, saving offline:',
          errorMessage
        );
        await offlineStorageService.addPendingUpload(currentRecord.id, finalRecord, session);
        checkCurrent();
        const segmentsToSave = segmentItemsRef.current;
        if (segmentsToSave.length > 0) {
          await offlineStorageService.addPendingSegmentUpload(
            currentRecord.id,
            segmentsToSave,
            session
          );
          checkCurrent();
        }
        setRunningState(RunningState.Finished);
        return null;
      }
    } catch (error) {
      checkCurrent();
      console.error('[useRunningLifecycle] Failed to end running', {
        code: getRunningRejectionCode(error) ?? 'running_end_failed',
      });

      // 저장 실패 시 추적을 멈추되 최종 기록과 GPS는 재시도를 위해 유지한다.
      pauseGpsTracking();
      pedometerService.stopTracking();
      applyPauseTransition('manual');

      throw error;
    }
  }, [
    currentRecord,
    stats,
    elapsedTime,
    currentSegmentItems,
    finalizeCurrentSegment,
    stopGpsTracking,
    pauseGpsTracking,
    applyPauseTransition,
    endRunningMutation,
    segmentItemsRef,
    setRunningState,
    setLeagueBeforeRunningEnd,
  ]);

  const endRunning = useCallback((): Promise<EndRunningRecord | null> => {
    if (endOperationRef.current) return endOperationRef.current;
    if (runningState === RunningState.Finished) return Promise.resolve(null);
    setIsEnding(true);
    const operation = Promise.resolve().then(performEnd).finally(() => {
      if (endOperationRef.current === operation) {
        endOperationRef.current = null;
        setIsEnding(false);
      }
    });
    endOperationRef.current = operation;
    return operation;
  }, [performEnd, runningState]);

  /**
   * 러닝 기록 업데이트
   */
  const updateCurrentRecord = useCallback(async () => {
    if (!currentRecord) return;
    const session = sessionRef.current;
    if (!session || !isSessionCurrent(session)) return;

    try {
      const updatedRecord = updateRunningRecord(currentRecord, {
        distance,
        heartRate: stats.bpm ?? null,
        cadence: stats.cadence ?? null,
        calorie: stats.calories ? Math.round(stats.calories) : 0,
        durationSec: elapsedTime,
      });

      await updateRecordMutation(updatedRecord, session);
      if (!isSessionCurrent(session)) return;
      setCurrentRecord(updatedRecord);
    } catch (error) {
      console.error('[useRunningLifecycle] Failed to update record:', error);
    }
  }, [currentRecord, distance, stats, elapsedTime, updateRecordMutation]);

  /**
   * 러닝 초기화
   */
  const resetRunning = useCallback(() => {
    generationRef.current++;
    sessionRef.current = null;
    startOperationRef.current = null;
    endOperationRef.current = null;
    finalRecordRef.current = null;
    endTimeRef.current = null;
    setIsStarting(false);
    setIsEnding(false);
    setRunningState(RunningState.Stopped);
    setCurrentRecord(null);
    setStartTime(null);
    clockRef.current.reset();
    setPausedDuration(0);
    pauseStartTimeRef.current = null;
    setSensorHeartRate(undefined);
    setSensorCadence(undefined);
    setPedometerData(null);

    resetStats();
    resetSegments();
    paceSnapshotsRef.current = [];

    console.log('[useRunningLifecycle] Running reset');
  }, [setRunningState, resetStats, resetSegments, paceSnapshotsRef]);

  useEffect(() => useAuthStore.subscribe((state, previous) => {
    if (state.sessionGeneration !== previous.sessionGeneration) {
      resetRunning();
      resetGpsTracking();
      pedometerService.stopTracking();
    }
  }), [resetRunning, resetGpsTracking]);

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
    getActiveElapsedMs,

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
    applyAutoPause,
    resumeRunning,
    endRunning,
    updateCurrentRecord,
    resetRunning,
  };
};
