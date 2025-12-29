/**
 * useRunningStats Hook
 *
 * 러닝 통계 계산 및 포맷팅을 담당하는 hook
 * Swift StatsManager에서 마이그레이션
 *
 * 책임:
 * - 페이스 계산 (전체 평균 + 순간 페이스)
 * - 칼로리 계산 (Keytel/MET 공식)
 * - 속도 계산
 * - 타이머 관리 (elapsedTime)
 * - 통계 포맷팅 유틸리티
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  RunningStats,
  PaceData,
  PaceSnapshot,
  UseRunningStatsReturn,
} from './types';
import { DEFAULT_RUNNING_STATS, DEFAULT_PACE_DATA } from './types';

const INSTANT_PACE_WINDOW_MS = 10000; // 10초 윈도우

export const useRunningStats = (): UseRunningStatsReturn => {
  // State
  const [stats, setStats] = useState<RunningStats>(DEFAULT_RUNNING_STATS);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Refs
  const statsRef = useRef<RunningStats>(stats);
  const paceSnapshotsRef = useRef<PaceSnapshot[]>([]);

  // Sync statsRef with state
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  /**
   * 순간 페이스 계산 (최근 10초 기준)
   * 현재 거리와 10초 전 거리의 차이로 계산
   */
  const calculateInstantPace = useCallback((currentDistance: number): PaceData => {
    const now = Date.now();

    // 새 스냅샷 추가
    paceSnapshotsRef.current.push({
      timestamp: now,
      distance: currentDistance,
    });

    // 10초 이전 데이터 제거
    const cutoffTime = now - INSTANT_PACE_WINDOW_MS;
    paceSnapshotsRef.current = paceSnapshotsRef.current.filter(
      (snapshot) => snapshot.timestamp >= cutoffTime
    );

    const snapshots = paceSnapshotsRef.current;

    // 데이터가 2개 미만이면 계산 불가 - 0 반환
    if (snapshots.length < 2) {
      return DEFAULT_PACE_DATA;
    }

    // 가장 오래된 스냅샷과 현재 스냅샷 비교
    const oldestSnapshot = snapshots[0];
    const newestSnapshot = snapshots[snapshots.length - 1];

    if (!oldestSnapshot || !newestSnapshot) {
      return DEFAULT_PACE_DATA;
    }

    const distanceDelta = newestSnapshot.distance - oldestSnapshot.distance;
    const timeDeltaSeconds = (newestSnapshot.timestamp - oldestSnapshot.timestamp) / 1000;

    // 거리 변화가 없거나 시간이 너무 짧으면 0 반환
    if (distanceDelta <= 0 || timeDeltaSeconds < 1) {
      return DEFAULT_PACE_DATA;
    }

    // 순간 페이스 계산 (초/km)
    const instantPaceSeconds = Math.floor((timeDeltaSeconds / distanceDelta) * 1000);
    const instantPaceMinutes = Math.floor(instantPaceSeconds / 60);
    const instantPaceSecondsRemainder = instantPaceSeconds % 60;

    return {
      minutes: instantPaceMinutes,
      seconds: instantPaceSecondsRemainder,
      totalSeconds: instantPaceSeconds,
    };
  }, []);

  /**
   * 칼로리 계산
   * 정책: 심박수 있으면 Keytel 공식, 없으면 MET 공식
   */
  const calculateCalories = useCallback(
    (
      distanceMeters: number,
      elapsedSeconds: number,
      heartRate?: number
    ): number | undefined => {
      if (distanceMeters <= 0) return undefined;

      if (heartRate) {
        // Keytel 공식 (운동 칼로리 계산 - 심박수 기반)
        const weight = 70.0; // TODO: 사용자 실제 체중 사용
        const age = 30; // TODO: 사용자 실제 나이 사용
        const gender = 'male' as const; // TODO: 사용자 성별 사용
        const minutes = elapsedSeconds / 60.0;

        let calories: number;
        if (gender === 'male') {
          // 남성: ((-55.0969 + (0.6309 × HR) + (0.1988 × W) + (0.2017 × A)) / 4.184) × 60 × T
          calories =
            ((-55.0969 + 0.6309 * heartRate + 0.1988 * weight + 0.2017 * age) / 4.184) *
            minutes;
        } else {
          // 여성: ((-20.4022 + (0.4472 × HR) - (0.1263 × W) + (0.074 × A)) / 4.184) × 60 × T
          calories =
            ((-20.4022 + 0.4472 * heartRate - 0.1263 * weight + 0.074 * age) / 4.184) *
            minutes;
        }

        // 음수 방지
        return Math.max(0, calories);
      }

      // MET 공식 (Fallback - 심박수 없을 때)
      const weight = 70.0;
      const hours = elapsedSeconds / 3600.0;
      const met = 9.8; // 러닝 MET 값
      return met * weight * hours;
    },
    []
  );

  /**
   * 실시간 통계 업데이트
   * 센서 데이터 우선순위:
   * - 심박수: 웨어러블 → 핸드폰 센서 → undefined
   * - 케이던스: Pedometer → 웨어러블 → 핸드폰 센서 → undefined
   */
  const updateStats = useCallback(
    (
      distanceMeters: number,
      elapsedSeconds: number,
      heartRate?: number,
      cadence?: number
    ) => {
      if (elapsedSeconds === 0) return;

      // 전체 평균 페이스 계산 (분/km)
      const paceSeconds =
        distanceMeters > 0 ? Math.floor((elapsedSeconds / distanceMeters) * 1000) : 0;
      const paceMinutes = Math.floor(paceSeconds / 60);
      const paceSecondsRemainder = paceSeconds % 60;

      // 순간 페이스 계산 (최근 10초 기준)
      const instantPace = calculateInstantPace(distanceMeters);

      // 속도 계산 (km/h)
      const speedKmh = distanceMeters > 0 ? (distanceMeters / elapsedSeconds) * 3.6 : 0;

      // 칼로리 계산
      const calories = calculateCalories(distanceMeters, elapsedSeconds, heartRate);

      setStats({
        bpm: heartRate,
        cadence,
        pace: {
          minutes: paceMinutes,
          seconds: paceSecondsRemainder,
          totalSeconds: paceSeconds,
        },
        instantPace,
        speed: speedKmh,
        calories,
      });
    },
    [calculateInstantPace, calculateCalories]
  );

  /**
   * 통계 초기화
   */
  const resetStats = useCallback(() => {
    setStats(DEFAULT_RUNNING_STATS);
    setElapsedTime(0);
    paceSnapshotsRef.current = [];
    console.log('[useRunningStats] Stats reset');
  }, []);

  // ============================================
  // Formatting Utilities
  // ============================================

  /**
   * 러닝 시간 포맷팅 (MM:SS)
   */
  const formatElapsedTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  /**
   * BPM 포맷팅 (2자리 패딩 또는 '--')
   */
  const formatBpm = useCallback((bpm: number | undefined): string => {
    return bpm !== undefined ? String(bpm).padStart(2, '0') : '--';
  }, []);

  /**
   * 페이스 포맷팅 (MM:SS)
   */
  const formatPace = useCallback((minutes: number, seconds: number): string => {
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  return {
    // State
    stats,
    elapsedTime,

    // Refs
    statsRef,
    paceSnapshotsRef,

    // Actions
    updateStats,
    resetStats,
    setElapsedTime,
    setStats,

    // Formatting utilities
    formatElapsedTime,
    formatBpm,
    formatPace,
  };
};
