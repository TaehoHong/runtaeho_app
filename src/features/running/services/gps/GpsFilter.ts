import { calculateHaversineDistance } from '~/shared/utils/DistanceUtils';

export interface GpsSample {
  latitude: number;
  longitude: number;
  timestampMs: number;
  speedMps?: number;
  speedAccuracyMps?: number;
  accuracyMeters?: number;
}

export interface GpsPaceSignal {
  timestampMs: number;
  speedMps?: number;
  speedAccuracyMps?: number;
  accuracyMeters?: number;
  distanceDeltaMeters?: number;
  distanceMeters?: number;
  // A pace-only native speed must not refresh the coordinate distance window.
  distanceObservationValid?: boolean;
  lastPaceUnavailableTimestampMs?: number;
}

interface NativePosition {
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
    speed: number | null;
    accuracy: number | null;
    hasSpeed?: boolean;
    speedAccuracy?: number | null;
  };
}

export const createGpsSample = ({ timestamp, coords }: NativePosition): GpsSample => ({
  latitude: coords.latitude,
  longitude: coords.longitude,
  timestampMs: timestamp,
  // Older native builds cannot distinguish Android's missing speed from a real zero.
  ...(coords.hasSpeed !== false && coords.speed !== null &&
    (coords.hasSpeed === true || coords.speed > 0) && { speedMps: coords.speed }),
  ...(coords.speedAccuracy != null && { speedAccuracyMps: coords.speedAccuracy }),
  ...(coords.accuracy !== null && { accuracyMeters: coords.accuracy }),
});

export const getReliableGpsSpeed = (sample: GpsPaceSignal): number | undefined => {
  const { speedMps, speedAccuracyMps } = sample;
  if (speedMps === undefined || !Number.isFinite(speedMps) || speedMps < 0) return undefined;
  if (speedAccuracyMps !== undefined &&
      (!Number.isFinite(speedAccuracyMps) || speedAccuracyMps < 0 || speedAccuracyMps > 0.5)) {
    return undefined;
  }
  return speedMps;
};

export const createGpsPaceSignal = (
  sample: GpsSample,
  result: GpsFilterResult,
  distanceMeters: number
): GpsPaceSignal => {
  const speedMps = getReliableGpsSpeed(sample);
  const distanceObservationValid = result.acceptedForDistance || result.acceptedForPath ||
    result.reason === 'DISTANCE_BELOW_MIN' || result.reason === 'STATIONARY';
  return {
    timestampMs: sample.timestampMs,
    ...(speedMps !== undefined && { speedMps }),
    ...(sample.speedAccuracyMps !== undefined && { speedAccuracyMps: sample.speedAccuracyMps }),
    ...(sample.accuracyMeters !== undefined && { accuracyMeters: sample.accuracyMeters }),
    ...(result.lastPaceUnavailableTimestampMs !== undefined && {
      lastPaceUnavailableTimestampMs: result.lastPaceUnavailableTimestampMs,
    }),
    distanceObservationValid,
    ...(distanceObservationValid && {
      distanceDeltaMeters: result.acceptedForDistance ? result.distanceMeters : 0,
      // Pace keeps sub-threshold progress; recorded distance still requires the 3m gate.
      distanceMeters: distanceMeters +
        (result.reason === 'DISTANCE_BELOW_MIN' ? result.distanceMeters : 0),
    }),
  };
};

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
  lastPaceUnavailableTimestampMs?: number;
}

export interface GpsFilterState {
  lastAcceptedSample: GpsSample | null;
  lastRawSample: GpsSample | null;
  pendingCandidate: GpsSample | null;
  // Preserve ordering without putting a rejected position in the distance state.
  lastPaceOnlyTimestampMs?: number | null;
  lastPaceUnavailableTimestampMs?: number | null;
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
const PACE_SIGNAL_EXPIRY_MS = 5000;
const CANDIDATE_CONFIRMATION_MAX_GAP_SECONDS = 2;

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
    lastPaceOnlyTimestampMs: seed.lastPaceOnlyTimestampMs ?? null,
    lastPaceUnavailableTimestampMs: seed.lastPaceUnavailableTimestampMs ?? null,
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
  const sensorSpeedMps = getReliableGpsSpeed(currentSample);
  const fusedSpeedMps = sensorSpeedMps ?? distanceSpeedMps;

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
    lastPaceOnlyTimestampMs: null,
  },
});

