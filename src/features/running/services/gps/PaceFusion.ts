import type { PaceData, PaceSignal, PaceSnapshot } from '../../viewmodels/hooks/types';
import { getReliableGpsSpeed } from './GpsFilter';

export interface PaceFusionConfig {
  signalExpirySeconds: number;
  smoothingSeconds: number;
  responsiveSmoothingSeconds: number;
  speedChangeThresholdMps: number;
  stationarySpeedMps: number;
  stationaryEnterSeconds: number;
  movingExitSpeedMps: number;
  movingExitCount: number;
}

export interface PaceFusionState {
  emaSpeedMps: number | null;
  lastPaceSecondsPerKm: number | null;
  lastTimestampMs: number | null;
  lastUsableTimestampMs: number | null;
  changeDirection: number;
  changeStreak: number;
  stationaryAccumulatedSeconds: number;
  lastStationaryTimestampMs?: number | null;
  movingStreak: number;
  isStationary: boolean;
}

export interface PaceFusionInput {
  distanceWindowSpeedMps: number | null;
  paceSignal?: PaceSignal;
  nowMs: number;
}

export interface PaceFusionResult {
  pace: PaceData;
  fusedSpeedMps: number;
  nextState: PaceFusionState;
  isStationary: boolean;
}

export interface PaceAccumulatorState {
  fusionState: PaceFusionState;
  distanceSnapshots: PaceSnapshot[];
}

export const DEFAULT_PACE_FUSION_CONFIG: PaceFusionConfig = {
  signalExpirySeconds: 5,
  smoothingSeconds: 2,
  responsiveSmoothingSeconds: 1,
  speedChangeThresholdMps: 0.3,
  stationarySpeedMps: 0.8,
  stationaryEnterSeconds: 3,
  movingExitSpeedMps: 1.2,
  movingExitCount: 2,
};

export const createInitialPaceFusionState = (): PaceFusionState => ({
  emaSpeedMps: null,
  lastPaceSecondsPerKm: null,
  lastTimestampMs: null,
  lastUsableTimestampMs: null,
  changeDirection: 0,
  changeStreak: 0,
  stationaryAccumulatedSeconds: 0,
  lastStationaryTimestampMs: null,
  movingStreak: 0,
  isStationary: false,
});

// GPS normally arrives every second; longer gaps do not prove continuous motion or rest.
const MAX_CONTINUOUS_SIGNAL_GAP_SECONDS = 2;

const resultFromState = (nextState: PaceFusionState): PaceFusionResult => {
  const totalSeconds = nextState.lastPaceSecondsPerKm === null
    ? 0 : Math.max(1, Math.round(nextState.lastPaceSecondsPerKm));
  return {
    pace: { minutes: Math.floor(totalSeconds / 60), seconds: totalSeconds % 60, totalSeconds },
    fusedSpeedMps: nextState.emaSpeedMps ?? 0,
    nextState,
    isStationary: nextState.isStationary,
  };
};

export const calculateDistanceWindowSpeed = (
  snapshots: PaceSnapshot[],
  nowMs: number,
  windowMs: number = 5000
): number | null => {
  const windowSnapshots = snapshots.filter((snapshot) =>
    Number.isFinite(snapshot.distance) && snapshot.timestamp >= nowMs - windowMs &&
    snapshot.timestamp <= nowMs
  );
  const oldest = windowSnapshots[0];
  const newest = windowSnapshots[windowSnapshots.length - 1];
  if (!oldest || !newest) return null;

  const elapsedSec = (newest.timestamp - oldest.timestamp) / 1000;
  const distanceDelta = newest.distance - oldest.distance;
  // A single 1-second coordinate delta is too noisy to be a pace fallback.
  if (elapsedSec < 3 || distanceDelta < 0) return null;
  return distanceDelta / elapsedSec;
};

