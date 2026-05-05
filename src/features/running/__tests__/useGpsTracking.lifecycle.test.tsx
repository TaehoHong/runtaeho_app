import type { MutableRefObject } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import {
  DEFAULT_RUNNING_STATS,
  type RunningStats,
  type UseGpsTrackingProps,
} from '~/features/running/viewmodels/hooks/types';
import { useGpsTracking } from '~/features/running/viewmodels/hooks/useGpsTracking';
import { RunningTrackingCoordinator } from '~/features/running/services/RunningTrackingCoordinator';
import { RunningState, useAppStore } from '~/stores/app/appStore';
import { resetAllStores } from '~/test-utils/resetState';

type GpsHookProps = Omit<UseGpsTrackingProps, 'runningState'>;

interface MockLocation {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  speed: number;
  timestamp: Date;
}

interface MockSnapshot {
  distance: number;
  locations: MockLocation[];
  trackingData: null;
  latestPaceSignal: null;
  source: 'idle' | 'foreground' | 'background';
}

const mockSubscribe = jest.fn();
const mockGetSnapshot = jest.fn();
const mockSetRunningState = jest.fn();
const mockHandleAppStateChange = jest.fn();
const mockDestroy = jest.fn();
const mockStartSession = jest.fn();
const mockStopSession = jest.fn();
const mockPauseSession = jest.fn();
const mockResumeSession = jest.fn();
const mockResetSession = jest.fn();
const mockUnsubscribe = jest.fn();

let mockSubscriptionListener: ((snapshot: MockSnapshot) => void) | null = null;

jest.mock('~/features/running/services/RunningTrackingCoordinator', () => ({
  RunningTrackingCoordinator: jest.fn().mockImplementation(() => ({
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
    getSnapshot: (...args: unknown[]) => mockGetSnapshot(...args),
    setRunningState: (...args: unknown[]) => mockSetRunningState(...args),
    handleAppStateChange: (...args: unknown[]) => mockHandleAppStateChange(...args),
    destroy: (...args: unknown[]) => mockDestroy(...args),
    startSession: (...args: unknown[]) => mockStartSession(...args),
    stopSession: (...args: unknown[]) => mockStopSession(...args),
    pauseSession: (...args: unknown[]) => mockPauseSession(...args),
    resumeSession: (...args: unknown[]) => mockResumeSession(...args),
    resetSession: (...args: unknown[]) => mockResetSession(...args),
  })),
}));

