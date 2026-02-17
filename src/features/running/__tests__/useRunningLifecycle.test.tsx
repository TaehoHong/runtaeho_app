import { act, renderHook } from '@testing-library/react-native';
import type { MutableRefObject } from 'react';
import { RunningState, useAppStore } from '~/stores/app/appStore';
import { resetAllStores } from '~/test-utils/resetState';
import { useRunningLifecycle } from '~/features/running/viewmodels/hooks/useRunningLifecycle';
import { DEFAULT_RUNNING_STATS, type RunningStats } from '~/features/running/viewmodels/hooks/types';
import type { RunningRecord, RunningRecordItem } from '~/features/running/models';

const mockCheckRequiredPermissions = jest.fn();
const mockStartRunningMutation = jest.fn();
const mockEndRunningMutation = jest.fn();
const mockUpdateRecordMutation = jest.fn();
const mockPedometerStartTracking = jest.fn();
const mockPedometerStopTracking = jest.fn();
const mockPedometerGetCurrentSteps = jest.fn();
const mockPedometerGetCurrentCadence = jest.fn();
const mockOfflineAddPendingUpload = jest.fn();
const mockOfflineAddPendingSegmentUpload = jest.fn();
const mockBackgroundClearData = jest.fn();
const mockBackgroundStopTracking = jest.fn();
const mockLocationStopTracking = jest.fn();
const mockLocationPauseTracking = jest.fn();
const mockLocationResumeTracking = jest.fn();
const mockSaveRunningRecordItems = jest.fn();

jest.mock('~/services/PermissionManager', () => ({
  permissionManager: {
    checkRequiredPermissions: (...args: unknown[]) => mockCheckRequiredPermissions(...args),
  },
}));

jest.mock('~/features/running/services', () => ({
  useStartRunning: () => ({
    mutateAsync: (...args: unknown[]) => mockStartRunningMutation(...args),
    isPending: false,
  }),
  useEndRunning: () => ({
    mutateAsync: (...args: unknown[]) => mockEndRunningMutation(...args),
    isPending: false,
  }),
  useUpdateRunningRecord: () => ({
    mutateAsync: (...args: unknown[]) => mockUpdateRecordMutation(...args),
    isPending: false,
  }),
}));

jest.mock('~/features/running/services/runningService', () => ({
  runningService: {
    saveRunningRecordItems: (...args: unknown[]) => mockSaveRunningRecordItems(...args),
  },
}));

jest.mock('~/features/running/services/sensors/PedometerService', () => ({
  pedometerService: {
    startTracking: (...args: unknown[]) => mockPedometerStartTracking(...args),
    stopTracking: (...args: unknown[]) => mockPedometerStopTracking(...args),
    getCurrentSteps: (...args: unknown[]) => mockPedometerGetCurrentSteps(...args),
    getCurrentCadence: (...args: unknown[]) => mockPedometerGetCurrentCadence(...args),
  },
}));

jest.mock('~/features/running/services/OfflineStorageService', () => ({
  offlineStorageService: {
    addPendingUpload: (...args: unknown[]) => mockOfflineAddPendingUpload(...args),
    addPendingSegmentUpload: (...args: unknown[]) => mockOfflineAddPendingSegmentUpload(...args),
  },
}));

jest.mock('~/features/running/services/BackgroundTaskService', () => ({
  backgroundTaskService: {
    clearBackgroundData: (...args: unknown[]) => mockBackgroundClearData(...args),
    stopBackgroundTracking: (...args: unknown[]) => mockBackgroundStopTracking(...args),
  },
}));

jest.mock('~/features/running/services/LocationService', () => ({
  locationService: {
    stopTracking: (...args: unknown[]) => mockLocationStopTracking(...args),
    pauseTracking: (...args: unknown[]) => mockLocationPauseTracking(...args),
    resumeTracking: (...args: unknown[]) => mockLocationResumeTracking(...args),
  },
}));

const createStatsRef = (): MutableRefObject<RunningStats> => ({
  current: {
    ...DEFAULT_RUNNING_STATS,
    bpm: 145,
    cadence: 168,
    calories: 250,
    speed: 11.5,
  },
});

const createRunningRecord = (id: number): RunningRecord => ({
  id,
  distance: 0,
  steps: null,
  cadence: null,
  heartRate: null,
  calorie: 0,
  durationSec: 0,
  startTimestamp: 1735689600,
});

