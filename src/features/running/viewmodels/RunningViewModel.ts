/**
 * Running ViewModel (Orchestrator)
 *
 * 러닝 관련 모든 hook들을 조합하는 최상위 ViewModel
 * Swift StatsManager와 Running 관련 로직들을 React Hook으로 마이그레이션
 *
 * 분리된 Hook들:
 * - useRunningStats: 통계 계산 및 포맷팅
 * - useRunningSegments: 10m 세그먼트 관리
 * - useGpsTracking: GPS 추적 (포그라운드/백그라운드)
 * - useUnityCharacterControl: Unity 캐릭터 속도 제어
 * - useRunningLifecycle: 러닝 라이프사이클 (시작/일시정지/재개/종료)
 *
 * NOTE: 기존 API 100% 호환 유지
 */

import { useCallback, useEffect } from 'react';
import { RunningState } from '~/stores/app/appStore';
import type { Location } from '../models';
import { formatRunningRecord } from '../models';

// Import hooks
import {
  useRunningStats,
  useRunningSegments,
  useGpsTracking,
  useUnityCharacterControl,
  useRunningLifecycle,
} from './hooks';

/**
 * Running ViewModel Hook
 * @param isUnityReady Unity 준비 상태
 */
export const useRunningViewModel = (isUnityReady: boolean = false) => {
  // ============================================
  // 1. Stats Hook - 통계 계산 및 포맷팅
  // ============================================
  const {
    stats,
    elapsedTime,
    statsRef,
    paceSnapshotsRef,
    updateStats,
    resetStats,
    setElapsedTime,
    setStats,
    formatElapsedTime,
    formatBpm,
    formatPace,
  } = useRunningStats();

  // ============================================
  // 2. Segments Hook - 10m 세그먼트 관리
  // ============================================
  const {
    currentSegmentItems,
    segmentDistance,
    segmentLocations,
    segmentItemsRef,
    segmentStartTimeRef,
    createSegment,
    finalizeCurrentSegment,
    initializeSegmentTracking,
    processDistanceUpdate,
    resetSegments,
    setSegmentDistance,
    setSegmentLocations,
  } = useRunningSegments({ statsRef });

  // ============================================
  // 3. GPS Tracking Hook - GPS 추적
  // NOTE: runningState는 hook 내부에서 useAppStore로 직접 읽음
  // ============================================
  const {
    distance,
    locations,
    trackingData,
    useBackgroundMode,
    startGpsTracking,
    stopGpsTracking,
    pauseGpsTracking,
    resumeGpsTracking,
    setUseBackgroundMode,
    resetGpsTracking,
  } = useGpsTracking({
    segmentStartTimeRef,
    statsRef,
    onSegmentCreate: createSegment,
    onDistanceUpdate: (distanceDelta, newLocations) => {
      setSegmentDistance((prev) => prev + distanceDelta);
      setSegmentLocations((prev) => [...prev, ...newLocations]);
    },
  });

  // ============================================
  // 4. Lifecycle Hook - 러닝 라이프사이클
  // ============================================
  const {
    runningState,
    currentRecord,
    startTime,
    pausedDuration,
    sensorHeartRate,
    sensorCadence,
    pedometerData,
    isStarting,
    isEnding,
    startRunning,
    pauseRunning,
    resumeRunning,
    endRunning,
    updateCurrentRecord,
    resetRunning: resetLifecycle,
  } = useRunningLifecycle({
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
  });

  // ============================================
  // 5. Unity Character Control Hook
  // ============================================
  useUnityCharacterControl({
    isUnityReady,
    runningState,
    speed: stats.speed,
  });

  // ============================================
  // Timer Effect - 실시간 시간/통계 업데이트
  // 원본 코드와 동일하게 sensorHeartRate, sensorCadence 전달
  // ============================================
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (runningState === RunningState.Running && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const totalElapsed = Math.floor((now - startTime) / 1000);
        // 일시정지 시간을 제외한 실제 러닝 시간
        const actualElapsed = totalElapsed - pausedDuration;
        setElapsedTime(actualElapsed);

        // 실시간 통계 업데이트 (센서 데이터 포함 - 원본 코드 복원)
        updateStats(distance, actualElapsed, sensorHeartRate, sensorCadence);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    runningState,
    startTime,
    distance,
    sensorHeartRate,
    sensorCadence,
    pausedDuration,
    updateStats,
    setElapsedTime,
  ]);

  // ============================================
  // Combined Reset
  // ============================================
  const resetRunning = useCallback(() => {
    resetLifecycle();
    resetGpsTracking();
  }, [resetLifecycle, resetGpsTracking]);

  // ============================================
  // Additional Actions (기존 API 호환)
  // ============================================

  /**
   * 거리 업데이트 (GPS 트래킹)
   */
  const updateDistance = useCallback((newDistance: number) => {
    // GPS hook에서 직접 관리하므로 현재는 no-op
    console.log('[useRunningViewModel] updateDistance called:', newDistance);
  }, []);

  /**
   * 위치 추가
   */
  const addLocation = useCallback((location: Location) => {
    // GPS hook에서 직접 관리하므로 현재는 no-op
    console.log('[useRunningViewModel] addLocation called');
  }, []);

  // ============================================
  // Return (기존 API 100% 호환)
  // ============================================
  return {
    // State
    runningState,
    currentRecord,
    elapsedTime,
    distance,
    locations,
    stats,
    trackingData,
    useBackgroundMode,
    currentSegmentItems,

    // Loading states
    isStarting,
    isEnding,

    // Actions
    startRunning,
    pauseRunning,
    resumeRunning,
    endRunning,
    updateCurrentRecord,
    updateDistance,
    addLocation,
    resetRunning,
    setUseBackgroundMode,

    // Formatting utilities
    formatElapsedTime,
    formatBpm,
    formatPace,

    // Computed values
    isRunning: runningState === RunningState.Running,
    isPaused: runningState === RunningState.Paused,
    isCompleted: runningState === RunningState.Finished,
    gpsAccuracy: trackingData?.accuracy || 0,
    currentSpeed: trackingData?.currentSpeed || 0,
    averageSpeed: trackingData?.averageSpeed || 0,
    formattedStats: currentRecord
      ? formatRunningRecord({
          ...currentRecord,
          distance,
          durationSec: elapsedTime,
          heartRate: stats.bpm ?? 0,
          calorie: stats.calories !== undefined ? Math.round(stats.calories) : 0,
        })
      : null,
  };
};
