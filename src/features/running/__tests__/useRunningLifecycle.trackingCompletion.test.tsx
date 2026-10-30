import { useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { createUser } from '~/features/user/models/User';
import { useUserStore } from '~/stores/user/userStore';
import { RunningState, useAppStore } from '~/stores/app/appStore';
import { backgroundTaskService } from '../services/BackgroundTaskService';
import { locationService } from '../services/LocationService';
import { offlineStorageService } from '../services/OfflineStorageService';
import { createInitialGpsFilterState } from '../services/gps/GpsFilter';
import { createInitialPaceAccumulatorState } from '../services/gps/PaceFusion';
import { useGpsTracking } from '../viewmodels/hooks/useGpsTracking';
import { useRunningSegments } from '../viewmodels/hooks/useRunningSegments';
import { useRunningLifecycle } from '../viewmodels/hooks/useRunningLifecycle';
import { DEFAULT_RUNNING_STATS, type PaceSnapshot } from '../viewmodels/hooks/types';

const mockEndRunning = jest.fn();
jest.mock('~/features/running/services', () => ({
  useStartRunning: () => ({ mutateAsync: async () => ({ id: 404, startTimestamp: 1735689600 }) }),
  useEndRunning: () => ({ mutateAsync: mockEndRunning }),
  useUpdateRunningRecord: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('~/services/PermissionManager', () => ({
  permissionManager: { checkRequiredPermissions: async () => ({ canStartRunning: true }) },
}));
jest.mock('~/features/league/services/leagueService', () => ({
  leagueService: { getCurrentLeague: async () => null },
}));
jest.mock('~/features/running/services/runningService', () => ({
  runningService: { saveRunningRecordItems: jest.fn() },
}));
jest.mock('~/features/running/services/sensors/PedometerService', () => ({
  pedometerService: {
    startTracking: async () => undefined,
    stopTracking: jest.fn(), pauseTracking: jest.fn(), resumeTracking: jest.fn(),
    getCurrentSteps: () => 0, getFinalCadence: () => 0,
    getCadenceSnapshot: () => ({ isMeasured: false }),
  },
}));
jest.mock('~/features/running/services/BackgroundTaskService', () => ({
  backgroundTaskService: {
    isTaskRegistered: jest.fn(async () => true),
    startBackgroundTracking: jest.fn(), stopBackgroundTracking: jest.fn(),
    persistBackgroundTrackingState: jest.fn(), activateBackgroundSession: jest.fn(),
    deactivateBackgroundSession: jest.fn(), clearBackgroundData: jest.fn(async () => undefined),
    takeBackgroundTrackingState: jest.fn(),
  },
}));
jest.mock('~/features/running/services/LocationService', () => ({
  locationService: {
    subscribeToLocation: jest.fn(() => jest.fn()),
    subscribeToTrackingData: jest.fn(() => jest.fn()),
    subscribeToPaceSignal: jest.fn(() => jest.fn()),
    startTracking: jest.fn(), stopTracking: jest.fn(), pauseTracking: jest.fn(),
    getCurrentTrackingData: () => ({ totalDistance: 0, currentLocation: null }),
    getLatestPaceSignal: () => null,
    getPaceState: jest.fn(), getGpsFilterState: jest.fn(), allLocations: [],
  },
}));

function useTrackingRun() {
  const statsRef = useRef(DEFAULT_RUNNING_STATS);
  const paceSnapshotsRef = useRef<PaceSnapshot[]>([]);
  const activeElapsedRef = useRef<() => number>(() => 0);
  const readActiveElapsedMs = useCallback(() => activeElapsedRef.current(), []);
  const segments = useRunningSegments({ statsRef, getActiveElapsedMs: readActiveElapsedMs });
  const gps = useGpsTracking({
    statsRef, segmentStartTimeRef: segments.segmentStartTimeRef,
    onSegmentCreate: segments.createSegment,
    onDistanceUpdate: (distance, locations) => {
      segments.setSegmentDistance(previous => previous + distance);
      segments.setSegmentLocations(previous => [...previous, ...locations]);
    },
  });
  const lifecycle = useRunningLifecycle({
    ...gps, ...segments, statsRef, paceSnapshotsRef,
    stats: DEFAULT_RUNNING_STATS, elapsedTime: 120,
    resetStats: jest.fn(), setStats: jest.fn(),
  });
  activeElapsedRef.current = lifecycle.getActiveElapsedMs;
  return { ...lifecycle, useBackgroundMode: gps.useBackgroundMode };
}

const backgroundLocation = {
  latitude: 37.5, longitude: 127, timestamp: 1735689700000,
  altitude: 20, speed: 3, accuracy: 5,
};
const backgroundState = (totalDistance: number) => ({
  totalDistance, locations: [backgroundLocation], latestPaceSignal: null,
  filterState: createInitialGpsFilterState(), paceState: createInitialPaceAccumulatorState(),
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};

describe('tracking completion snapshot', () => {
  let appStateChange: (state: AppStateStatus) => void;
  let now: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useAppStore.getState().resetAppState();
    useUserStore.setState({ currentUser: createUser({ id: 1, nickname: 'Runner' }) });
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' });
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
      appStateChange = handler;
      return { remove: jest.fn() };
    });
    now = jest.spyOn(Date, 'now').mockReturnValue(1735689600000);
    jest.mocked(locationService.getPaceState).mockReturnValue(createInitialPaceAccumulatorState());
    jest.mocked(backgroundTaskService.takeBackgroundTrackingState).mockResolvedValue(backgroundState(100));
    mockEndRunning.mockRejectedValue(new Error('offline'));
  });

  afterEach(() => jest.restoreAllMocks());

  it('persists the drained GPS segment when stop supersedes an active handoff', async () => {
    const handoff = deferred<ReturnType<typeof backgroundState>>();
    jest.mocked(backgroundTaskService.takeBackgroundTrackingState).mockReturnValueOnce(handoff.promise);
    const { result } = renderHook(useTrackingRun);
    await act(async () => { await result.current.startRunning(); });
    now.mockReturnValue(1735689720000);
    act(() => { appStateChange('active'); });
    await waitFor(() => expect(backgroundTaskService.takeBackgroundTrackingState).toHaveBeenCalled());

    let ending!: ReturnType<typeof result.current.endRunning>;
    await act(async () => { ending = result.current.endRunning(); });
    now.mockReturnValue(1735689780000);
    await act(async () => { handoff.resolve(backgroundState(100)); await ending; });

    const [saved] = await offlineStorageService.getPendingUploads();
    expect(saved?.data).toMatchObject({ distance: 100, durationSec: 120 });
    expect(saved?.segments).toMatchObject([{
      distance: 100, durationSec: 120, orderIndex: 0, endTimestamp: 1735689720,
      locations: [{ latitude: 37.5, longitude: 127, timestamp: '2025-01-01T00:01:40.000Z' }],
    }]);
    expect(locationService.startTracking).not.toHaveBeenCalled();
  });

  it('finalizes the below-threshold tail after a completed handoff and persists it once on retry', async () => {
    const { result } = renderHook(useTrackingRun);
    await act(async () => { await result.current.startRunning(); });
    now.mockReturnValue(1735689700000);
    await act(async () => { appStateChange('active'); });
    await waitFor(() => expect(result.current.useBackgroundMode).toBe(false));
    await act(async () => { appStateChange('background'); });
    await waitFor(() => expect(result.current.useBackgroundMode).toBe(true));
    now.mockReturnValue(1735689720000);
    const tail = { ...backgroundLocation, latitude: 37.5001, timestamp: new Date(1735689720000) };
    jest.mocked(backgroundTaskService.takeBackgroundTrackingState).mockResolvedValue({
      ...backgroundState(105), locations: [backgroundLocation, { ...tail, timestamp: 1735689720000 }],
    });
    act(() => { result.current.pauseRunning(); });
    const setItem = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
    jest.spyOn(AsyncStorage, 'setItem').mockImplementation(async (key, value) => {
      if (key === '@pending_running_uploads') throw new Error('disk-full');
      return setItem(key, value);
    });
    await act(async () => { await expect(result.current.endRunning()).rejects.toThrow('disk-full'); });
    jest.mocked(AsyncStorage.setItem).mockImplementation(setItem);
    now.mockReturnValue(1735689780000);
    await act(async () => { await result.current.endRunning(); });

    const [saved] = await offlineStorageService.getPendingUploads();
    expect(saved?.data).toMatchObject({ distance: 105, durationSec: 120, endTimestamp: 1735689720 });
    expect(saved?.segments).toMatchObject([
      { distance: 100, durationSec: 100, orderIndex: 0 },
      { distance: 5, durationSec: 20, orderIndex: 1, locations: [{ ...tail, timestamp: '2025-01-01T00:02:00.000Z' }] },
    ]);
  });

  it('retries a failed background drain without discarding its remaining GPS data', async () => {
    jest.mocked(backgroundTaskService.takeBackgroundTrackingState)
      .mockRejectedValueOnce(new Error('background-read-failed'));
    const { result } = renderHook(useTrackingRun);
    await act(async () => { await result.current.startRunning(); });
    now.mockReturnValue(1735689720000);
    await act(async () => {
      await expect(result.current.endRunning()).rejects.toThrow('background-read-failed');
    });
    expect(await offlineStorageService.getPendingUploads()).toEqual([]);
    now.mockReturnValue(1735689780000);
    await act(async () => { await result.current.endRunning(); });

    const [saved] = await offlineStorageService.getPendingUploads();
    expect(saved?.data).toMatchObject({ distance: 100, durationSec: 120, endTimestamp: 1735689720 });
    expect(saved?.segments).toMatchObject([{ distance: 100, durationSec: 120, endTimestamp: 1735689720 }]);
  });

  it('does not persist a stale completion after the session is replaced during the drain', async () => {
    const drain = deferred<ReturnType<typeof backgroundState>>();
    jest.mocked(backgroundTaskService.takeBackgroundTrackingState).mockReturnValueOnce(drain.promise);
    const { result } = renderHook(useTrackingRun);
    await act(async () => { await result.current.startRunning(); });
    let ending!: ReturnType<typeof result.current.endRunning>;
    await act(async () => { ending = result.current.endRunning(); });
    await waitFor(() => expect(backgroundTaskService.takeBackgroundTrackingState).toHaveBeenCalled());
    await act(async () => {
      useAuthStore.getState().invalidateSession();
      drain.resolve(backgroundState(100));
      await expect(ending).rejects.toThrow();
    });
    expect(await offlineStorageService.getPendingUploads()).toEqual([]);
    expect(mockEndRunning).not.toHaveBeenCalled();
    expect(useAppStore.getState().runningState).toBe(RunningState.Stopped);
  });
});