describe('useGpsTracking lifecycle', () => {
  let appStateHandler: ((nextAppState: AppStateStatus) => void) | null = null;
  let appStateRemoveSpy: jest.Mock;
  let appStateSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  const createStatsRef = (): MutableRefObject<RunningStats> => ({
    current: {
      ...DEFAULT_RUNNING_STATS,
    },
  });

  const createSnapshot = (overrides: Partial<MockSnapshot> = {}): MockSnapshot => ({
    distance: 0,
    locations: [],
    trackingData: null,
    latestPaceSignal: null,
    source: 'idle',
    ...overrides,
  });

  const createProps = (overrides: Partial<GpsHookProps> = {}): GpsHookProps => ({
    segmentStartTimeRef: { current: 1_740_000_000_000 },
    statsRef: createStatsRef(),
    onSegmentCreate: jest.fn(),
    onDistanceUpdate: jest.fn(),
    ...overrides,
  });

  const emitAppState = async (nextAppState: AppStateStatus) => {
    if (!appStateHandler) {
      throw new Error('AppState handler is not registered');
    }

    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: nextAppState,
    });

    await act(async () => {
      appStateHandler?.(nextAppState);
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetAllStores();
    useAppStore.getState().setRunningState(RunningState.Running);

    mockSubscriptionListener = null;
    mockGetSnapshot.mockReturnValue(createSnapshot());
    mockSubscribe.mockImplementation((listener: (snapshot: MockSnapshot) => void) => {
      mockSubscriptionListener = listener;
      listener(mockGetSnapshot());
      return mockUnsubscribe;
    });
    mockHandleAppStateChange.mockResolvedValue(null);
    mockStartSession.mockResolvedValue(undefined);
    mockStopSession.mockResolvedValue({ distance: 0, locations: [] });

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

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    appStateSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('creates one coordinator and cleans up app-state and coordinator subscriptions on unmount', () => {
    const MockedCoordinator = RunningTrackingCoordinator as jest.Mock;
    const { unmount } = renderHook(() => useGpsTracking(createProps()));

    expect(MockedCoordinator).toHaveBeenCalledWith('active');
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(AppState.addEventListener).toHaveBeenCalledTimes(1);

    unmount();

    expect(appStateRemoveSpy).toHaveBeenCalledTimes(1);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('delegates tracking actions to the coordinator', async () => {
    const location: MockLocation = {
      latitude: 37.5,
      longitude: 127.0,
      altitude: 10,
      accuracy: 5,
      speed: 2.5,
      timestamp: new Date('2026-01-01T00:00:00.000Z'),
    };
    mockStopSession.mockResolvedValueOnce({ distance: 12, locations: [location] });
    const { result } = renderHook(() => useGpsTracking(createProps()));

    await act(async () => {
      await result.current.startGpsTracking(501);
    });
    expect(mockStartSession).toHaveBeenCalledWith(501);

    let stopped: Awaited<ReturnType<typeof result.current.stopGpsTracking>> | null = null;
    await act(async () => {
      stopped = await result.current.stopGpsTracking();
    });
    expect(mockStopSession).toHaveBeenCalledTimes(1);
    expect(stopped).toEqual({ distance: 12, locations: [location] });

    act(() => {
      result.current.pauseGpsTracking();
      result.current.resumeGpsTracking();
      result.current.resetGpsTracking();
    });

    expect(mockPauseSession).toHaveBeenCalledTimes(1);
    expect(mockResumeSession).toHaveBeenCalledTimes(1);
    expect(mockResetSession).toHaveBeenCalledTimes(1);
  });

  it('reflects coordinator snapshots and emits foreground segment callbacks', async () => {
    const onDistanceUpdate = jest.fn();
    const onSegmentCreate = jest.fn();
    const location: MockLocation = {
      latitude: 37.5003,
      longitude: 127.0003,
      altitude: 10,
      accuracy: 5,
      speed: 2.7,
      timestamp: new Date('2026-01-01T00:00:01.000Z'),
    };
    const { result } = renderHook(() =>
      useGpsTracking(
        createProps({
          onDistanceUpdate,
          onSegmentCreate,
        })
      )
    );

    act(() => {
      mockSubscriptionListener?.(createSnapshot({ source: 'foreground', distance: 0 }));
      mockSubscriptionListener?.(
        createSnapshot({
          source: 'foreground',
          distance: 12,
          locations: [location],
        })
      );
    });

    await waitFor(() => {
      expect(result.current.distance).toBe(12);
    });
    expect(result.current.locations).toEqual([location]);
    expect(result.current.useBackgroundMode).toBe(false);
    expect(onDistanceUpdate).toHaveBeenCalledWith(12, [location]);
    expect(onSegmentCreate).toHaveBeenCalledWith(12, [location], 1_740_000_000_000);

    act(() => {
      mockSubscriptionListener?.(
        createSnapshot({
          source: 'background',
          distance: 12,
          locations: [location],
        })
      );
    });

    await waitFor(() => {
      expect(result.current.useBackgroundMode).toBe(true);
    });
  });

  it('forwards app-state auto-pause results to the latest callback', async () => {
    const onAutoPause = jest.fn();
    mockHandleAppStateChange.mockResolvedValueOnce({
      autoPaused: true,
      reason: 'background_tracking_unavailable',
    });

    renderHook(() => useGpsTracking(createProps({ onAutoPause })));

    await emitAppState('background');

    expect(mockHandleAppStateChange).toHaveBeenCalledWith('background');
    await waitFor(() => {
      expect(onAutoPause).toHaveBeenCalledTimes(1);
    });
  });
});
