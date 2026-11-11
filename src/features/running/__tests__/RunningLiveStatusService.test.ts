import AsyncStorage from '@react-native-async-storage/async-storage';
import { RunningState } from '~/stores/app/appStore';
import type { RunningRecord } from '../models';
import { DEFAULT_RUNNING_STATS } from '../viewmodels/hooks/types';

const createRecord = (): RunningRecord => ({
  id: 42,
  distance: 0,
  steps: null,
  cadence: null,
  heartRate: null,
  calorie: 0,
  durationSec: 0,
  startTimestamp: 1735689600,
});

const loadService = (nativeModule?: Record<string, unknown>) => {
  jest.resetModules();
  const { NativeModules } = require('react-native');
  NativeModules.RunningLiveStatus = nativeModule;
  return require('../services/RunningLiveStatusService') as typeof import('../services/RunningLiveStatusService');
};

describe('runningLiveStatusService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('builds a snapshot with distance, elapsed time, pace, and state only', () => {
    const { runningLiveStatusService } = loadService();
    const snapshot = runningLiveStatusService.createSnapshot({
      record: createRecord(),
      runningState: RunningState.Running,
      startTime: 1735689600000,
      distanceMeters: 1000.4,
      elapsedSec: 300.2,
      stats: {
        ...DEFAULT_RUNNING_STATS,
        pace: { minutes: 5, seconds: 0, totalSeconds: 300 },
      },
      nowMs: 1735689900000,
    });

    expect(snapshot).toEqual({
      recordId: 42,
      state: 'running',
      distanceMeters: 1000,
      elapsedSec: 300,
      paceSecPerKm: 300,
      startedAtMs: 1735689600000,
      updatedAtMs: 1735689900000,
    });
  });

  it('uses no-op native calls when the native module is unavailable', async () => {
    const { runningLiveStatusService } = loadService(undefined);
    const snapshot = runningLiveStatusService.createSnapshot({
      record: createRecord(),
      runningState: RunningState.Running,
      startTime: null,
      distanceMeters: 0,
      elapsedSec: 0,
      stats: DEFAULT_RUNNING_STATS,
    });

    await expect(runningLiveStatusService.startLiveStatus(snapshot)).resolves.toBe(false);
    await expect(runningLiveStatusService.updateLiveStatus(snapshot)).resolves.toBe(false);
    await expect(runningLiveStatusService.endLiveStatus()).resolves.toBe(false);
    await expect(runningLiveStatusService.getPendingCommand()).resolves.toBeNull();
  });

  it('persists, loads, and clears the current live running session', async () => {
    const { runningLiveStatusService } = loadService();
    const session = {
      record: createRecord(),
      ownerUserId: 1,
      state: 'running' as const,
      startTime: 1735689600000,
      pausedDuration: 0,
      distanceMeters: 1200,
      elapsedSec: 360,
      paceSecPerKm: 300,
      updatedAtMs: 1735689960000,
    };

    await runningLiveStatusService.persistSession(session);
    await expect(runningLiveStatusService.loadSession()).resolves.toEqual(session);

    await runningLiveStatusService.clearSession();
    await expect(runningLiveStatusService.loadSession()).resolves.toBeNull();
  });

  it('reads and clears a pending native command', async () => {
    const clearPendingCommand = jest.fn().mockResolvedValue(true);
    const { runningLiveStatusService } = loadService({
      getPendingCommand: jest.fn().mockResolvedValue({
        id: 'command-1',
        action: 'stop',
        createdAtMs: 1000,
      }),
      clearPendingCommand,
    });

    await expect(runningLiveStatusService.getPendingCommand()).resolves.toEqual({
      id: 'command-1',
      action: 'stop',
      createdAtMs: 1000,
    });

    await runningLiveStatusService.clearPendingCommand('command-1');
    expect(clearPendingCommand).toHaveBeenCalledWith('command-1');
  });
});
