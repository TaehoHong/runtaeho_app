import { calculateHaversineDistance } from '~/shared/utils/DistanceUtils';

export interface GpsSample {
  latitude: number;
  longitude: number;
  timestampMs: number;
  speedMps?: number;
  accuracyMeters?: number;
}

export interface GpsFilterConfig {
  maxAccuracyMeters: number;
  minDistanceMeters: number;
  maxSpeedKmh: number;
  stationarySpeedMps: number;
  stationaryRadiusMeters: number;
  maxDeltaSeconds: number;
}

export type GpsRejectReason =
  | 'OK'
  | 'NO_PREVIOUS_SAMPLE'
  | 'INVALID_COORDINATE'
  | 'INVALID_TIMESTAMP'
  | 'LOW_ACCURACY'
  | 'TIME_GAP_TOO_LARGE'
  | 'SPEED_TOO_FAST'
  | 'DISTANCE_BELOW_MIN'
  | 'STATIONARY'
  | 'JUMP_QUARANTINED';

export interface GpsFilterResult {
  acceptedForDistance: boolean;
  acceptedForPath: boolean;
  acceptedForPace: boolean;
  distanceMeters: number;
  speedMps: number;
  reason: GpsRejectReason;
}

export interface GpsFilterState {
  lastAcceptedSample: GpsSample | null;
  lastRawSample: GpsSample | null;
  pendingCandidate: GpsSample | null;
}

export interface GpsFilterEvaluation {
  result: GpsFilterResult;
  nextState: GpsFilterState;
}

export const DEFAULT_GPS_FILTER_CONFIG: GpsFilterConfig = {
  maxAccuracyMeters: 25,
  minDistanceMeters: 3,
  maxSpeedKmh: 36,
  stationarySpeedMps: 0.8,
  stationaryRadiusMeters: 6,
  maxDeltaSeconds: 15,
};

const isFiniteNumber = (value: number | undefined | null): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const SENSOR_SPEED_GRACE_MPS = 2;
const SENSOR_SPEED_MULTIPLIER = 2.5;

const cloneSample = (sample: GpsSample | null): GpsSample | null =>
  sample ? { ...sample } : null;

export const createInitialGpsFilterState = (
  seed: Partial<GpsFilterState> = {}
): GpsFilterState => {
  const lastAcceptedSample = cloneSample(seed.lastAcceptedSample ?? null);
  const lastRawSample = cloneSample(seed.lastRawSample ?? lastAcceptedSample);

  return {
    lastAcceptedSample,
    lastRawSample,
    pendingCandidate: cloneSample(seed.pendingCandidate ?? null),
  };
};

export const cloneGpsFilterState = (state: GpsFilterState): GpsFilterState =>
  createInitialGpsFilterState(state);

const rejected = (
  reason: GpsRejectReason,
  speedMps: number = 0,
  acceptedForPace: boolean = false,
  distanceMeters: number = 0
): GpsFilterResult => ({
  acceptedForDistance: false,
  acceptedForPath: false,
  acceptedForPace,
  distanceMeters,
  speedMps,
  reason,
});

interface DeltaMetrics {
  deltaSeconds: number;
  distanceMeters: number;
  distanceSpeedMps: number;
  sensorSpeedMps?: number;
  fusedSpeedMps: number;
  validationSpeedMps: number;
}

const computeDeltaMetrics = (
  previousSample: GpsSample,
  currentSample: GpsSample
): DeltaMetrics | null => {
  const deltaSeconds = (currentSample.timestampMs - previousSample.timestampMs) / 1000;
  if (!isFiniteNumber(deltaSeconds) || deltaSeconds <= 0) {
    return null;
  }

  const distanceMeters = calculateHaversineDistance(
    previousSample.latitude,
    previousSample.longitude,
    currentSample.latitude,
    currentSample.longitude
  );

  const distanceSpeedMps = distanceMeters / deltaSeconds;
  const sensorSpeedMps =
    isFiniteNumber(currentSample.speedMps) && currentSample.speedMps >= 0
      ? currentSample.speedMps
      : undefined;

  const fusedSpeedMps =
    sensorSpeedMps !== undefined && sensorSpeedMps > 0
      ? (sensorSpeedMps + distanceSpeedMps) / 2
      : distanceSpeedMps;

  return {
    deltaSeconds,
    distanceMeters,
    distanceSpeedMps,
    ...(sensorSpeedMps !== undefined && { sensorSpeedMps }),
    fusedSpeedMps,
    validationSpeedMps: Math.max(distanceSpeedMps, sensorSpeedMps ?? 0),
  };
};

const accepted = (
  reason: GpsRejectReason,
  metrics: DeltaMetrics
): GpsFilterResult => ({
  acceptedForDistance: true,
  acceptedForPath: true,
  acceptedForPace: true,
  distanceMeters: metrics.distanceMeters,
  speedMps: metrics.fusedSpeedMps,
  reason,
});

const reanchored = (
  currentSample: GpsSample,
  reason: GpsRejectReason,
  speedMps: number = 0,
  acceptedForPace: boolean = false,
  distanceMeters: number = 0
): GpsFilterEvaluation => ({
  result: rejected(reason, speedMps, acceptedForPace, distanceMeters),
  nextState: {
    lastAcceptedSample: cloneSample(currentSample),
    lastRawSample: cloneSample(currentSample),
    pendingCandidate: null,
  },
});

