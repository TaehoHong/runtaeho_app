import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { RunningRecord, RunningRecordItem } from '../models';
import { offlineStorageService } from '../services/OfflineStorageService';
import { useRunningLifecycle } from '../viewmodels/hooks/useRunningLifecycle';
import { DEFAULT_RUNNING_STATS, type UseRunningLifecycleProps } from '../viewmodels/hooks/types';
import { RunningState, useAppStore } from '~/stores/app/appStore';

const mockStartRunning = jest.fn();
const mockEndRunning = jest.fn();
const mockSaveItems = jest.fn();
const mockClearBackgroundData = jest.fn();
const originalSetItem = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;

jest.mock('~/services/PermissionManager', () => ({
  permissionManager: {
    checkRequiredPermissions: async () => ({ canStartRunning: true }),
  },
}));

jest.mock('~/features/running/services', () => ({
  useStartRunning: () => ({ mutateAsync: mockStartRunning, isPending: false }),
  useEndRunning: () => ({ mutateAsync: mockEndRunning, isPending: false }),
  useUpdateRunningRecord: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('~/features/running/services/runningService', () => ({
  runningService: { saveRunningRecordItems: (...args: unknown[]) => mockSaveItems(...args) },
}));

jest.mock('~/features/running/services/sensors/PedometerService', () => ({
  pedometerService: {
    startTracking: async () => undefined,
    stopTracking: () => undefined,
    getCurrentSteps: () => 0,
    getCadenceSnapshot: () => ({ cadence: 0, isMeasured: false }),
    getFinalCadence: () => 0,
  },
}));

jest.mock('~/features/running/services/BackgroundTaskService', () => ({
  backgroundTaskService: { clearBackgroundData: () => mockClearBackgroundData() },
}));

const record: RunningRecord = {
  id: 404,
  distance: 0,
  steps: null,
  cadence: null,
  heartRate: null,
  calorie: 0,
  durationSec: 0,
  startTimestamp: 1735689600,
};

const segment: RunningRecordItem = {
  id: 1,
  distance: 80,
  cadence: 170,
  heartRate: 150,
  calories: 15,
  orderIndex: 0,
  durationSec: 120,
  startTimestamp: 1735689600,
  locations: [{
    latitude: 37.5,
    longitude: 127,
    timestamp: new Date('2025-01-01T00:00:00.000Z'),
    speed: 3.2,
    altitude: 20,
  }],
  isUploaded: false,
};

const createProps = (overrides: Partial<UseRunningLifecycleProps> = {}): UseRunningLifecycleProps => ({
  statsRef: { current: DEFAULT_RUNNING_STATS },
  segmentItemsRef: { current: [segment] },
  paceSnapshotsRef: { current: [] },
  startGpsTracking: async () => undefined,
  stopGpsTracking: async () => ({ distance: 80, locations: [] }),
  pauseGpsTracking: jest.fn(),
  resumeGpsTracking: jest.fn(),
  resetGpsTracking: jest.fn(),
  resetStats: jest.fn(),
  setStats: jest.fn(),
  initializeSegmentTracking: jest.fn(),
  finalizeCurrentSegment: jest.fn(),
  resetSegments: jest.fn(),
  distance: 80,
  elapsedTime: 120,
  stats: DEFAULT_RUNNING_STATS,
  currentSegmentItems: [],
  ...overrides,
});

describe('useRunningLifecycle offline persistence', () => {
  beforeEach(async () => {
    jest.mocked(AsyncStorage.setItem).mockImplementation(originalSetItem);
    await AsyncStorage.clear();
    useAppStore.getState().resetAppState();
    mockStartRunning.mockResolvedValue(record);
    mockEndRunning.mockRejectedValue(new Error('network-unavailable'));
    mockSaveItems.mockResolvedValue(undefined);
    mockClearBackgroundData.mockResolvedValue(undefined);
  });

  it('preserves the summary and finalized GPS segment after end API failure and UI reset', async () => {
    const props = createProps({ segmentItemsRef: { current: [] } });
    props.finalizeCurrentSegment = () => { props.segmentItemsRef.current = [segment]; };
    const { result, unmount } = renderHook(() => useRunningLifecycle(props));
    await act(async () => { await result.current.startRunning(); });

    await act(async () => {
      expect(await result.current.endRunning()).toBeNull();
    });
    expect(useAppStore.getState().runningState).toBe(RunningState.Finished);
    act(() => { result.current.resetRunning(); });
    props.segmentItemsRef.current = [];
    unmount();

    const summaries = await offlineStorageService.getPendingUploads();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.data).toMatchObject({ id: 404, distance: 80, durationSec: 120 });
    const segments = await offlineStorageService.getPendingSegmentUploads();
    expect(segments).toHaveLength(1);
    expect(segments[0]?.runningRecordId).toBe(404);
    expect(segments[0]?.segments).toMatchObject([{
      distance: 80,
      durationSec: 120,
      cadence: 170,
      heartRate: 150,
      orderIndex: 0,
      locations: [{ latitude: 37.5, longitude: 127, speed: 3.2, altitude: 20 }],
    }]);
    expect(mockSaveItems).not.toHaveBeenCalled();
  });

  it('waits for GPS segments to persist before completing', async () => {
    let releaseWrite: () => void = () => undefined;
    const writeGate = new Promise<void>((resolve) => { releaseWrite = resolve; });
    jest.spyOn(AsyncStorage, 'setItem').mockImplementation(async (key, value) => {
      if (key === '@pending_segment_uploads') await writeGate;
      return originalSetItem(key, value);
    });
    const { result } = renderHook(() => useRunningLifecycle(createProps()));
    await act(async () => { await result.current.startRunning(); });

    let endPromise: ReturnType<typeof result.current.endRunning>;
    act(() => { endPromise = result.current.endRunning(); });
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@pending_segment_uploads', expect.any(String));
    });
    expect(useAppStore.getState().runningState).toBe(RunningState.Running);
    await act(async () => { releaseWrite(); await endPromise; });
    expect(useAppStore.getState().runningState).toBe(RunningState.Finished);
    expect(await offlineStorageService.getPendingSegmentCount()).toBe(1);
  });

  it.each(['@pending_running_uploads', '@pending_segment_uploads'])(
    'propagates a local write failure for %s instead of completing', async (failingKey) => {
      jest.spyOn(AsyncStorage, 'setItem').mockImplementation(async (key, value) => {
        if (key === failingKey) throw new Error('storage-write-failed');
        return originalSetItem(key, value);
      });
      const { result } = renderHook(() => useRunningLifecycle(createProps()));
      await act(async () => { await result.current.startRunning(); });

      await act(async () => {
        await expect(result.current.endRunning()).rejects.toThrow('storage-write-failed');
      });
      expect(useAppStore.getState().runningState).not.toBe(RunningState.Finished);
    }
  );

  it('saves only the summary when no GPS segments were collected', async () => {
    const { result } = renderHook(() => useRunningLifecycle(createProps({ segmentItemsRef: { current: [] } })));
    await act(async () => { await result.current.startRunning(); });
    await act(async () => { await result.current.endRunning(); });

    expect(await offlineStorageService.getPendingCount()).toBe(1);
    expect(await AsyncStorage.getItem('@pending_segment_uploads')).toBeNull();
    expect(useAppStore.getState().runningState).toBe(RunningState.Finished);
  });

  it('keeps successful online completion out of the offline queues', async () => {
    mockEndRunning.mockResolvedValue({ id: 404, point: 1 });
    const { result } = renderHook(() => useRunningLifecycle(createProps()));
    await act(async () => { await result.current.startRunning(); });
    await act(async () => {
      expect(await result.current.endRunning()).toEqual({ id: 404, point: 1 });
    });

    expect(mockSaveItems).toHaveBeenCalledWith({
      runningRecordId: 404,
      items: [expect.objectContaining({ distance: 80, orderIndex: 0 })],
    });
    expect(await offlineStorageService.getPendingCount()).toBe(0);
    expect(await offlineStorageService.getPendingSegmentCount()).toBe(0);
    expect(useAppStore.getState().runningState).toBe(RunningState.Finished);
  });

  it('preserves the no-upload behavior below 10 meters', async () => {
    const { result } = renderHook(() => useRunningLifecycle(createProps({
      stopGpsTracking: async () => ({ distance: 9, locations: [] }),
    })));
    await act(async () => { await result.current.startRunning(); });
    await act(async () => { expect(await result.current.endRunning()).toBeNull(); });

    expect(mockEndRunning).not.toHaveBeenCalled();
    expect(mockSaveItems).not.toHaveBeenCalled();
    expect(await offlineStorageService.getPendingCount()).toBe(0);
    expect(await offlineStorageService.getPendingSegmentCount()).toBe(0);
    expect(useAppStore.getState().runningState).toBe(RunningState.Finished);
  });
});
