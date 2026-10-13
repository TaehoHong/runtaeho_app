import { waitFor } from '@testing-library/react-native';
import type { AppStateStatus } from 'react-native';
import { RunningState } from '~/stores/app/appStore';
import { RunningTrackingCoordinator } from '~/features/running/services/RunningTrackingCoordinator';

const mockBackgroundStartTracking = jest.fn();
const mockBackgroundStopTracking = jest.fn();
const mockBackgroundClearData = jest.fn();
const mockBackgroundIsTaskRegistered = jest.fn();
const mockBackgroundSyncTracking = jest.fn();
const mockBackgroundResumeTracking = jest.fn();
const mockBackgroundPauseTracking = jest.fn();
const mockGetTotalDistance = jest.fn();
const mockGetBackgroundLocations = jest.fn();
const mockGetLatestPaceSignal = jest.fn();
const mockGetBackgroundGpsFilterState = jest.fn();

const mockLocationStartTracking = jest.fn();
const mockLocationStopTracking = jest.fn();
const mockLocationPauseTracking = jest.fn();
const mockLocationResumeTracking = jest.fn();
const mockLocationGetGpsFilterState = jest.fn();
const mockSubscribeToLocation = jest.fn();
const mockSubscribeToTrackingData = jest.fn();
const mockSubscribeToPaceSignal = jest.fn();

jest.mock('~/features/running/services/BackgroundTaskService', () => ({
  backgroundTaskService: {
    startBackgroundTracking: (...args: unknown[]) => mockBackgroundStartTracking(...args),
    stopBackgroundTracking: (...args: unknown[]) => mockBackgroundStopTracking(...args),
    clearBackgroundData: (...args: unknown[]) => mockBackgroundClearData(...args),
    isTaskRegistered: (...args: unknown[]) => mockBackgroundIsTaskRegistered(...args),
    persistBackgroundTrackingState: (...args: unknown[]) => mockBackgroundSyncTracking(...args),
    activateBackgroundSession: (...args: unknown[]) => mockBackgroundResumeTracking(...args),
    deactivateBackgroundSession: (...args: unknown[]) => mockBackgroundPauseTracking(...args),
    getTotalDistance: (...args: unknown[]) => mockGetTotalDistance(...args),
    getBackgroundLocations: (...args: unknown[]) => mockGetBackgroundLocations(...args),
    getLatestPaceSignal: (...args: unknown[]) => mockGetLatestPaceSignal(...args),
    getGpsFilterState: (...args: unknown[]) => mockGetBackgroundGpsFilterState(...args),
  },
}));

jest.mock('~/features/running/services/LocationService', () => ({
  locationService: {
    startTracking: (...args: unknown[]) => mockLocationStartTracking(...args),
    stopTracking: (...args: unknown[]) => mockLocationStopTracking(...args),
    pauseTracking: (...args: unknown[]) => mockLocationPauseTracking(...args),
    resumeTracking: (...args: unknown[]) => mockLocationResumeTracking(...args),
    getGpsFilterState: (...args: unknown[]) => mockLocationGetGpsFilterState(...args),
    subscribeToLocation: (...args: unknown[]) => mockSubscribeToLocation(...args),
    subscribeToTrackingData: (...args: unknown[]) => mockSubscribeToTrackingData(...args),
    subscribeToPaceSignal: (...args: unknown[]) => mockSubscribeToPaceSignal(...args),
  },
}));

const createDeferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};

const createCoordinator = (appState: AppStateStatus = 'active') =>
  new RunningTrackingCoordinator(appState);

