import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { RunningState } from '~/stores/app/appStore';
import type { RunningRecord } from '../../models';
import {
  runningLiveStatusService,
  type RunningLiveStatusCommand,
  type RunningLiveStatusSession,
  type RunningLiveStatusSnapshot,
} from '../../services/RunningLiveStatusService';
import type { EndRunningOverrides, RunningStats } from './types';

interface UseRunningLiveStatusProps {
  runningState: RunningState;
  currentRecord: RunningRecord | null;
  startTime: number | null;
  pausedDuration: number;
  distance: number;
  elapsedTime: number;
  stats: RunningStats;
  startRunning: () => Promise<RunningRecord>;
  pauseRunning: () => void;
  resumeRunning: () => void;
  endRunning: (overrides?: EndRunningOverrides) => Promise<unknown>;
  resetRunning: () => void;
}

const UPDATE_THROTTLE_MS = 5000;

export const useRunningLiveStatus = ({
  runningState,
  currentRecord,
  startTime,
  pausedDuration,
  distance,
  elapsedTime,
  stats,
  startRunning,
  pauseRunning,
  resumeRunning,
  endRunning,
  resetRunning,
}: UseRunningLiveStatusProps) => {
  const activeRecordIdRef = useRef<number | null>(null);
  const lastUpdateAtRef = useRef(0);
  const lastStateRef = useRef<RunningState>(runningState);
  const drainingRef = useRef(false);
  const processedCommandIdsRef = useRef(new Set<string>());

  const liveStateRef = useRef({
    runningState,
    currentRecord,
    startTime,
    pausedDuration,
    distance,
    elapsedTime,
    stats,
  });

  const actionsRef = useRef({
    pauseRunning,
    resumeRunning,
    endRunning,
  });

  useEffect(() => {
    liveStateRef.current = {
      runningState,
      currentRecord,
      startTime,
      pausedDuration,
      distance,
      elapsedTime,
      stats,
    };
  }, [currentRecord, distance, elapsedTime, pausedDuration, runningState, startTime, stats]);

  useEffect(() => {
    actionsRef.current = {
      pauseRunning,
      resumeRunning,
      endRunning,
    };
  }, [endRunning, pauseRunning, resumeRunning]);

  const persistSession = useCallback(
    async (snapshot: RunningLiveStatusSnapshot, record: RunningRecord) => {
      const session: RunningLiveStatusSession = {
        record,
        state: snapshot.state,
        startTime: snapshot.startedAtMs,
        pausedDuration: liveStateRef.current.pausedDuration,
        distanceMeters: snapshot.distanceMeters,
        elapsedSec: snapshot.elapsedSec,
        paceSecPerKm: snapshot.paceSecPerKm,
        updatedAtMs: snapshot.updatedAtMs,
      };

      await runningLiveStatusService.persistSession(session);
    },
    []
  );

  const buildSnapshot = useCallback(
    (stateOverride?: RunningState): RunningLiveStatusSnapshot | null => {
      const liveState = liveStateRef.current;
      const record = liveState.currentRecord;
      const nextState = stateOverride ?? liveState.runningState;

      if (!record || !runningLiveStatusService.isLiveState(nextState)) {
        return null;
      }

      return runningLiveStatusService.createSnapshot({
        record,
        runningState: nextState,
        startTime: liveState.startTime,
        distanceMeters: liveState.distance,
        elapsedSec: liveState.elapsedTime,
        stats: liveState.stats,
      });
    },
    []
  );

  const publishSnapshot = useCallback(
    async (
      snapshot: RunningLiveStatusSnapshot,
      record: RunningRecord,
      mode: 'start' | 'update'
    ) => {
      activeRecordIdRef.current = snapshot.recordId;
      lastUpdateAtRef.current = snapshot.updatedAtMs;
      lastStateRef.current = liveStateRef.current.runningState;
      await persistSession(snapshot, record);

      if (mode === 'start') {
        await runningLiveStatusService.startLiveStatus(snapshot);
        return;
      }

      await runningLiveStatusService.updateLiveStatus(snapshot);
    },
    [persistSession]
  );

  const updateNow = useCallback(
    async (stateOverride?: RunningState) => {
      const snapshot = buildSnapshot(stateOverride);
      const record = liveStateRef.current.currentRecord;
      if (!snapshot || !record) return;

      const mode =
        activeRecordIdRef.current === snapshot.recordId ? 'update' : 'start';
      await publishSnapshot(snapshot, record, mode);
    },
    [buildSnapshot, publishSnapshot]
  );

  const wrappedStartRunning = useCallback(async () => {
    const record = await startRunning();
    const snapshot = runningLiveStatusService.createSnapshot({
      record,
      runningState: RunningState.Running,
      startTime: Date.now(),
      distanceMeters: 0,
      elapsedSec: 0,
      stats: liveStateRef.current.stats,
    });

    await publishSnapshot(snapshot, record, 'start');
    return record;
  }, [publishSnapshot, startRunning]);

  const wrappedPauseRunning = useCallback(() => {
    pauseRunning();
    void updateNow(RunningState.Paused);
  }, [pauseRunning, updateNow]);

  const wrappedResumeRunning = useCallback(() => {
    resumeRunning();
    void updateNow(RunningState.Running);
  }, [resumeRunning, updateNow]);

  const wrappedEndRunning = useCallback(
    async (overrides?: EndRunningOverrides) => {
      const endingSnapshot = buildSnapshot();
      if (endingSnapshot) {
        await runningLiveStatusService.updateLiveStatus({
          ...endingSnapshot,
          state: 'ending',
          updatedAtMs: Date.now(),
        });
      }

      const result = await endRunning(overrides);
      activeRecordIdRef.current = null;
      await runningLiveStatusService.endLiveStatus();
      await runningLiveStatusService.clearSession();
      return result;
    },
    [buildSnapshot, endRunning]
  );

  const wrappedResetRunning = useCallback(() => {
    resetRunning();
    activeRecordIdRef.current = null;
    void runningLiveStatusService.endLiveStatus();
    void runningLiveStatusService.clearSession();
  }, [resetRunning]);

  const applyCommand = useCallback(
    async (command: RunningLiveStatusCommand): Promise<boolean> => {
      const liveState = liveStateRef.current;

      if (command.action === 'pause') {
        if (liveState.runningState !== RunningState.Running || !liveState.currentRecord) {
          return true;
        }
        actionsRef.current.pauseRunning();
        await updateNow(RunningState.Paused);
        return true;
      }

      if (command.action === 'resume') {
        if (liveState.runningState !== RunningState.Paused || !liveState.currentRecord) {
          return true;
        }
        actionsRef.current.resumeRunning();
        await updateNow(RunningState.Running);
        return true;
      }

      const restoredSession = liveState.currentRecord
        ? null
        : await runningLiveStatusService.loadSession();
      if (
        !liveState.currentRecord &&
        !restoredSession &&
        (liveState.runningState === RunningState.Stopped ||
          liveState.runningState === RunningState.Finished)
      ) {
        return true;
      }

      await actionsRef.current.endRunning(
        restoredSession
          ? {
              currentRecord: restoredSession.record,
              elapsedTime: restoredSession.elapsedSec,
              distance: restoredSession.distanceMeters,
            }
          : undefined
      );
      await runningLiveStatusService.endLiveStatus();
      await runningLiveStatusService.clearSession();
      activeRecordIdRef.current = null;
      return true;
    },
    [updateNow]
  );

  const drainPendingCommand = useCallback(
    async (incomingCommand?: RunningLiveStatusCommand | null) => {
      if (drainingRef.current) return;
      drainingRef.current = true;

      try {
        const command = incomingCommand ?? (await runningLiveStatusService.getPendingCommand());
        if (!command) return;

        if (processedCommandIdsRef.current.has(command.id)) {
          await runningLiveStatusService.clearPendingCommand(command.id);
          return;
        }

        processedCommandIdsRef.current.add(command.id);
        const applied = await applyCommand(command);
        if (applied) {
          await runningLiveStatusService.clearPendingCommand(command.id);
        }
      } catch (error) {
        console.warn('[useRunningLiveStatus] Failed to drain command:', error);
      } finally {
        drainingRef.current = false;
      }
    },
    [applyCommand]
  );

  useEffect(() => {
    const subscription = runningLiveStatusService.addCommandListener((command) => {
      void drainPendingCommand(command);
    });

    void drainPendingCommand();

    return () => {
      subscription.remove();
    };
  }, [drainPendingCommand]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        void drainPendingCommand();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [drainPendingCommand]);

  useEffect(() => {
    if (!currentRecord || !runningLiveStatusService.isLiveState(runningState)) {
      if (
        activeRecordIdRef.current !== null &&
        (runningState === RunningState.Finished || runningState === RunningState.Stopped)
      ) {
        activeRecordIdRef.current = null;
        void runningLiveStatusService.endLiveStatus();
        void runningLiveStatusService.clearSession();
      }
      return;
    }

    const now = Date.now();
    const stateChanged = lastStateRef.current !== runningState;
    const recordChanged = activeRecordIdRef.current !== currentRecord.id;
    const shouldUpdate =
      stateChanged || recordChanged || now - lastUpdateAtRef.current >= UPDATE_THROTTLE_MS;

    if (!shouldUpdate) return;

    void updateNow();
  }, [currentRecord, distance, elapsedTime, runningState, updateNow]);

  return {
    startRunning: wrappedStartRunning,
    pauseRunning: wrappedPauseRunning,
    resumeRunning: wrappedResumeRunning,
    endRunning: wrappedEndRunning,
    resetRunning: wrappedResetRunning,
    drainPendingCommand,
  };
};
