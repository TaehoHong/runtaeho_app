/**
 * Running ViewModel Hooks - Shared Types
 *
 * RunningViewModel에서 분리된 hook들이 공유하는 타입 정의
 */

import type { MutableRefObject } from 'react';
import type {
  RunningRecord,
  EndRunningRecord,
  Location,
  RunningRecordItem,
} from '../../models';
import type { LocationTrackingData } from '../../services/LocationService';
import type { RunningState } from '~/stores/app/appStore';

/**
 * 페이스 데이터 타입
 */
export interface PaceData {
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

/**
 * 실시간 러닝 통계
 * Swift StatsManager에서 마이그레이션
 * 센서 데이터는 undefined 가능 (웨어러블/핸드폰 센서 없을 경우)
 */
export interface RunningStats {
  bpm: number | undefined; // Heart rate (beats per minute) - 센서 데이터 없으면 undefined
  cadence: number | undefined; // 케이던스 (steps/min) - 센서 데이터 없으면 undefined
  pace: PaceData; // 전체 평균 페이스 (러닝 시작~현재)
  instantPace: PaceData; // 순간 페이스 (최근 10초 기준)
  speed: number; // km/h
  calories: number | undefined; // 칼로리 - 센서 데이터 없으면 undefined
}

/**
 * 순간 페이스 계산을 위한 스냅샷 데이터
 */
export interface PaceSnapshot {
  timestamp: number; // 밀리초
  distance: number; // 미터
}

/**
 * 기본 RunningStats 초기값
 */
export const DEFAULT_RUNNING_STATS: RunningStats = {
  bpm: undefined,
  cadence: undefined,
  pace: { minutes: 0, seconds: 0, totalSeconds: 0 },
  instantPace: { minutes: 0, seconds: 0, totalSeconds: 0 },
  speed: 0,
  calories: undefined,
};

/**
 * 기본 PaceData 초기값
 */
export const DEFAULT_PACE_DATA: PaceData = {
  minutes: 0,
  seconds: 0,
  totalSeconds: 0,
};

// ============================================
// Hook Return Types
// ============================================

/**
 * useRunningSegments hook 반환 타입
 */
export interface UseRunningSegmentsReturn {
  // State
  currentSegmentItems: RunningRecordItem[];
  segmentDistance: number;
  segmentLocations: Location[];

  // Refs (for synchronous access in callbacks)
  segmentItemsRef: MutableRefObject<RunningRecordItem[]>;
  segmentStartTimeRef: MutableRefObject<number | null>;

  // Actions
  createSegment: (distance: number, locations: Location[], startTime: number) => void;
  finalizeCurrentSegment: () => void;
  initializeSegmentTracking: () => void;
  processDistanceUpdate: (
    distanceDelta: number,
    newLocations: Location[],
    threshold: number
  ) => boolean; // returns true if segment was created
  resetSegments: () => void;
  setSegmentDistance: React.Dispatch<React.SetStateAction<number>>;
  setSegmentLocations: React.Dispatch<React.SetStateAction<Location[]>>;
}

/**
 * useRunningStats hook 반환 타입
 */
export interface UseRunningStatsReturn {
  // State
  stats: RunningStats;
  elapsedTime: number;

  // Refs
  statsRef: MutableRefObject<RunningStats>;
  paceSnapshotsRef: MutableRefObject<PaceSnapshot[]>;

  // Actions
  updateStats: (
    distanceMeters: number,
    elapsedSeconds: number,
    heartRate?: number,
    cadence?: number
  ) => void;
  resetStats: () => void;
  setElapsedTime: React.Dispatch<React.SetStateAction<number>>;
  setStats: React.Dispatch<React.SetStateAction<RunningStats>>;

  // Formatting utilities
  formatElapsedTime: (seconds: number) => string;
  formatBpm: (bpm: number | undefined) => string;
  formatPace: (minutes: number, seconds: number) => string;
}

/**
 * useGpsTracking hook props
 */
export interface UseGpsTrackingProps {
  runningState: RunningState;
  segmentStartTimeRef: MutableRefObject<number | null>;
  statsRef: MutableRefObject<RunningStats>;
  onSegmentCreate: (distance: number, locations: Location[], startTime: number) => void;
  onDistanceUpdate: (distanceDelta: number, newLocations: Location[]) => void;
}

/**
 * useGpsTracking hook 반환 타입
 */
export interface UseGpsTrackingReturn {
  // State
  distance: number;
  locations: Location[];
  trackingData: LocationTrackingData | null;
  useBackgroundMode: boolean;

