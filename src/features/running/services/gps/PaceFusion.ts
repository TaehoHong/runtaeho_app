import type { PaceData, PaceSignal, PaceSnapshot } from '../../viewmodels/hooks/types';

export interface PaceFusionConfig {
  highQualityAccuracyMeters: number;
  freshSignalSeconds: number;
  gpsWeightHigh: number;
  gpsWeightLow: number;
  emaAlpha: number;
  maxPaceChangePerSecond: number;
  stationarySpeedMps: number;
  stationaryEnterSeconds: number;
  movingExitSpeedMps: number;
  movingExitCount: number;
}

export interface PaceFusionState {
  emaSpeedMps: number | null;
  lastPaceSecondsPerKm: number | null;
  lastTimestampMs: number | null;
  stationaryAccumulatedSeconds: number;
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

export const DEFAULT_PACE_FUSION_CONFIG: PaceFusionConfig = {
  highQualityAccuracyMeters: 15,
  freshSignalSeconds: 2,
  gpsWeightHigh: 0.65,
  gpsWeightLow: 0.25,
  emaAlpha: 0.35,
  maxPaceChangePerSecond: 25,
  stationarySpeedMps: 0.8,
  stationaryEnterSeconds: 3,
  movingExitSpeedMps: 1.2,
  movingExitCount: 2,
};

export const createInitialPaceFusionState = (): PaceFusionState => ({
  emaSpeedMps: null,
  lastPaceSecondsPerKm: null,
  lastTimestampMs: null,
  stationaryAccumulatedSeconds: 0,
  movingStreak: 0,
  isStationary: false,
});

const toPaceData = (secondsPerKm: number): PaceData => {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) {
    return { minutes: 0, seconds: 0, totalSeconds: 0 };
  }

  const totalSeconds = Math.max(1, Math.round(secondsPerKm));
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
  };
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const calculateDistanceWindowSpeed = (
  snapshots: PaceSnapshot[],
  nowMs: number,
  windowMs: number = 10000
): number | null => {
  const cutoff = nowMs - windowMs;
  const windowSnapshots = snapshots.filter((snapshot) => snapshot.timestamp >= cutoff);

  if (windowSnapshots.length < 2) {
    return null;
  }

  const oldest = windowSnapshots[0];
  const newest = windowSnapshots[windowSnapshots.length - 1];

  if (!oldest || !newest) {
    return null;
  }

  const distanceDelta = newest.distance - oldest.distance;
  const elapsedSec = (newest.timestamp - oldest.timestamp) / 1000;

  if (elapsedSec <= 0 || distanceDelta <= 0) {
    return null;
  }

  return distanceDelta / elapsedSec;
};

const computeGpsWeight = (
  paceSignal: PaceSignal | undefined,
  nowMs: number,
  config: PaceFusionConfig
): number => {
  if (!paceSignal || typeof paceSignal.speedMps !== 'number') {
    return 0;
  }

  const freshnessSec = Math.max(0, (nowMs - paceSignal.timestampMs) / 1000);
  const isFresh = freshnessSec <= config.freshSignalSeconds;
  const isHighQuality =
    typeof paceSignal.accuracyMeters === 'number'
      ? paceSignal.accuracyMeters <= config.highQualityAccuracyMeters
      : false;

  if (isFresh && isHighQuality) {
    return config.gpsWeightHigh;
  }

  return config.gpsWeightLow;
};

