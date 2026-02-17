import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import type { MutableRefObject } from 'react';
import {
  DEFAULT_RUNNING_STATS,
  type RunningStats,
} from '~/features/running/viewmodels/hooks/types';
import { useGpsTracking } from '~/features/running/viewmodels/hooks/useGpsTracking';
import { RunningState, useAppStore } from '~/stores/app/appStore';
import { resetAllStores } from '~/test-utils/resetState';

const mockBackgroundStartTracking = jest.fn();
const mockBackgroundStopTracking = jest.fn();
const mockGetTotalDistance = jest.fn();
const mockGetBackgroundLocations = jest.fn();
const mockLocationStartTracking = jest.fn();
const mockLocationStopTracking = jest.fn();
const mockLocationPauseTracking = jest.fn();
const mockLocationResumeTracking = jest.fn();
const mockSubscribeToLocation = jest.fn();
const mockSubscribeToTrackingData = jest.fn();
const locationServiceState = {
  totalDistanceMeters: 0,
  allLocations: [] as Array<{
    latitude: number;
    longitude: number;
    altitude: number;
    accuracy: number;
    speed: number;
    timestamp: Date;
  }>,
};

jest.mock('~/features/running/services/BackgroundTaskService', () => ({
  backgroundTaskService: {
    startBackgroundTracking: (...args: unknown[]) => mockBackgroundStartTracking(...args),
    stopBackgroundTracking: (...args: unknown[]) => mockBackgroundStopTracking(...args),
    getTotalDistance: (...args: unknown[]) => mockGetTotalDistance(...args),
    getBackgroundLocations: (...args: unknown[]) => mockGetBackgroundLocations(...args),
  },
}));

jest.mock('~/features/running/services/LocationService', () => ({
  locationService: {
    startTracking: (...args: unknown[]) => mockLocationStartTracking(...args),
    stopTracking: (...args: unknown[]) => mockLocationStopTracking(...args),
    pauseTracking: (...args: unknown[]) => mockLocationPauseTracking(...args),
    resumeTracking: (...args: unknown[]) => mockLocationResumeTracking(...args),
    subscribeToLocation: (...args: unknown[]) => mockSubscribeToLocation(...args),
    subscribeToTrackingData: (...args: unknown[]) => mockSubscribeToTrackingData(...args),
    get totalDistanceMeters() {
      return locationServiceState.totalDistanceMeters;
    },
    get allLocations() {
      return locationServiceState.allLocations;
    },
  },
}));

