import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from 'react-native';
import { RunningState } from '~/stores/app/appStore';
import type { RunningRecord } from '../models';
import type { RunningStats } from '../viewmodels/hooks/types';

export type RunningLiveStatusState = 'running' | 'paused' | 'ending';
export type RunningLiveStatusCommandAction = 'pause' | 'resume' | 'stop';

export interface RunningLiveStatusSnapshot {
  recordId: number;
  state: RunningLiveStatusState;
  distanceMeters: number;
  elapsedSec: number;
  paceSecPerKm: number | null;
  startedAtMs: number;
  updatedAtMs: number;
}

export interface RunningLiveStatusCommand {
  id: string;
  action: RunningLiveStatusCommandAction;
  createdAtMs: number;
}

export interface RunningLiveStatusSession {
  record: RunningRecord;
  ownerUserId: number | null;
  state: RunningLiveStatusState;
  startTime: number;
  pausedDuration: number;
  distanceMeters: number;
  elapsedSec: number;
  paceSecPerKm: number | null;
  updatedAtMs: number;
}

interface CreateSnapshotParams {
  record: RunningRecord;
  runningState: RunningState;
  startTime: number | null;
  distanceMeters: number;
  elapsedSec: number;
  stats: RunningStats;
  nowMs?: number;
}

interface NativeRunningLiveStatusModule {
  startLiveStatus?: (snapshot: RunningLiveStatusSnapshot) => Promise<boolean>;
  updateLiveStatus?: (snapshot: RunningLiveStatusSnapshot) => Promise<boolean>;
  endLiveStatus?: () => Promise<boolean>;
  getPendingCommand?: () => Promise<unknown>;
  clearPendingCommand?: (commandId: string) => Promise<boolean>;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
}

const STORAGE_KEYS = {
  SESSION: '@running_live_status_session',
} as const;

const EVENT_COMMAND = 'runningLiveStatusCommand';
const nativeModule = NativeModules.RunningLiveStatus as
  | NativeRunningLiveStatusModule
  | undefined;

const isLiveState = (state: RunningState): state is RunningState.Running | RunningState.Paused =>
  state === RunningState.Running || state === RunningState.Paused;

const toLiveState = (state: RunningState): RunningLiveStatusState => {
  if (state === RunningState.Paused) {
    return 'paused';
  }
  return 'running';
};

const normalizeCommand = (value: unknown): RunningLiveStatusCommand | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<RunningLiveStatusCommand>;
  const action = candidate.action;
  if (action !== 'pause' && action !== 'resume' && action !== 'stop') {
    return null;
  }

  if (typeof candidate.id !== 'string' || candidate.id.length === 0) {
    return null;
  }

  return {
    id: candidate.id,
    action,
    createdAtMs:
      typeof candidate.createdAtMs === 'number' ? candidate.createdAtMs : Date.now(),
  };
};

const safeNativeCall = async (
  callback: (() => Promise<boolean> | undefined) | undefined
): Promise<boolean> => {
  if (!callback) return false;

  try {
    return (await callback()) ?? false;
  } catch (error) {
    console.warn('[RunningLiveStatusService] Native call failed:', error);
    return false;
  }
};

const getPaceSecPerKm = (
  distanceMeters: number,
  elapsedSec: number,
  stats: RunningStats
): number | null => {
  if (distanceMeters <= 0 || elapsedSec <= 0) {
    return null;
  }

  if (stats.pace.totalSeconds > 0) {
    return Math.round(stats.pace.totalSeconds);
  }

  return Math.round((elapsedSec / distanceMeters) * 1000);
};

export const runningLiveStatusService = {
  createSnapshot({
    record,
    runningState,
    startTime,
    distanceMeters,
    elapsedSec,
    stats,
    nowMs = Date.now(),
  }: CreateSnapshotParams): RunningLiveStatusSnapshot {
    return {
      recordId: record.id,
      state: toLiveState(runningState),
      distanceMeters: Math.max(0, Math.round(distanceMeters)),
      elapsedSec: Math.max(0, Math.round(elapsedSec)),
      paceSecPerKm: getPaceSecPerKm(distanceMeters, elapsedSec, stats),
      startedAtMs: startTime ?? Math.round(record.startTimestamp * 1000),
      updatedAtMs: nowMs,
    };
  },

  async startLiveStatus(snapshot: RunningLiveStatusSnapshot): Promise<boolean> {
    if (!nativeModule?.startLiveStatus || Platform.OS === 'web') return false;
    return safeNativeCall(() => nativeModule.startLiveStatus?.(snapshot));
  },

  async updateLiveStatus(snapshot: RunningLiveStatusSnapshot): Promise<boolean> {
    if (!nativeModule?.updateLiveStatus || Platform.OS === 'web') return false;
    return safeNativeCall(() => nativeModule.updateLiveStatus?.(snapshot));
  },

  async endLiveStatus(): Promise<boolean> {
    if (!nativeModule?.endLiveStatus || Platform.OS === 'web') return false;
    return safeNativeCall(() => nativeModule.endLiveStatus?.());
  },

  async getPendingCommand(): Promise<RunningLiveStatusCommand | null> {
    if (!nativeModule?.getPendingCommand || Platform.OS === 'web') return null;

    try {
      return normalizeCommand(await nativeModule.getPendingCommand());
    } catch (error) {
      console.warn('[RunningLiveStatusService] Failed to get pending command:', error);
      return null;
    }
  },

  async clearPendingCommand(commandId: string): Promise<boolean> {
    if (!nativeModule?.clearPendingCommand || Platform.OS === 'web') return false;
    return safeNativeCall(() => nativeModule.clearPendingCommand?.(commandId));
  },

  addCommandListener(
    listener: (command: RunningLiveStatusCommand) => void
  ): { remove: () => void } {
    if (!nativeModule || Platform.OS === 'web') {
      return { remove: () => undefined };
    }

    const emitter = new NativeEventEmitter(nativeModule);
    const subscription: EmitterSubscription = emitter.addListener(
      EVENT_COMMAND,
      (payload: unknown) => {
        const command = normalizeCommand(payload);
        if (command) {
          listener(command);
        }
      }
    );

    return subscription;
  },

  async persistSession(session: RunningLiveStatusSession): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  },

  async loadSession(): Promise<RunningLiveStatusSession | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SESSION);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as RunningLiveStatusSession;
      if (!parsed.record || typeof parsed.record.id !== 'number' ||
          !Number.isFinite(parsed.distanceMeters) || parsed.distanceMeters < 0 ||
          !Number.isFinite(parsed.elapsedSec) || parsed.elapsedSec < 0) {
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn('[RunningLiveStatusService] Failed to load session:', error);
      return null;
    }
  },

  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  isLiveState,
};
