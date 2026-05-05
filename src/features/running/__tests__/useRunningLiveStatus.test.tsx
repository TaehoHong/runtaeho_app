import { act, renderHook } from '@testing-library/react-native';
import { RunningState } from '~/stores/app/appStore';
import type { RunningRecord } from '../models';
import { useRunningLiveStatus } from '../viewmodels/hooks/useRunningLiveStatus';
import { DEFAULT_RUNNING_STATS } from '../viewmodels/hooks/types';
import { runningLiveStatusService } from '../services/RunningLiveStatusService';

jest.mock('../services/RunningLiveStatusService', () => ({
  runningLiveStatusService: {
    createSnapshot: jest.fn((params) => ({
      recordId: params.record.id,
      state: params.runningState === 'Paused' ? 'paused' : 'running',
      distanceMeters: Math.round(params.distanceMeters),
      elapsedSec: Math.round(params.elapsedSec),
      paceSecPerKm: params.stats.pace.totalSeconds || null,
      startedAtMs: params.startTime ?? params.record.startTimestamp * 1000,
      updatedAtMs: Date.now(),
    })),
    startLiveStatus: jest.fn().mockResolvedValue(true),
    updateLiveStatus: jest.fn().mockResolvedValue(true),
    endLiveStatus: jest.fn().mockResolvedValue(true),
    getPendingCommand: jest.fn().mockResolvedValue(null),
    clearPendingCommand: jest.fn().mockResolvedValue(true),
    addCommandListener: jest.fn(() => ({ remove: jest.fn() })),
    persistSession: jest.fn().mockResolvedValue(undefined),
    loadSession: jest.fn().mockResolvedValue(null),
    clearSession: jest.fn().mockResolvedValue(undefined),
    isLiveState: jest.fn(
      (state) => state === 'Running' || state === 'Paused'
    ),
  },
}));

const mockService = runningLiveStatusService as jest.Mocked<typeof runningLiveStatusService>;

const createRecord = (id: number = 42): RunningRecord => ({
  id,
  distance: 0,
  steps: null,
  cadence: null,
  heartRate: null,
  calorie: 0,
  durationSec: 0,
  startTimestamp: 1735689600,
});

const buildProps = (overrides?: Partial<Parameters<typeof useRunningLiveStatus>[0]>) => ({
  runningState: RunningState.Stopped,
  currentRecord: null,
  startTime: null,
  pausedDuration: 0,
  distance: 0,
  elapsedTime: 0,
  stats: DEFAULT_RUNNING_STATS,
  startRunning: jest.fn().mockResolvedValue(createRecord()),
  pauseRunning: jest.fn(),
  resumeRunning: jest.fn(),
  endRunning: jest.fn().mockResolvedValue(null),
  resetRunning: jest.fn(),
  ...overrides,
});

describe('useRunningLiveStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    mockService.getPendingCommand.mockResolvedValue(null);
    mockService.loadSession.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts native live status after startRunning succeeds', async () => {
    const props = buildProps();
    const { result } = renderHook(() => useRunningLiveStatus(props));

    await act(async () => {
      const record = await result.current.startRunning();
      expect(record.id).toBe(42);
    });

    expect(props.startRunning).toHaveBeenCalledTimes(1);
    expect(mockService.startLiveStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: 42,
        state: 'running',
      })
    );
    expect(mockService.persistSession).toHaveBeenCalledTimes(1);
  });

  it('throttles metric updates but sends state changes immediately', async () => {
    const record = createRecord();
    const { rerender } = renderHook((props) => useRunningLiveStatus(props), {
      initialProps: buildProps({
        runningState: RunningState.Running,
        currentRecord: record,
        startTime: 1000,
        distance: 100,
        elapsedTime: 30,
      }),
    });

    await act(async () => undefined);
    expect(mockService.startLiveStatus).toHaveBeenCalledTimes(1);

    jest.spyOn(Date, 'now').mockReturnValue(2000);
    rerender(
      buildProps({
        runningState: RunningState.Running,
        currentRecord: record,
        startTime: 1000,
        distance: 120,
        elapsedTime: 32,
      })
    );
    await act(async () => undefined);
    expect(mockService.updateLiveStatus).not.toHaveBeenCalled();

    jest.spyOn(Date, 'now').mockReturnValue(2500);
    rerender(
      buildProps({
        runningState: RunningState.Paused,
        currentRecord: record,
        startTime: 1000,
        distance: 120,
        elapsedTime: 32,
      })
    );
    await act(async () => undefined);
    expect(mockService.updateLiveStatus).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'paused' })
    );
  });

  it('deduplicates repeated native pause commands', async () => {
    const props = buildProps({
      runningState: RunningState.Running,
      currentRecord: createRecord(),
    });
    const { result } = renderHook(() => useRunningLiveStatus(props));
    const command = { id: 'command-1', action: 'pause' as const, createdAtMs: 1000 };

    await act(async () => {
      await result.current.drainPendingCommand(command);
      await result.current.drainPendingCommand(command);
    });

    expect(props.pauseRunning).toHaveBeenCalledTimes(1);
    expect(mockService.clearPendingCommand).toHaveBeenCalledWith('command-1');
  });

  it('uses a persisted session when stop is drained after currentRecord is lost', async () => {
    const restoredRecord = createRecord(77);
    mockService.loadSession.mockResolvedValue({
      record: restoredRecord,
      state: 'running',
      startTime: 1735689600000,
      pausedDuration: 0,
      distanceMeters: 1500,
      elapsedSec: 480,
      paceSecPerKm: 320,
      updatedAtMs: 1735690080000,
    });
    const props = buildProps({
      runningState: RunningState.Stopped,
      currentRecord: null,
    });
    const { result } = renderHook(() => useRunningLiveStatus(props));

    await act(async () => undefined);
    await act(async () => {
      await result.current.drainPendingCommand({
        id: 'stop-1',
        action: 'stop',
        createdAtMs: 1000,
      });
    });

    expect(props.endRunning).toHaveBeenCalledWith({
      currentRecord: restoredRecord,
      elapsedTime: 480,
      distance: 1500,
    });
    expect(mockService.endLiveStatus).toHaveBeenCalled();
    expect(mockService.clearSession).toHaveBeenCalled();
  });
});