const buildHookProps = (overrides?: {
  stopGpsDistance?: number;
  segmentItems?: RunningRecordItem[];
  paceSnapshots?: { timestamp: number; distance: number }[];
}) => {
  const startGpsTracking = jest.fn().mockResolvedValue(undefined);
  const stopGpsTracking = jest
    .fn()
    .mockResolvedValue({ distance: overrides?.stopGpsDistance ?? 5, locations: [] as never[] });
  const resetStats = jest.fn();
  const setStats = jest.fn();
  const initializeSegmentTracking = jest.fn();
  const finalizeCurrentSegment = jest.fn();
  const resetSegments = jest.fn();

  const props = {
    statsRef: createStatsRef(),
    segmentItemsRef: { current: overrides?.segmentItems ?? ([] as RunningRecordItem[]) },
    paceSnapshotsRef: { current: overrides?.paceSnapshots ?? [] },
    startGpsTracking,
    stopGpsTracking,
    resetStats,
    setStats,
    initializeSegmentTracking,
    finalizeCurrentSegment,
    resetSegments,
    distance: 0,
    elapsedTime: 120,
    stats: {
      ...DEFAULT_RUNNING_STATS,
      bpm: 145,
      cadence: 168,
      calories: 250,
      speed: 11.5,
    },
    currentSegmentItems: [],
  };

  return {
    props,
    mocks: {
      startGpsTracking,
      stopGpsTracking,
      resetStats,
      setStats,
      initializeSegmentTracking,
      finalizeCurrentSegment,
      resetSegments,
    },
  };
};