const shouldQuarantineJump = (
  metrics: DeltaMetrics,
  config: GpsFilterConfig,
  previousSample: GpsSample,
  currentSample: GpsSample
): boolean => {
  if (metrics.sensorSpeedMps === undefined) {
    const previousAccuracy = isFiniteNumber(previousSample.accuracyMeters) &&
      previousSample.accuracyMeters >= 0 ? previousSample.accuracyMeters : config.stationaryRadiusMeters;
    const accuracyBudget = previousAccuracy +
      (currentSample.accuracyMeters ?? config.stationaryRadiusMeters);
    // A fast displacement within the position uncertainty needs a second fix.
    return metrics.deltaSeconds <= CANDIDATE_CONFIRMATION_MAX_GAP_SECONDS &&
      metrics.distanceMeters > Math.max(config.minDistanceMeters, config.stationaryRadiusMeters) &&
      metrics.distanceMeters <= accuracyBudget &&
      metrics.distanceSpeedMps > SENSOR_SPEED_GRACE_MPS;
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

const reduceGpsSampleInternal = (
  state: GpsFilterState,
  currentSample: GpsSample,
  config: GpsFilterConfig = DEFAULT_GPS_FILTER_CONFIG,
  nowMs: number = Date.now()
): GpsFilterEvaluation => {
  const currentState = cloneGpsFilterState(state);

  if (!isFiniteNumber(currentSample.latitude) || !isFiniteNumber(currentSample.longitude) ||
      Math.abs(currentSample.latitude) > 90 || Math.abs(currentSample.longitude) > 180) {
    return {
      result: rejected('INVALID_COORDINATE'),
      nextState: currentState,
    };
  }

  if (!isFiniteNumber(currentSample.timestampMs) || currentSample.timestampMs > nowMs ||
      (currentState.lastRawSample !== null &&
        currentSample.timestampMs <= currentState.lastRawSample.timestampMs) ||
      (currentState.lastPaceOnlyTimestampMs != null &&
        currentSample.timestampMs <= currentState.lastPaceOnlyTimestampMs) ||
      (currentState.lastPaceUnavailableTimestampMs != null &&
        currentSample.timestampMs <= currentState.lastPaceUnavailableTimestampMs)) {
    return {
      result: rejected('INVALID_TIMESTAMP'),
      nextState: currentState,
    };
  }

  if (isFiniteNumber(currentSample.speedMps) &&
      currentSample.speedMps * 3.6 > config.maxSpeedKmh) {
    return { result: rejected('SPEED_TOO_FAST'), nextState: currentState };
  }

  const sensorSpeedMps = getReliableGpsSpeed(currentSample);
  const canUseNativeSpeedForPace = sensorSpeedMps !== undefined &&
    sensorSpeedMps * 3.6 <= Math.min(config.maxSpeedKmh, DEFAULT_GPS_FILTER_CONFIG.maxSpeedKmh) &&
    currentSample.speedAccuracyMps !== undefined &&
    nowMs - currentSample.timestampMs < PACE_SIGNAL_EXPIRY_MS;

  if (
    currentSample.accuracyMeters !== undefined &&
    (!isFiniteNumber(currentSample.accuracyMeters) || currentSample.accuracyMeters < 0 ||
      currentSample.accuracyMeters > config.maxAccuracyMeters)
  ) {
    return {
      result: rejected('LOW_ACCURACY', sensorSpeedMps ?? 0, canUseNativeSpeedForPace),
      nextState: {
        ...currentState,
        pendingCandidate: null,
        lastPaceOnlyTimestampMs: canUseNativeSpeedForPace
          ? currentSample.timestampMs : currentState.lastPaceOnlyTimestampMs ?? null,
      },
    };
  }

  const anchorSample = currentState.lastAcceptedSample ?? currentState.lastRawSample;
  if (!anchorSample) {
    return {
      result: {
        acceptedForDistance: false,
        acceptedForPath: true,
        acceptedForPace: true,
        distanceMeters: 0,
        speedMps: getReliableGpsSpeed(currentSample) ?? 0,
        reason: 'NO_PREVIOUS_SAMPLE',
      },
      nextState: {
        lastAcceptedSample: cloneSample(currentSample),
        lastRawSample: cloneSample(currentSample),
        pendingCandidate: null,
        lastPaceOnlyTimestampMs: null,
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
      result: rejected('SPEED_TOO_FAST', anchorMetrics.fusedSpeedMps, canUseNativeSpeedForPace),
      nextState: {
        ...currentState,
        lastRawSample: cloneSample(currentSample),
        pendingCandidate: null,
      },
    };
  }

  const localReference = currentState.lastRawSample ?? anchorSample;
  const localMetrics = computeDeltaMetrics(localReference, currentSample) ?? anchorMetrics;
  const pendingWithoutSpeed = currentState.pendingCandidate &&
    getReliableGpsSpeed(currentState.pendingCandidate) === undefined;
  if (sensorSpeedMps === undefined && pendingWithoutSpeed &&
      anchorMetrics.distanceMeters <= config.stationaryRadiusMeters) {
    // Discard the excursion and restart timing in the original position region.
    return reanchored(currentSample, 'JUMP_QUARANTINED');
  }
  const stationarySpeedMps = localMetrics.sensorSpeedMps ?? localMetrics.distanceSpeedMps;
  const isStationary =
    stationarySpeedMps < config.stationarySpeedMps &&
    localMetrics.distanceMeters <= config.stationaryRadiusMeters;

  if (isStationary) {
    return reanchored(currentSample, 'STATIONARY', stationarySpeedMps, true);
  }

  if (shouldQuarantineJump(anchorMetrics, config, anchorSample, currentSample)) {
    const candidateGapSeconds = currentState.pendingCandidate
      ? (currentSample.timestampMs - currentState.pendingCandidate.timestampMs) / 1000 : 0;
    if (
      currentState.pendingCandidate &&
      (sensorSpeedMps !== undefined ||
        (candidateGapSeconds > 0 && candidateGapSeconds <= CANDIDATE_CONFIRMATION_MAX_GAP_SECONDS &&
          anchorMetrics.distanceMeters > config.stationaryRadiusMeters)) &&
      isPendingCandidateConfirmed(currentState.pendingCandidate, currentSample, config)
    ) {
      return {
        result: accepted('OK', anchorMetrics),
        nextState: {
          lastAcceptedSample: cloneSample(currentSample),
          lastRawSample: cloneSample(currentSample),
          pendingCandidate: null,
          lastPaceOnlyTimestampMs: null,
        },
      };
    }

    return {
      result: rejected('JUMP_QUARANTINED', anchorMetrics.fusedSpeedMps, canUseNativeSpeedForPace),
      nextState: {
        ...currentState,
        lastRawSample: cloneSample(currentSample),
        pendingCandidate: cloneSample(currentSample),
      },
    };
  }

  if (anchorMetrics.distanceMeters < config.minDistanceMeters) {
    return {
      result: rejected(
        'DISTANCE_BELOW_MIN', localMetrics.fusedSpeedMps, true, anchorMetrics.distanceMeters
      ),
      nextState: {
        ...currentState,
        lastRawSample: cloneSample(currentSample),
        pendingCandidate: null,
      },
    };
  }

  return {
    result: accepted('OK', anchorMetrics),
    nextState: {
      lastAcceptedSample: cloneSample(currentSample),
      lastRawSample: cloneSample(currentSample),
      pendingCandidate: null,
      lastPaceOnlyTimestampMs: null,
    },
  };
};

export const reduceGpsSample = (
  state: GpsFilterState,
  currentSample: GpsSample,
  config: GpsFilterConfig = DEFAULT_GPS_FILTER_CONFIG,
  nowMs: number = Date.now()
): GpsFilterEvaluation => {
  const evaluation = reduceGpsSampleInternal(state, currentSample, config, nowMs);
  const lastObservedTimestampMs = Math.max(
    state.lastRawSample?.timestampMs ?? -Infinity,
    state.lastPaceOnlyTimestampMs ?? -Infinity,
    state.lastPaceUnavailableTimestampMs ?? -Infinity
  );
  const isNewObservation = isFiniteNumber(currentSample.timestampMs) &&
    currentSample.timestampMs <= nowMs && currentSample.timestampMs > lastObservedTimestampMs;
  const lastPaceUnavailableTimestampMs = isNewObservation &&
    evaluation.result.reason !== 'INVALID_TIMESTAMP' && !evaluation.result.acceptedForPace
    ? currentSample.timestampMs : state.lastPaceUnavailableTimestampMs ?? null;

  // Retain the boundary on later signals even when UI ticks skip the rejected fix.
  return {
    result: {
      ...evaluation.result,
      ...(lastPaceUnavailableTimestampMs !== null && { lastPaceUnavailableTimestampMs }),
    },
    nextState: { ...evaluation.nextState, lastPaceUnavailableTimestampMs },
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