const shouldQuarantineJump = (
  metrics: DeltaMetrics,
  config: GpsFilterConfig
): boolean => {
  if (metrics.sensorSpeedMps === undefined) {
    return false;
  }

  const sensorConsistencyBudget = Math.max(
    metrics.sensorSpeedMps * SENSOR_SPEED_MULTIPLIER,
    metrics.sensorSpeedMps + SENSOR_SPEED_GRACE_MPS
  );

  return (
    metrics.distanceMeters > Math.max(config.minDistanceMeters, config.stationaryRadiusMeters) &&
    metrics.distanceSpeedMps > sensorConsistencyBudget
  );
};

const isPendingCandidateConfirmed = (
  pendingCandidate: GpsSample,
  currentSample: GpsSample,
  config: GpsFilterConfig
): boolean => {
  const confirmationDistance = calculateHaversineDistance(
    pendingCandidate.latitude,
    pendingCandidate.longitude,
    currentSample.latitude,
    currentSample.longitude
  );
  const confirmationRadius = Math.max(
    config.minDistanceMeters * 2,
    (pendingCandidate.accuracyMeters ?? 0) + (currentSample.accuracyMeters ?? 0)
  );

  return confirmationDistance <= confirmationRadius;
};

export const reduceGpsSample = (
  state: GpsFilterState,
  currentSample: GpsSample,
  config: GpsFilterConfig = DEFAULT_GPS_FILTER_CONFIG
): GpsFilterEvaluation => {
  const currentState = cloneGpsFilterState(state);

  if (!isFiniteNumber(currentSample.latitude) || !isFiniteNumber(currentSample.longitude)) {
    return {
      result: rejected('INVALID_COORDINATE'),
      nextState: currentState,
    };
  }

  if (!isFiniteNumber(currentSample.timestampMs)) {
    return {
      result: rejected('INVALID_TIMESTAMP'),
      nextState: currentState,
    };
  }

  if (
    isFiniteNumber(currentSample.accuracyMeters) &&
    currentSample.accuracyMeters > config.maxAccuracyMeters
  ) {
    return {
      result: rejected('LOW_ACCURACY'),
      nextState: {
        ...currentState,
        pendingCandidate: null,
      },
    };
  }

  const anchorSample = currentState.lastAcceptedSample ?? currentState.lastRawSample;
  if (!anchorSample) {
    return {
      result: {
        acceptedForDistance: false,
        acceptedForPath: true,
        acceptedForPace: false,
        distanceMeters: 0,
        speedMps: currentSample.speedMps ?? 0,
        reason: 'NO_PREVIOUS_SAMPLE',
      },
      nextState: {
        lastAcceptedSample: cloneSample(currentSample),
        lastRawSample: cloneSample(currentSample),
        pendingCandidate: null,
      },
    };
  }

  const anchorMetrics = computeDeltaMetrics(anchorSample, currentSample);
  if (!anchorMetrics) {
    return {
      result: rejected('INVALID_TIMESTAMP'),
      nextState: currentState,
    };
  }

  if (anchorMetrics.deltaSeconds > config.maxDeltaSeconds) {
    return reanchored(currentSample, 'TIME_GAP_TOO_LARGE');
  }

  if (anchorMetrics.validationSpeedMps * 3.6 > config.maxSpeedKmh) {
    return {
      result: rejected('SPEED_TOO_FAST', anchorMetrics.fusedSpeedMps),
      nextState: {
        ...currentState,
        lastRawSample: cloneSample(currentSample),
        pendingCandidate: null,
      },
    };
  }

  if (shouldQuarantineJump(anchorMetrics, config)) {
    if (
      currentState.pendingCandidate &&
      isPendingCandidateConfirmed(currentState.pendingCandidate, currentSample, config)
    ) {
      return {
        result: accepted('OK', anchorMetrics),
        nextState: {
          lastAcceptedSample: cloneSample(currentSample),
          lastRawSample: cloneSample(currentSample),
          pendingCandidate: null,
        },
      };
    }

    return {
      result: rejected('JUMP_QUARANTINED', anchorMetrics.fusedSpeedMps),
      nextState: {
        ...currentState,
        lastRawSample: cloneSample(currentSample),
        pendingCandidate: cloneSample(currentSample),
      },
    };
  }

  const localReference = currentState.lastRawSample ?? anchorSample;
  const localMetrics = computeDeltaMetrics(localReference, currentSample) ?? anchorMetrics;
  const stationarySpeedMps = localMetrics.sensorSpeedMps ?? localMetrics.distanceSpeedMps;
  const isStationary =
    stationarySpeedMps < config.stationarySpeedMps &&
    localMetrics.distanceMeters <= config.stationaryRadiusMeters;

  if (isStationary) {
    return reanchored(
      currentSample,
      'STATIONARY',
      localMetrics.fusedSpeedMps,
      true,
      localMetrics.distanceMeters
    );
  }

  if (localMetrics.distanceMeters < config.minDistanceMeters) {
    return reanchored(
      currentSample,
      'DISTANCE_BELOW_MIN',
      localMetrics.fusedSpeedMps,
      true,
      localMetrics.distanceMeters
    );
  }

  return {
    result: accepted('OK', anchorMetrics),
    nextState: {
      lastAcceptedSample: cloneSample(currentSample),
      lastRawSample: cloneSample(currentSample),
      pendingCandidate: null,
    },
  };
};

export const evaluateGpsSample = (
  previousSample: GpsSample | null,
  currentSample: GpsSample,
  config: GpsFilterConfig = DEFAULT_GPS_FILTER_CONFIG
): GpsFilterResult =>
  reduceGpsSample(
    createInitialGpsFilterState({
      lastAcceptedSample: previousSample,
      lastRawSample: previousSample,
    }),
    currentSample,
    config
  ).result;