export const fuseInstantPace = (
  input: PaceFusionInput,
  previousState: PaceFusionState,
  config: PaceFusionConfig = DEFAULT_PACE_FUSION_CONFIG
): PaceFusionResult => {
  const signal = input.paceSignal;
  const expiryMs = config.signalExpirySeconds * 1000;
  const expired = previousState.lastUsableTimestampMs !== null &&
    input.nowMs - previousState.lastUsableTimestampMs >= expiryMs;
  const state = expired ? {
    ...createInitialPaceFusionState(),
    lastTimestampMs: previousState.lastTimestampMs,
  } : previousState;

  // UI ticks may repeat a sample, but only a new GPS measurement changes the filter.
  if (!signal || !Number.isFinite(signal.timestampMs) || signal.timestampMs > input.nowMs ||
      input.nowMs - signal.timestampMs >= expiryMs ||
      (state.lastTimestampMs !== null && signal.timestampMs <= state.lastTimestampMs)) {
    return resultFromState(state);
  }

  const distanceSpeed = signal.distanceObservationValid === false ? null : input.distanceWindowSpeedMps;
  const speedMps = getReliableGpsSpeed(signal) ??
    (distanceSpeed !== null && Number.isFinite(distanceSpeed) && distanceSpeed >= 0
      ? distanceSpeed : null);
  if (speedMps === null) {
    return resultFromState({
      ...state,
      lastTimestampMs: signal.timestampMs,
      stationaryAccumulatedSeconds: 0,
      lastStationaryTimestampMs: null,
      movingStreak: 0,
      changeDirection: 0,
      changeStreak: 0,
    });
  }

  const deltaSec = state.lastUsableTimestampMs === null ? 0 :
    (signal.timestampMs - state.lastUsableTimestampMs) / 1000;
  const hasUnavailableObservation = state.lastUsableTimestampMs !== null &&
    signal.lastPaceUnavailableTimestampMs !== undefined &&
    signal.lastPaceUnavailableTimestampMs > state.lastUsableTimestampMs &&
    signal.lastPaceUnavailableTimestampMs <= signal.timestampMs;
  const isContinuous = state.lastUsableTimestampMs !== null &&
    state.lastTimestampMs === state.lastUsableTimestampMs &&
    !hasUnavailableObservation &&
    deltaSec > 0 && deltaSec <= MAX_CONTINUOUS_SIGNAL_GAP_SECONDS;
  const change = speedMps - (state.emaSpeedMps ?? speedMps);
  const changeDirection = Math.abs(change) >= config.speedChangeThresholdMps ? Math.sign(change) : 0;
  const changeStreak = changeDirection === 0 ? 0 :
    isContinuous && changeDirection === state.changeDirection ? state.changeStreak + 1 : 1;
  const tau = changeStreak >= 2 ? config.responsiveSmoothingSeconds : config.smoothingSeconds;
  const alpha = 1 - Math.exp(-deltaSec / tau);
  let emaSpeedMps = state.emaSpeedMps === null ? speedMps :
    state.emaSpeedMps + alpha * (speedMps - state.emaSpeedMps);

  const stationary = speedMps < config.stationarySpeedMps &&
    (signal.distanceDeltaMeters === undefined || signal.distanceDeltaMeters <= 0.5);
  const lastStationaryTimestampMs = state.lastStationaryTimestampMs ?? null;
  const stationaryAccumulatedSeconds = stationary && isContinuous &&
    lastStationaryTimestampMs === state.lastUsableTimestampMs
    ? state.stationaryAccumulatedSeconds + deltaSec : 0;
  const movingStreak = speedMps > config.movingExitSpeedMps
    ? (isContinuous ? state.movingStreak : 0) + 1 : 0;
  let isStationary = state.isStationary || stationaryAccumulatedSeconds >= config.stationaryEnterSeconds;
  if (isStationary && movingStreak >= config.movingExitCount) {
    isStationary = false;
    emaSpeedMps = speedMps;
  }

  return resultFromState({
    emaSpeedMps,
    lastPaceSecondsPerKm: !isStationary && emaSpeedMps > 0 ? 1000 / emaSpeedMps : null,
    lastTimestampMs: signal.timestampMs,
    lastUsableTimestampMs: signal.timestampMs,
    changeDirection,
    changeStreak,
    stationaryAccumulatedSeconds,
    lastStationaryTimestampMs: stationary ? signal.timestampMs : null,
    movingStreak,
    isStationary,
  });
};

export const createInitialPaceAccumulatorState = (
  seed?: PaceAccumulatorState
): PaceAccumulatorState => ({
  fusionState: seed ? { ...seed.fusionState } : createInitialPaceFusionState(),
  distanceSnapshots: seed ? seed.distanceSnapshots.map((snapshot) => ({ ...snapshot })) : [],
});

export const consumePaceSignal = (
  state: PaceAccumulatorState,
  signal: PaceSignal
): PaceAccumulatorState => {
  if (!Number.isFinite(signal.timestampMs) ||
      (state.fusionState.lastTimestampMs !== null &&
        signal.timestampMs <= state.fusionState.lastTimestampMs)) {
    return state;
  }

  const windowMs = DEFAULT_PACE_FUSION_CONFIG.signalExpirySeconds * 1000;
  const distanceSnapshots = state.distanceSnapshots.filter(
    (snapshot) => snapshot.timestamp >= signal.timestampMs - windowMs
  );
  if (signal.distanceObservationValid !== false && signal.distanceMeters !== undefined &&
      Number.isFinite(signal.distanceMeters)) {
    distanceSnapshots.push({ timestamp: signal.timestampMs, distance: signal.distanceMeters });
  }

  // Each accepted sample advances fusion in measurement time, including delayed batches.
  const fused = fuseInstantPace({
    paceSignal: signal,
    distanceWindowSpeedMps: calculateDistanceWindowSpeed(
      distanceSnapshots, signal.timestampMs, windowMs
    ),
    nowMs: signal.timestampMs,
  }, state.fusionState);

  return { fusionState: fused.nextState, distanceSnapshots };
};

export const readPaceAccumulator = (
  state: PaceAccumulatorState,
  nowMs: number
): PaceData => {
  // Display expiry must not erase producer history before a delayed batch is consumed.
  return fuseInstantPace({ distanceWindowSpeedMps: null, nowMs }, state.fusionState).pace;
};