describe('useGpsTracking lifecycle', () => {
  let appStateHandler: ((nextAppState: AppStateStatus) => void) | null = null;
  let appStateRemoveSpy: jest.Mock;
  let appStateSpy: jest.SpyInstance;

  const createStatsRef = (): MutableRefObject<RunningStats> => ({
    current: {
      ...DEFAULT_RUNNING_STATS,
    },
  });

  const createBackgroundLocations = () => [
    {
      latitude: 37.5,
      longitude: 127.0,
      altitude: 10,
      accuracy: 5,
      speed: 2.5,
      timestamp: 1_740_000_000_000,
    },
    {
      latitude: 37.5001,
      longitude: 127.0001,
      altitude: 10,
      accuracy: 5,
      speed: 2.8,
      timestamp: 1_740_000_001_000,
    },
  ];

  const createHookProps = () => {
    return {
      segmentStartTimeRef: { current: 1_740_000_000_000 },
      statsRef: createStatsRef(),
      onSegmentCreate: jest.fn(),
      onDistanceUpdate: jest.fn(),
    };
  };

  const emitAppState = (nextAppState: AppStateStatus) => {
    if (!appStateHandler) {
      throw new Error('AppState handler is not registered');
    }

    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: nextAppState,
    });

    act(() => {
      appStateHandler?.(nextAppState);
    });
  };

  const tick = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetAllStores();

    useAppStore.getState().setRunningState(RunningState.Stopped);

    mockBackgroundStartTracking.mockResolvedValue(undefined);
    mockBackgroundStopTracking.mockResolvedValue(undefined);
    mockGetTotalDistance.mockResolvedValue(0);
    mockGetBackgroundLocations.mockResolvedValue([]);
    mockLocationStartTracking.mockResolvedValue(undefined);
    mockLocationStopTracking.mockImplementation(() => undefined);
    mockLocationPauseTracking.mockImplementation(() => undefined);
    mockLocationResumeTracking.mockImplementation(() => undefined);
    mockSubscribeToLocation.mockReturnValue(jest.fn());
    mockSubscribeToTrackingData.mockReturnValue(jest.fn());
    locationServiceState.totalDistanceMeters = 0;
    locationServiceState.allLocations = [];

    appStateHandler = null;
    appStateRemoveSpy = jest.fn();

    appStateSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((type, handler) => {
      if (type === 'change') {
        appStateHandler = handler;
      }

      return { remove: appStateRemoveSpy };
    });

    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
  });

  afterEach(() => {
    appStateSpy.mockRestore();
    jest.useRealTimers();
  });

  it('GPS-LC-001 starts background polling on mount when app is active and running', async () => {
    useAppStore.getState().setRunningState(RunningState.Running);
    const props = createHookProps();

    renderHook(() => useGpsTracking(props));

    await tick(1000);

    await waitFor(() => {
      expect(mockGetTotalDistance).toHaveBeenCalledTimes(1);
    });
    expect(mockGetBackgroundLocations).toHaveBeenCalledTimes(1);
    expect(props.onSegmentCreate).not.toHaveBeenCalled();
  });

  it('GPS-LC-002 stops polling when app moves to background', async () => {
    useAppStore.getState().setRunningState(RunningState.Running);
    const props = createHookProps();

    renderHook(() => useGpsTracking(props));
    await tick(1000);
    expect(mockGetTotalDistance).toHaveBeenCalledTimes(1);

    emitAppState('background');
    await tick(2000);

    expect(mockGetTotalDistance).toHaveBeenCalledTimes(1);
    expect(props.onSegmentCreate).not.toHaveBeenCalled();
  });

  it('GPS-LC-003 restarts polling when app returns to active', async () => {
    useAppStore.getState().setRunningState(RunningState.Running);
    const props = createHookProps();

    renderHook(() => useGpsTracking(props));
    await tick(1000);
    expect(mockGetTotalDistance).toHaveBeenCalledTimes(1);

    emitAppState('background');
    await tick(1000);
    expect(mockGetTotalDistance).toHaveBeenCalledTimes(1);

    emitAppState('active');
    await tick(1000);

    expect(mockGetTotalDistance).toHaveBeenCalledTimes(2);
  });

  it('GPS-LC-004 creates a segment when distance delta reaches threshold', async () => {
    useAppStore.getState().setRunningState(RunningState.Running);
    const props = createHookProps();
    mockGetTotalDistance.mockResolvedValue(12);
    mockGetBackgroundLocations.mockResolvedValue(createBackgroundLocations());

    renderHook(() => useGpsTracking(props));
    await tick(1000);

    await waitFor(() => {
      expect(props.onSegmentCreate).toHaveBeenCalledTimes(1);
    });
    expect(props.onSegmentCreate).toHaveBeenCalledWith(
      12,
      expect.any(Array),
      props.segmentStartTimeRef.current
    );
    expect(props.onDistanceUpdate).not.toHaveBeenCalled();
  });

  it('GPS-LC-005 updates distance without segment creation below threshold', async () => {
    useAppStore.getState().setRunningState(RunningState.Running);
    const props = createHookProps();
    mockGetTotalDistance.mockResolvedValue(5);
    mockGetBackgroundLocations.mockResolvedValue(createBackgroundLocations());

    renderHook(() => useGpsTracking(props));
    await tick(1000);

    await waitFor(() => {
      expect(props.onDistanceUpdate).toHaveBeenCalledTimes(1);
    });
    expect(props.onDistanceUpdate).toHaveBeenCalledWith(5, expect.any(Array));
    expect(props.onSegmentCreate).not.toHaveBeenCalled();
  });

  it('GPS-LC-006 cleans up app-state subscription and interval on unmount', async () => {
    useAppStore.getState().setRunningState(RunningState.Running);
    const props = createHookProps();

    const { unmount } = renderHook(() => useGpsTracking(props));
    await tick(1000);
    const beforeUnmountCallCount = mockGetTotalDistance.mock.calls.length;

    unmount();
    expect(appStateRemoveSpy).toHaveBeenCalledTimes(1);

    await tick(2000);
    expect(mockGetTotalDistance).toHaveBeenCalledTimes(beforeUnmountCallCount);
  });

  it('GPS-LC-007 starts and stops tracking in background mode', async () => {
    useAppStore.getState().setRunningState(RunningState.Running);
    const props = createHookProps();
    mockGetTotalDistance.mockResolvedValue(15);
    mockGetBackgroundLocations.mockResolvedValue(createBackgroundLocations());
    const { result } = renderHook(() => useGpsTracking(props));

    await act(async () => {
      await result.current.startGpsTracking(501);
    });
    expect(mockBackgroundStartTracking).toHaveBeenCalledWith(501);
    expect(mockLocationStartTracking).not.toHaveBeenCalled();

    let stopped: Awaited<ReturnType<typeof result.current.stopGpsTracking>> | null = null;
    await act(async () => {
      stopped = await result.current.stopGpsTracking();
    });

    expect(mockBackgroundStopTracking).toHaveBeenCalledTimes(1);
    expect(stopped?.distance).toBe(15);
    expect(stopped?.locations[0]?.timestamp).toBeInstanceOf(Date);
    expect(mockLocationStopTracking).not.toHaveBeenCalled();
  });

  it('GPS-LC-008 starts and stops tracking in foreground mode', async () => {
    useAppStore.getState().setRunningState(RunningState.Running);
    const props = createHookProps();
    const { result } = renderHook(() => useGpsTracking(props));

    act(() => {
      result.current.setUseBackgroundMode(false);
    });
    await waitFor(() => {
      expect(result.current.useBackgroundMode).toBe(false);
    });

    await act(async () => {
      await result.current.startGpsTracking(777);
    });
    expect(mockLocationStartTracking).toHaveBeenCalledTimes(1);
    expect(mockBackgroundStartTracking).not.toHaveBeenCalled();

    locationServiceState.totalDistanceMeters = 21;
    locationServiceState.allLocations = [
      {
        latitude: 37.55,
        longitude: 127.02,
        altitude: 20,
        accuracy: 5,
        speed: 2.3,
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];

    let stopped: Awaited<ReturnType<typeof result.current.stopGpsTracking>> | null = null;
    await act(async () => {
      stopped = await result.current.stopGpsTracking();
    });
    expect(mockLocationStopTracking).toHaveBeenCalledTimes(1);
    expect(stopped?.distance).toBe(21);
    expect(stopped?.locations).toHaveLength(1);
    expect(mockBackgroundStopTracking).not.toHaveBeenCalled();
  });

  it('GPS-LC-009 handles pause, resume, and reset actions', async () => {
    useAppStore.getState().setRunningState(RunningState.Running);
    const props = createHookProps();
    mockGetTotalDistance.mockResolvedValue(8);
    mockGetBackgroundLocations.mockResolvedValue(createBackgroundLocations());
    const { result } = renderHook(() => useGpsTracking(props));

    await tick(1000);
    await waitFor(() => {
      expect(result.current.distance).toBe(8);
    });

    act(() => {
      result.current.pauseGpsTracking();
      result.current.resumeGpsTracking();
    });
    expect(mockLocationPauseTracking).toHaveBeenCalledTimes(1);
    expect(mockLocationResumeTracking).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.resetGpsTracking();
    });
    expect(result.current.distance).toBe(0);
    expect(result.current.locations).toHaveLength(0);
    expect(result.current.trackingData).toBeNull();
  });

  it('GPS-LC-010 handles foreground subscriptions and segment creation', async () => {
    useAppStore.getState().setRunningState(RunningState.Running);
    const props = createHookProps();
    const unsubscribeLocationSpy = jest.fn();
    const unsubscribeTrackingSpy = jest.fn();
    let locationCallback: ((location: {
      latitude: number;
      longitude: number;
      altitude: number;
      accuracy: number;
      speed: number;
      timestamp: Date;
    }) => void) | null = null;
    let trackingCallback: ((trackingData: {
      totalDistance: number;
      currentLocation: unknown;
      currentSpeed: number;
      averageSpeed: number;
      accuracy: number;
      isTracking: boolean;
    }) => void) | null = null;

    mockSubscribeToLocation.mockImplementation((cb) => {
      locationCallback = cb;
      return unsubscribeLocationSpy;
    });
    mockSubscribeToTrackingData.mockImplementation((cb) => {
      trackingCallback = cb;
      return unsubscribeTrackingSpy;
    });

    const { result, unmount } = renderHook(() => useGpsTracking(props));

    act(() => {
      result.current.setUseBackgroundMode(false);
    });
    await waitFor(() => {
      expect(mockSubscribeToLocation).toHaveBeenCalledTimes(1);
    });
    expect(mockGetTotalDistance).not.toHaveBeenCalled();

    const location = {
      latitude: 37.5003,
      longitude: 127.0003,
      altitude: 10,
      accuracy: 5,
      speed: 2.7,
      timestamp: new Date('2026-01-01T00:00:01.000Z'),
    };

    act(() => {
      locationCallback?.(location);
    });

    act(() => {
      trackingCallback?.({
        totalDistance: 6,
        currentLocation: location,
        currentSpeed: 2.7,
        averageSpeed: 2.6,
        accuracy: 5,
        isTracking: true,
      });
    });
    act(() => {
      trackingCallback?.({
        totalDistance: 12,
        currentLocation: location,
        currentSpeed: 2.8,
        averageSpeed: 2.7,
        accuracy: 5,
        isTracking: true,
      });
    });

    expect(props.onDistanceUpdate).toHaveBeenCalled();
    expect(props.onSegmentCreate).toHaveBeenCalledTimes(1);

    unmount();
    expect(unsubscribeLocationSpy).toHaveBeenCalledTimes(1);
    expect(unsubscribeTrackingSpy).toHaveBeenCalledTimes(1);
  });

  it('GPS-LC-011 handles polling errors without throwing', async () => {
    useAppStore.getState().setRunningState(RunningState.Running);
    const props = createHookProps();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetTotalDistance.mockRejectedValue(new Error('polling-failed'));

    renderHook(() => useGpsTracking(props));
    await tick(1000);

    expect(errorSpy).toHaveBeenCalledWith(
      '[useGpsTracking] Failed to poll background distance:',
      expect.any(Error)
    );
    expect(props.onSegmentCreate).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
