import { act, renderHook } from '@testing-library/react-native';
import { useRunningViewModel } from '../viewmodels/RunningViewModel';

let mockCadence = 176;
jest.mock('../services/sensors/PedometerService', () => ({
  pedometerService: { getCadenceSnapshot: () => ({ cadence: mockCadence, isMeasured: mockCadence > 0 }) },
}));
jest.mock('../viewmodels/hooks', () => ({
  useRunningStats: jest.requireActual('../viewmodels/hooks/useRunningStats').useRunningStats,
  useRunningSegments: jest.requireActual('../viewmodels/hooks/useRunningSegments').useRunningSegments,
  useUnityCharacterControl: () => undefined,
  useGpsTracking: () => ({ distance: 100, locations: [], latestPaceSignal: null, resetGpsTracking: jest.fn() }),
  useRunningLifecycle: () => ({
    runningState: require('~/stores/app/appStore').RunningState.Running,
    currentRecord: null,
    startTime: 1000,
    pausedDuration: 0,
    getActiveElapsedMs: () => Date.now() - 1000,
    sensorHeartRate: undefined,
    sensorCadence: undefined,
    resetRunning: jest.fn(),
  }),
}));

afterEach(() => jest.useRealTimers());

it('keeps measured cadence on timer ticks and uses the sensor stale zero', () => {
  jest.useFakeTimers();
  jest.setSystemTime(2000);
  mockCadence = 176;
  const { result } = renderHook(() => useRunningViewModel());
  expect(result.current.stats.cadence).toBe(176);
  act(() => jest.advanceTimersByTime(1000));
  expect(result.current.stats.cadence).toBe(176);
  mockCadence = 0;
  act(() => jest.advanceTimersByTime(1000));
  expect(result.current.stats.cadence).toBe(0);
});