  // Actions
  startGpsTracking: (recordId: number) => Promise<void>;
  stopGpsTracking: () => Promise<{ distance: number; locations: Location[] }>;
  pauseGpsTracking: () => void;
  resumeGpsTracking: () => void;
  setUseBackgroundMode: React.Dispatch<React.SetStateAction<boolean>>;
  resetGpsTracking: () => void;
}

/**
 * useUnityCharacterControl hook props
 */
export interface UseUnityCharacterControlProps {
  isUnityReady: boolean;
  runningState: RunningState;
  speed: number;
}

/**
 * useUnityCharacterControl hook 반환 타입
 */
export interface UseUnityCharacterControlReturn {
  // Unity control is handled via useEffect, no explicit actions needed
  // This hook is purely reactive to runningState and speed changes
}

/**
 * useRunningLifecycle hook props
 */
export interface UseRunningLifecycleProps {
  // Dependencies from other hooks
  statsRef: MutableRefObject<RunningStats>;
  segmentItemsRef: MutableRefObject<RunningRecordItem[]>;
  paceSnapshotsRef: MutableRefObject<PaceSnapshot[]>;

  // GPS actions
  startGpsTracking: (recordId: number) => Promise<void>;
  stopGpsTracking: () => Promise<{ distance: number; locations: Location[] }>;

  // Stats actions
  resetStats: () => void;
  setStats: React.Dispatch<React.SetStateAction<RunningStats>>; // Pedometer cadence 업데이트용

  // Segment actions
  initializeSegmentTracking: () => void;
  finalizeCurrentSegment: () => void;
  resetSegments: () => void;

  // Current values (for final record creation)
  distance: number;
  elapsedTime: number;
  stats: RunningStats;
  currentSegmentItems: RunningRecordItem[];
}

/**
 * Pedometer 데이터 타입
 */
export interface PedometerData {
  steps: number;
  cadence: number;
}

/**
 * useRunningLifecycle hook 반환 타입
 */
export interface UseRunningLifecycleReturn {
  // State
  runningState: RunningState;
  currentRecord: RunningRecord | null;
  startTime: number | null;
  pausedDuration: number;

  // Sensor state (타이머 업데이트에서 사용)
  sensorHeartRate: number | undefined;
  sensorCadence: number | undefined;
  pedometerData: PedometerData | null;

  // Loading states
  isStarting: boolean;
  isEnding: boolean;

  // Actions
  startRunning: () => Promise<RunningRecord>;
  pauseRunning: () => void;
  resumeRunning: () => void;
  endRunning: () => Promise<EndRunningRecord | null>;
  updateCurrentRecord: () => Promise<void>;
  resetRunning: () => void;
}

/**
 * useRunningViewModel 최종 반환 타입 (기존 API 호환)
 */
export interface UseRunningViewModelReturn {
  // State
  runningState: RunningState;
  currentRecord: RunningRecord | null;
  elapsedTime: number;
  distance: number;
  locations: Location[];
  stats: RunningStats;
  trackingData: LocationTrackingData | null;
  useBackgroundMode: boolean;
  currentSegmentItems: RunningRecordItem[];

  // Loading states
  isStarting: boolean;
  isEnding: boolean;

  // Actions
  startRunning: () => Promise<RunningRecord>;
  pauseRunning: () => void;
  resumeRunning: () => void;
  endRunning: () => Promise<EndRunningRecord | null>;
  updateCurrentRecord: () => Promise<void>;
  resetRunning: () => void;
  setUseBackgroundMode: React.Dispatch<React.SetStateAction<boolean>>;

  // Formatting utilities
  formatElapsedTime: (seconds: number) => string;
  formatBpm: (bpm: number | undefined) => string;
  formatPace: (minutes: number, seconds: number) => string;

  // Computed values
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  gpsAccuracy: number;
  currentSpeed: number;
  averageSpeed: number;
  formattedStats: ReturnType<typeof import('../../models').formatRunningRecord> | null;
}
