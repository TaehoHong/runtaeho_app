/**
 * Running ViewModel Hooks
 *
 * RunningViewModel에서 분리된 전문화된 hook들
 */

// Types
export type {
  PaceData,
  RunningStats,
  PaceSnapshot,
  PedometerData,
  UseRunningSegmentsReturn,
  UseRunningStatsReturn,
  UseGpsTrackingProps,
  UseGpsTrackingReturn,
  UseUnityCharacterControlProps,
  UseUnityCharacterControlReturn,
  UseRunningLifecycleProps,
  UseRunningLifecycleReturn,
  UseRunningViewModelReturn,
} from './types';

export { DEFAULT_RUNNING_STATS, DEFAULT_PACE_DATA } from './types';

// Hooks
export { useRunningSegments } from './useRunningSegments';
export { useRunningStats } from './useRunningStats';
export { useGpsTracking } from './useGpsTracking';
export { useUnityCharacterControl } from './useUnityCharacterControl';
export { useRunningLifecycle } from './useRunningLifecycle';
