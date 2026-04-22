import type { MutableRefObject } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import {
  DEFAULT_RUNNING_STATS,
  type RunningStats,
  type UseGpsTrackingProps,
} from '~/features/running/viewmodels/hooks/types';
import { useGpsTracking } from '~/features/running/viewmodels/hooks/useGpsTracking';
import { RunningState, useAppStore } from '~/stores/app/appStore';
import { resetAllStores } from '~/test-utils/resetState';

type GpsHookProps = Omit<UseGpsTrackingProps, 'runningState'>;

interface MockSnapshot {
  distance: number;
  locations: {
    latitude: number;
    longitude: number;
    altitude: number;
    accuracy: number;
    speed: number;
    timestamp: Date;
  }[];
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

describe('useGpsTracking subscription stability', () => {
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

  it('keeps a single coordinator subscription across rerenders with new callbacks', () => {
    const initialProps = createProps();
    const { rerender } = renderHook((props: GpsHookProps) => useGpsTracking(props), {
      initialProps,
    });

    expect(mockSubscribe).toHaveBeenCalledTimes(1);

    rerender(
      createProps({
        onDistanceUpdate: jest.fn(),
        onSegmentCreate: jest.fn(),
        onAutoPause: jest.fn(),
      })
    );

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('uses the latest segment callbacks after rerender without resubscribing', () => {
    const initialDistanceUpdate = jest.fn();
    const initialSegmentCreate = jest.fn();
    const latestDistanceUpdate = jest.fn();
    const latestSegmentCreate = jest.fn();
    const location = {
      latitude: 37.5003,
      longitude: 127.0003,
      altitude: 10,
      accuracy: 5,
      speed: 2.7,
      timestamp: new Date('2026-01-01T00:00:01.000Z'),
    };

    const { rerender } = renderHook((props: GpsHookProps) => useGpsTracking(props), {
      initialProps: createProps({
        onDistanceUpdate: initialDistanceUpdate,
        onSegmentCreate: initialSegmentCreate,
      }),
    });

    rerender(
      createProps({
        onDistanceUpdate: latestDistanceUpdate,
        onSegmentCreate: latestSegmentCreate,
      })
    );

    act(() => {
      mockSubscriptionListener?.(
        createSnapshot({
          source: 'foreground',
          distance: 0,
          locations: [],
        })
      );
      mockSubscriptionListener?.(
        createSnapshot({
          source: 'foreground',
          distance: 12,
          locations: [location],
        })
      );
    });

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(initialDistanceUpdate).not.toHaveBeenCalled();
    expect(initialSegmentCreate).not.toHaveBeenCalled();
    expect(latestDistanceUpdate).toHaveBeenCalledWith(12, [location]);
    expect(latestSegmentCreate).toHaveBeenCalledWith(
      12,
      [location],
      1_740_000_000_000
    );
  });

  it('uses the latest auto-pause callback without recreating the app-state subscription', async () => {
    const initialAutoPause = jest.fn();
    const latestAutoPause = jest.fn();
    mockHandleAppStateChange.mockResolvedValue({
      autoPaused: true,
      reason: 'background_tracking_unavailable',
    });

    const { rerender } = renderHook((props: GpsHookProps) => useGpsTracking(props), {
      initialProps: createProps({
        onAutoPause: initialAutoPause,
      }),
    });

    rerender(
      createProps({
        onAutoPause: latestAutoPause,
      })
    );

    await emitAppState('background');

    await waitFor(() => {
      expect(latestAutoPause).toHaveBeenCalledTimes(1);
    });
    expect(initialAutoPause).not.toHaveBeenCalled();
    expect(appStateRemoveSpy).not.toHaveBeenCalled();
  });
});
