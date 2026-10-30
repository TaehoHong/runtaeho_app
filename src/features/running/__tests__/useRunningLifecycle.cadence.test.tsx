import { act, renderHook } from '@testing-library/react-native';
import { useRunningLifecycle } from '../viewmodels/hooks/useRunningLifecycle';
import { DEFAULT_RUNNING_STATS, type UseRunningLifecycleProps } from '../viewmodels/hooks/types';
import { pedometerService } from '../services/sensors/PedometerService';
import { resetAllStores } from '~/test-utils/resetState';
import { RunningState, useAppStore } from '~/stores/app/appStore';

const mockEndRunning = jest.fn();
let mockStepCallback: (result: { steps: number }) => void;

jest.mock('expo-sensors', () => ({
  Pedometer: {
    getPermissionsAsync: async () => ({ granted: true }),
    isAvailableAsync: async () => true,
    watchStepCount: (callback: typeof mockStepCallback) => {
      mockStepCallback = callback;
      return { remove: jest.fn() };
    },
  },
}));
jest.mock('~/services/PermissionManager', () => ({
  permissionManager: { checkRequiredPermissions: async () => ({ canStartRunning: true }) },
}));
jest.mock('../services', () => ({
  useStartRunning: () => ({ mutateAsync: async () => ({ id: 71, startTimestamp: 0 }) }),
  useEndRunning: () => ({ mutateAsync: (...args: unknown[]) => mockEndRunning(...args) }),
  useUpdateRunningRecord: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('../services/OfflineStorageService', () => ({
  offlineStorageService: {
    withPendingUpload: async (_record: unknown, _items: unknown, _session: unknown, upload: (id: string) => Promise<unknown>) => upload('cadence-record'),
    serializeReplay: async (operation: () => Promise<unknown>) => operation(),
    completePendingUpload: jest.fn(),
    retryAllPendingSegmentUploads: jest.fn(),
  },
}));
jest.mock('../services/BackgroundTaskService', () => ({
  backgroundTaskService: { clearBackgroundData: jest.fn() },
}));
jest.mock('~/features/league/services/leagueService', () => ({
  leagueService: { getCurrentLeague: async () => null },
}));

const createProps = (): UseRunningLifecycleProps => ({
  statsRef: { current: DEFAULT_RUNNING_STATS },
  segmentItemsRef: { current: [] },
  paceSnapshotsRef: { current: [] },
  startGpsTracking: jest.fn(),
  stopGpsTracking: jest.fn().mockResolvedValue({ distance: 500, locations: [] }),
  pauseGpsTracking: jest.fn(),
  resumeGpsTracking: jest.fn(),
  resetGpsTracking: jest.fn(),
  resetStats: jest.fn(),
  setStats: jest.fn(),
  initializeSegmentTracking: jest.fn(),
  finalizeCurrentSegment: jest.fn(),
  resetSegments: jest.fn(),
  distance: 500,
  elapsedTime: 120,
  stats: DEFAULT_RUNNING_STATS,
  currentSegmentItems: [],
});

describe('running cadence across pauses', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    resetAllStores();
    pedometerService.reset();
    mockEndRunning.mockReset().mockResolvedValue({ id: 71 });
  });

  afterEach(() => {
    pedometerService.reset();
    jest.useRealTimers();
  });

  it('ending while paused retains totals through repeated pause and resume transitions', async () => {
    const { result } = renderHook(() => useRunningLifecycle(createProps()));
    await act(async () => { await result.current.startRunning(); });
    jest.setSystemTime(60_000);
    act(() => { mockStepCallback({ steps: 180 }); });
    act(() => { result.current.pauseRunning(); });
    jest.setSystemTime(90_000);
    act(() => { result.current.applyAutoPause(); });
    jest.setSystemTime(120_000);
    act(() => { result.current.resumeRunning(); });
    act(() => { result.current.resumeRunning(); });
    jest.setSystemTime(150_000);
    act(() => { mockStepCallback({ steps: 90 }); });
    act(() => { result.current.pauseRunning(); });
    jest.setSystemTime(210_000);
    await act(async () => { await result.current.endRunning(); });

    expect(mockEndRunning).toHaveBeenCalledWith(
      expect.objectContaining({ steps: 270, cadence: 180, durationSec: 90 }),
      expect.anything()
    );
  });

  it.each(['pauseRunning', 'applyAutoPause'] as const)(
    '%s excludes paused movement and time while retaining earlier active steps in the final record',
    async (pause) => {
      const props = createProps();
      const { result } = renderHook(() => useRunningLifecycle(props));
      await act(async () => { await result.current.startRunning(); });

      jest.setSystemTime(60_000);
      act(() => { mockStepCallback({ steps: 180 }); });
      const oldSubscription = mockStepCallback;
      act(() => { result.current[pause](); });
      jest.setSystemTime(90_000);
      act(() => { oldSubscription({ steps: 240 }); });
      expect(pedometerService.getCurrentSteps()).toBe(180);

      jest.setSystemTime(120_000);
      act(() => { result.current.resumeRunning(); });
      // Expo reports cumulative steps for the new subscription, starting from zero.
      jest.setSystemTime(150_000);
      act(() => { mockStepCallback({ steps: 90 }); });
      act(() => { oldSubscription({ steps: 300 }); });
      jest.setSystemTime(180_000);
      act(() => { mockStepCallback({ steps: 180 }); });
      (props.stopGpsTracking as jest.Mock).mockImplementation(async () => {
        jest.setSystemTime(185_000);
        mockStepCallback({ steps: 195 });
        return { distance: 500, locations: [] };
      });
      await act(async () => { await result.current.endRunning(); });

      expect(mockEndRunning).toHaveBeenCalledWith(
        expect.objectContaining({ steps: 360, cadence: 180, durationSec: 120 }),
        expect.anything()
      );
      expect(useAppStore.getState().runningState).toBe(RunningState.Finished);
    }
  );
});