describe('RunningTrackingCoordinator Android background handoff', () => {
  const filterState = {
    lastAcceptedSample: null,
    lastRawSample: null,
    pendingCandidate: null,
  };
  let coordinator: RunningTrackingCoordinator | null = null;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();

    mockBackgroundStartTracking.mockResolvedValue(undefined);
    mockBackgroundStopTracking.mockResolvedValue(undefined);
    mockBackgroundClearData.mockResolvedValue(undefined);
    mockBackgroundIsTaskRegistered.mockResolvedValue(true);
    mockBackgroundSyncTracking.mockResolvedValue(undefined);
    mockBackgroundResumeTracking.mockResolvedValue(undefined);
    mockBackgroundPauseTracking.mockResolvedValue(undefined);
    mockGetTotalDistance.mockResolvedValue(0);
    mockGetBackgroundLocations.mockResolvedValue([]);
    mockGetLatestPaceSignal.mockResolvedValue(null);
    mockGetBackgroundGpsFilterState.mockResolvedValue(filterState);

    mockLocationStartTracking.mockResolvedValue(undefined);
    mockLocationStopTracking.mockImplementation(() => undefined);
    mockLocationPauseTracking.mockImplementation(() => undefined);
    mockLocationResumeTracking.mockImplementation(() => undefined);
    mockLocationGetGpsFilterState.mockReturnValue(filterState);
    mockSubscribeToLocation.mockReturnValue(jest.fn());
    mockSubscribeToTrackingData.mockReturnValue(jest.fn());
    mockSubscribeToPaceSignal.mockReturnValue(jest.fn());

    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    await coordinator?.destroy();
    coordinator = null;
    consoleWarnSpy.mockRestore();
  });

  it('registers a dormant background task before starting foreground tracking while active', async () => {
    coordinator = createCoordinator('active');

    await coordinator.startSession(101);

    expect(mockBackgroundStartTracking).toHaveBeenCalledWith(101, {}, { shouldProcessLocations: false });
    expect(mockLocationStartTracking).toHaveBeenCalledTimes(1);
    expect(mockBackgroundSyncTracking).not.toHaveBeenCalled();
    expect(coordinator.getSnapshot().source).toBe('foreground');
  });

  it('remembers background app state while pre-registration is pending and resumes the registered task', async () => {
    const registration = createDeferred();
    mockBackgroundStartTracking.mockReturnValueOnce(registration.promise);
    coordinator = createCoordinator('active');

    const startPromise = coordinator.startSession(102);
    const appStateResult = await coordinator.handleAppStateChange('background');

    expect(appStateResult).toBeNull();
    expect(mockLocationStartTracking).not.toHaveBeenCalled();

    registration.resolve(undefined);
    await startPromise;

    expect(mockLocationStartTracking).not.toHaveBeenCalled();
    expect(mockBackgroundSyncTracking).toHaveBeenCalledWith(
      102,
      expect.objectContaining({ totalDistance: 0 }),
      { shouldProcessLocations: true }
    );
    expect(mockBackgroundResumeTracking).toHaveBeenCalledWith({ resetFilterState: false });
    expect(coordinator.getSnapshot().source).toBe('background');
  });

  it('hands off to the registered background task when foreground start resolves after app backgrounding', async () => {
    const foregroundStart = createDeferred();
    mockLocationStartTracking.mockReturnValueOnce(foregroundStart.promise);
    coordinator = createCoordinator('active');

    const startPromise = coordinator.startSession(103);
    await waitFor(() => expect(mockLocationStartTracking).toHaveBeenCalledTimes(1));

    const appStateResult = await coordinator.handleAppStateChange('background');
    expect(appStateResult).toBeNull();

    foregroundStart.resolve(undefined);
    await startPromise;

    expect(mockLocationStopTracking).toHaveBeenCalledTimes(1);
    expect(mockBackgroundSyncTracking).toHaveBeenCalledWith(
      103,
      expect.objectContaining({ filterState }),
      { shouldProcessLocations: true }
    );
    expect(mockBackgroundResumeTracking).toHaveBeenCalledWith({ resetFilterState: false });
    expect(coordinator.getSnapshot().source).toBe('background');
  });

  it('falls back to the registered background task when foreground start rejects after app backgrounding', async () => {
    const foregroundStart = createDeferred();
    mockLocationStartTracking.mockReturnValueOnce(foregroundStart.promise);
    coordinator = createCoordinator('active');

    const startPromise = coordinator.startSession(104);
    await waitFor(() => expect(mockLocationStartTracking).toHaveBeenCalledTimes(1));

    const appStateResult = await coordinator.handleAppStateChange('background');
    expect(appStateResult).toBeNull();

    foregroundStart.reject(new Error('foreground-start-failed'));
    await startPromise;

    expect(mockLocationStopTracking).toHaveBeenCalledTimes(1);
    expect(mockBackgroundSyncTracking).toHaveBeenCalledWith(
      104,
      expect.objectContaining({ totalDistance: 0 }),
      { shouldProcessLocations: true }
    );
    expect(mockBackgroundResumeTracking).toHaveBeenCalledWith({ resetFilterState: false });
    expect(mockBackgroundStopTracking).not.toHaveBeenCalled();
    expect(mockBackgroundClearData).not.toHaveBeenCalled();
    expect(coordinator.getSnapshot().source).toBe('background');
  });

  it('auto-pauses without starting a new background task when the registered task disappears', async () => {
    coordinator = createCoordinator('active');
    await coordinator.startSession(105);
    mockBackgroundStartTracking.mockClear();
    mockBackgroundIsTaskRegistered.mockResolvedValueOnce(false);

    const result = await coordinator.handleAppStateChange('background');

    expect(result).toEqual({ autoPaused: true, reason: 'background_tracking_unavailable' });
    expect(mockBackgroundStartTracking).not.toHaveBeenCalled();
    expect(mockLocationStopTracking).toHaveBeenCalledTimes(1);
    expect(mockBackgroundSyncTracking).not.toHaveBeenCalled();
    expect(mockBackgroundResumeTracking).not.toHaveBeenCalled();
    expect(coordinator.getSnapshot().source).toBe('idle');
  });

  it('fails initial background start when no registered task is available and clears startup state', async () => {
    mockBackgroundIsTaskRegistered.mockResolvedValue(false);
    coordinator = createCoordinator('background');

    await expect(coordinator.startSession(106)).rejects.toThrow(
      'Background tracking task is not registered while app is not active'
    );

    expect(mockBackgroundStartTracking).not.toHaveBeenCalled();
    expect(mockLocationStartTracking).not.toHaveBeenCalled();
    expect(mockLocationStopTracking).not.toHaveBeenCalled();
    expect(mockBackgroundStopTracking).not.toHaveBeenCalled();
    expect(mockBackgroundClearData).not.toHaveBeenCalled();
    expect(coordinator.getSnapshot().source).toBe('idle');

    await coordinator.handleAppStateChange('active');

    expect(mockLocationStartTracking).not.toHaveBeenCalled();
    expect(coordinator.getSnapshot().source).toBe('idle');
  });

  it('keeps transition guard available after failed startup', async () => {
    const registration = createDeferred();
    mockBackgroundStartTracking.mockReturnValueOnce(registration.promise);
    coordinator = createCoordinator('active');

    const startPromise = coordinator.startSession(107);
    await waitFor(() => expect(mockBackgroundStartTracking).toHaveBeenCalled());
    await coordinator.handleAppStateChange('background');
    mockBackgroundIsTaskRegistered.mockResolvedValueOnce(false);
    registration.resolve(undefined);

    await expect(startPromise).rejects.toThrow(
      'Background tracking task is not registered while app is not active'
    );

    coordinator.setRunningState(RunningState.Running);
    await coordinator.handleAppStateChange('active');

    expect(mockLocationStartTracking).not.toHaveBeenCalled();
  });
  it('converges to active when foreground return arrives during background handoff', async () => {
    coordinator = createCoordinator();
    await coordinator.startSession(108);
    const handoff = createDeferred();
    mockBackgroundSyncTracking.mockReturnValueOnce(handoff.promise);
    const background = coordinator.handleAppStateChange('background');
    await waitFor(() => expect(mockBackgroundSyncTracking).toHaveBeenCalled());
    const active = coordinator.handleAppStateChange('active');
    handoff.resolve();
    await Promise.all([background, active]);
    expect(coordinator.getSnapshot().source).toBe('foreground');
    expect(mockLocationStartTracking).toHaveBeenCalledTimes(2);
  });

  it('keeps the foreground source during inactive and active transitions', async () => {
    coordinator = createCoordinator();
    await coordinator.startSession(109);
    await coordinator.handleAppStateChange('inactive');
    await coordinator.handleAppStateChange('active');
    expect(coordinator.getSnapshot().source).toBe('foreground');
    expect(mockBackgroundSyncTracking).not.toHaveBeenCalled();
    expect(mockLocationStartTracking).toHaveBeenCalledTimes(1);
  });

  it('finishes reset cleanup before registering a new session', async () => {
    coordinator = createCoordinator();
    await coordinator.startSession(110);
    const cleanup = createDeferred();
    mockBackgroundClearData.mockReturnValueOnce(cleanup.promise);
    coordinator.resetSession();
    const next = coordinator.startSession(111);
    await waitFor(() => expect(mockBackgroundClearData).toHaveBeenCalled());
    expect(mockBackgroundStartTracking).toHaveBeenCalledTimes(1);
    cleanup.resolve();
    await next;
    expect(mockBackgroundStartTracking).toHaveBeenLastCalledWith(111, {}, { shouldProcessLocations: false });
    expect(coordinator.getSnapshot().source).toBe('foreground');
  });

});