describe('useRunningLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllStores();
    useAppStore.getState().setRunningState(RunningState.Stopped);
    mockPedometerGetCurrentSteps.mockReturnValue(0);
    mockPedometerGetCurrentCadence.mockReturnValue(0);
    mockBackgroundClearData.mockResolvedValue(undefined);
    mockBackgroundStopTracking.mockResolvedValue(undefined);
    mockPedometerStartTracking.mockResolvedValue(undefined);
    mockSaveRunningRecordItems.mockResolvedValue(undefined);
  });

  it('RUN-LIFE-001 starts running with permissions, GPS, and segment initialization', async () => {
    const record = createRunningRecord(101);
    mockCheckRequiredPermissions.mockResolvedValue({
      hasAllPermissions: true,
      location: true,
      locationBackground: true,
      motion: true,
    });
    mockStartRunningMutation.mockResolvedValue(record);

    const { props, mocks } = buildHookProps();
    const { result } = renderHook(() => useRunningLifecycle(props));

    let startedRecord: RunningRecord | null = null;
    await act(async () => {
      startedRecord = await result.current.startRunning();
    });

    expect(startedRecord?.id).toBe(101);
    expect(mocks.startGpsTracking).toHaveBeenCalledWith(101);
    expect(mocks.resetStats).toHaveBeenCalledTimes(1);
    expect(mocks.initializeSegmentTracking).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().runningState).toBe(RunningState.Running);
    expect(mockLocationStopTracking).not.toHaveBeenCalled();
  });

  it('starts with foreground-only mode and handles unavailable pedometer', async () => {
    const record = createRunningRecord(102);
    mockCheckRequiredPermissions.mockResolvedValue({
      hasAllPermissions: false,
      location: true,
      locationBackground: false,
      motion: true,
    });
    mockStartRunningMutation.mockResolvedValue(record);
    mockPedometerStartTracking.mockRejectedValue(new Error('pedometer-unavailable'));

    const { props, mocks } = buildHookProps();
    const { result } = renderHook(() => useRunningLifecycle(props));

    await act(async () => {
      const startedRecord = await result.current.startRunning();
      expect(startedRecord.id).toBe(102);
    });

    expect(mocks.startGpsTracking).toHaveBeenCalledWith(102);
    expect(mocks.resetStats).toHaveBeenCalledTimes(1);
    expect(mockPedometerStopTracking).not.toHaveBeenCalled();
  });

  it('returns dummy record and performs cleanup when start fails', async () => {
    mockCheckRequiredPermissions.mockResolvedValue({
      hasAllPermissions: false,
      location: false,
      locationBackground: false,
      motion: true,
    });

    const { props, mocks } = buildHookProps();
    const { result } = renderHook(() => useRunningLifecycle(props));

    let startedRecord: RunningRecord | null = null;
    await act(async () => {
      startedRecord = await result.current.startRunning();
    });

    expect(startedRecord?.id).toBe(0);
    expect(mockStartRunningMutation).not.toHaveBeenCalled();
    expect(mocks.startGpsTracking).not.toHaveBeenCalled();
    expect(mockLocationStopTracking).toHaveBeenCalledTimes(1);
    expect(mockPedometerStopTracking).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().runningState).toBe(RunningState.Running);
  });

  it('pauses and resumes running with pause duration accumulation', async () => {
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(7000);

    const { props } = buildHookProps();
    const { result } = renderHook(() => useRunningLifecycle(props));

    act(() => {
      result.current.pauseRunning();
    });

    expect(mockLocationPauseTracking).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().runningState).toBe(RunningState.Paused);

    act(() => {
      result.current.resumeRunning();
    });

    expect(result.current.pausedDuration).toBe(6);
    expect(mockLocationResumeTracking).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().runningState).toBe(RunningState.Running);
    dateNowSpy.mockRestore();
  });

  it('RUN-LIFE-003 skips end API call when final distance is below 10 meters', async () => {
    const record = createRunningRecord(202);
    mockCheckRequiredPermissions.mockResolvedValue({
      hasAllPermissions: true,
      location: true,
      locationBackground: true,
      motion: true,
    });
    mockStartRunningMutation.mockResolvedValue(record);

    const { props, mocks } = buildHookProps();
    const { result } = renderHook(() => useRunningLifecycle(props));

    await act(async () => {
      await result.current.startRunning();
    });

    let endResult: unknown = undefined;
    await act(async () => {
      endResult = await result.current.endRunning();
    });

    expect(endResult).toBeNull();
    expect(mocks.finalizeCurrentSegment).toHaveBeenCalledTimes(1);
    expect(mocks.stopGpsTracking).toHaveBeenCalledTimes(1);
    expect(mockEndRunningMutation).not.toHaveBeenCalled();
    expect(mockSaveRunningRecordItems).not.toHaveBeenCalled();
    expect(mockOfflineAddPendingUpload).not.toHaveBeenCalled();
    expect(mockBackgroundClearData).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().runningState).toBe(RunningState.Finished);
  });

  it('ends running via API and uploads segment items when distance is sufficient', async () => {
    const record = createRunningRecord(303);
    const segmentItem: RunningRecordItem = {
      id: 1,
      distance: 20,
      cadence: 170,
      heartRate: 150,
      calories: 15,
      orderIndex: 0,
      durationSec: 12,
      startTimestamp: 1735689600,
      locations: [
        {
          latitude: 37.5,
          longitude: 127.0,
          timestamp: new Date('2025-01-01T00:00:00.000Z'),
          speed: 3.2,
          altitude: 20,
          accuracy: 5,
        },
      ],
      isUploaded: false,
    };

    mockCheckRequiredPermissions.mockResolvedValue({
      hasAllPermissions: true,
      location: true,
      locationBackground: true,
      motion: true,
    });
    mockStartRunningMutation.mockResolvedValue(record);
    mockEndRunningMutation.mockResolvedValue({
      id: 303,
      distance: 120,
      cadence: 170,
      heartRate: 150,
      calorie: 100,
      durationSec: 120,
      point: 10,
    });

    const { props, mocks } = buildHookProps({
      stopGpsDistance: 120,
      segmentItems: [segmentItem],
    });
    const { result } = renderHook(() => useRunningLifecycle(props));

    await act(async () => {
      await result.current.startRunning();
    });

    let endResult: unknown;
    await act(async () => {
      endResult = await result.current.endRunning();
    });

    expect((endResult as { id: number }).id).toBe(303);
    expect(mockEndRunningMutation).toHaveBeenCalledTimes(1);
    expect(mockSaveRunningRecordItems).toHaveBeenCalledTimes(1);
    expect(mockOfflineAddPendingUpload).not.toHaveBeenCalled();
    expect(mockBackgroundClearData).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().runningState).toBe(RunningState.Finished);
    expect(mocks.finalizeCurrentSegment).toHaveBeenCalledTimes(1);
  });

  it('RUN-LIFE-002 falls back to offline upload when end API fails', async () => {
    const record = createRunningRecord(404);
    mockCheckRequiredPermissions.mockResolvedValue({
      hasAllPermissions: true,
      location: true,
      locationBackground: true,
      motion: true,
    });
    mockStartRunningMutation.mockResolvedValue(record);
    mockEndRunningMutation.mockRejectedValue(new Error('end-api-failed'));

    const { props } = buildHookProps({ stopGpsDistance: 80 });
    const { result } = renderHook(() => useRunningLifecycle(props));

    await act(async () => {
      await result.current.startRunning();
    });

    await act(async () => {
      const endResult = await result.current.endRunning();
      expect(endResult).toBeNull();
    });

    expect(mockOfflineAddPendingUpload).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().runningState).toBe(RunningState.Finished);
    expect(mockSaveRunningRecordItems).not.toHaveBeenCalled();
  });

  it('throws and runs cleanup when stopGpsTracking fails during endRunning', async () => {
    const record = createRunningRecord(505);
    mockCheckRequiredPermissions.mockResolvedValue({
      hasAllPermissions: true,
      location: true,
      locationBackground: true,
      motion: true,
    });
    mockStartRunningMutation.mockResolvedValue(record);

    const { props } = buildHookProps();
    props.stopGpsTracking = jest.fn().mockRejectedValue(new Error('stop-gps-failed'));
    const { result } = renderHook(() => useRunningLifecycle(props));

    await act(async () => {
      await result.current.startRunning();
    });

    await expect(result.current.endRunning()).rejects.toThrow('stop-gps-failed');
    expect(mockLocationStopTracking).toHaveBeenCalled();
    expect(mockBackgroundStopTracking).toHaveBeenCalled();
    expect(mockPedometerStopTracking).toHaveBeenCalled();
  });

  it('updates current record and catches update errors without throwing', async () => {
    const record = createRunningRecord(606);
    mockCheckRequiredPermissions.mockResolvedValue({
      hasAllPermissions: true,
      location: true,
      locationBackground: true,
      motion: true,
    });
    mockStartRunningMutation.mockResolvedValue(record);
    mockUpdateRecordMutation.mockResolvedValue(undefined);

    const { props } = buildHookProps({ stopGpsDistance: 30 });
    props.distance = 30;
    const { result } = renderHook(() => useRunningLifecycle(props));

    await act(async () => {
      await result.current.startRunning();
    });

    await act(async () => {
      await result.current.updateCurrentRecord();
    });

    expect(mockUpdateRecordMutation).toHaveBeenCalledTimes(1);

    mockUpdateRecordMutation.mockRejectedValueOnce(new Error('update-failed'));
    await act(async () => {
      await result.current.updateCurrentRecord();
    });
    expect(mockUpdateRecordMutation).toHaveBeenCalledTimes(2);
  });

  it('resets running state, refs, and executes reset callbacks', async () => {
    const record = createRunningRecord(707);
    mockCheckRequiredPermissions.mockResolvedValue({
      hasAllPermissions: true,
      location: true,
      locationBackground: true,
      motion: true,
    });
    mockStartRunningMutation.mockResolvedValue(record);

    const { props, mocks } = buildHookProps({
      paceSnapshots: [{ timestamp: 1, distance: 1 }],
    });
    const { result } = renderHook(() => useRunningLifecycle(props));

    await act(async () => {
      await result.current.startRunning();
    });

    act(() => {
      result.current.resetRunning();
    });

    expect(result.current.currentRecord).toBeNull();
    expect(useAppStore.getState().runningState).toBe(RunningState.Stopped);
    expect(props.paceSnapshotsRef.current).toEqual([]);
    expect(mocks.resetStats).toHaveBeenCalled();
    expect(mocks.resetSegments).toHaveBeenCalled();
  });

  it('applies pedometer cadence to stats updater while running', async () => {
    const record = createRunningRecord(808);
    mockCheckRequiredPermissions.mockResolvedValue({
      hasAllPermissions: true,
      location: true,
      locationBackground: true,
      motion: true,
    });
    mockStartRunningMutation.mockResolvedValue(record);
    mockPedometerStartTracking.mockImplementation(async (callback) => {
      callback({ steps: 10, cadence: 176 });
    });

    const { props, mocks } = buildHookProps();
    const { result } = renderHook(() => useRunningLifecycle(props));

    await act(async () => {
      await result.current.startRunning();
    });

    expect(mocks.setStats).toHaveBeenCalledTimes(1);
    const updater = mocks.setStats.mock.calls[0]?.[0] as
      | ((prev: RunningStats) => RunningStats)
      | undefined;
    expect(typeof updater).toBe('function');
    const updated = updater?.(props.statsRef.current as RunningStats);
    expect(updated?.cadence).toBe(176);
  });
});