export const fuseInstantPace = (
  input: PaceFusionInput,
  previousState: PaceFusionState,
  config: PaceFusionConfig = DEFAULT_PACE_FUSION_CONFIG
): PaceFusionResult => {
  const deltaSecRaw =
    previousState.lastTimestampMs !== null
      ? (input.nowMs - previousState.lastTimestampMs) / 1000
      : 1;

  const deltaSec = Number.isFinite(deltaSecRaw) && deltaSecRaw > 0 ? deltaSecRaw : 1;

  const gpsSpeedMps =
    input.paceSignal && typeof input.paceSignal.speedMps === 'number' && input.paceSignal.speedMps > 0
      ? input.paceSignal.speedMps
      : null;

  const distanceSpeedMps =
    typeof input.distanceWindowSpeedMps === 'number' && input.distanceWindowSpeedMps > 0
      ? input.distanceWindowSpeedMps
      : null;

  const gpsWeight = computeGpsWeight(input.paceSignal, input.nowMs, config);

  let baseSpeedMps = 0;
  if (gpsSpeedMps !== null && distanceSpeedMps !== null) {
    baseSpeedMps = gpsWeight * gpsSpeedMps + (1 - gpsWeight) * distanceSpeedMps;
  } else if (gpsSpeedMps !== null) {
    baseSpeedMps = gpsSpeedMps;
  } else if (distanceSpeedMps !== null) {
    baseSpeedMps = distanceSpeedMps;
  }

  const emaSpeedMps =
    previousState.emaSpeedMps === null
      ? baseSpeedMps
      : config.emaAlpha * baseSpeedMps + (1 - config.emaAlpha) * previousState.emaSpeedMps;

  let stationaryAccumulatedSeconds = previousState.stationaryAccumulatedSeconds;
  let movingStreak = previousState.movingStreak;
  let isStationary = previousState.isStationary;

  const paceSignalDistanceDelta = input.paceSignal?.distanceDeltaMeters;
  const hasStrongStationarySignal =
    gpsSpeedMps !== null &&
    gpsSpeedMps < config.stationarySpeedMps &&
    (typeof paceSignalDistanceDelta === 'number' ? paceSignalDistanceDelta <= 0.5 : true);

  const hasStrongMovingSignal =
    gpsSpeedMps !== null &&
    gpsSpeedMps > config.movingExitSpeedMps &&
    (typeof paceSignalDistanceDelta === 'number' ? paceSignalDistanceDelta > 0.5 : true);

  if (hasStrongStationarySignal) {
    stationaryAccumulatedSeconds += deltaSec;
    movingStreak = 0;
  } else if (emaSpeedMps < config.stationarySpeedMps) {
    stationaryAccumulatedSeconds += deltaSec;
    movingStreak = 0;
  } else if (hasStrongMovingSignal || emaSpeedMps > config.movingExitSpeedMps) {
    movingStreak += 1;
    if (movingStreak >= config.movingExitCount) {
      stationaryAccumulatedSeconds = 0;
    }
  } else {
    movingStreak = 0;
  }

  if (stationaryAccumulatedSeconds >= config.stationaryEnterSeconds) {
    isStationary = true;
  }
  if (movingStreak >= config.movingExitCount) {
    isStationary = false;
  }

  let paceSecondsPerKm: number | null = null;
  if (!isStationary && emaSpeedMps > 0) {
    paceSecondsPerKm = 1000 / emaSpeedMps;

    if (previousState.lastPaceSecondsPerKm !== null) {
      const maxDelta = config.maxPaceChangePerSecond * deltaSec;
      paceSecondsPerKm = clamp(
        paceSecondsPerKm,
        previousState.lastPaceSecondsPerKm - maxDelta,
        previousState.lastPaceSecondsPerKm + maxDelta
      );
    }
  }

  const nextState: PaceFusionState = {
    emaSpeedMps,
    lastPaceSecondsPerKm: paceSecondsPerKm,
    lastTimestampMs: input.nowMs,
    stationaryAccumulatedSeconds,
    movingStreak,
    isStationary,
  };

  if (paceSecondsPerKm === null) {
    return {
      pace: { minutes: 0, seconds: 0, totalSeconds: 0 },
      fusedSpeedMps: emaSpeedMps,
      nextState,
      isStationary,
    };
  }

  return {
    pace: toPaceData(paceSecondsPerKm),
    fusedSpeedMps: emaSpeedMps,
    nextState,
    isStationary,
  };
};
