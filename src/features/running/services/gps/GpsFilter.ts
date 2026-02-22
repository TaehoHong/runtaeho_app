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
  | 'STATIONARY';

export interface GpsFilterResult {
  acceptedForDistance: boolean;
  acceptedForPath: boolean;
  acceptedForPace: boolean;
  distanceMeters: number;
  speedMps: number;
  reason: GpsRejectReason;
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

export const evaluateGpsSample = (
  previousSample: GpsSample | null,
  currentSample: GpsSample,
  config: GpsFilterConfig = DEFAULT_GPS_FILTER_CONFIG
): GpsFilterResult => {
  if (!isFiniteNumber(currentSample.latitude) || !isFiniteNumber(currentSample.longitude)) {
    return rejected('INVALID_COORDINATE');
  }

  if (!isFiniteNumber(currentSample.timestampMs)) {
    return rejected('INVALID_TIMESTAMP');
  }

  if (
    isFiniteNumber(currentSample.accuracyMeters) &&
    currentSample.accuracyMeters > config.maxAccuracyMeters
  ) {
    return rejected('LOW_ACCURACY');
  }

  if (!previousSample) {
    return {
      acceptedForDistance: false,
      acceptedForPath: true,
      acceptedForPace: false,
      distanceMeters: 0,
      speedMps: currentSample.speedMps ?? 0,
      reason: 'NO_PREVIOUS_SAMPLE',
    };
  }

  const deltaSeconds = (currentSample.timestampMs - previousSample.timestampMs) / 1000;

  if (!isFiniteNumber(deltaSeconds) || deltaSeconds <= 0) {
    return rejected('INVALID_TIMESTAMP');
  }

  if (deltaSeconds > config.maxDeltaSeconds) {
    return rejected('TIME_GAP_TOO_LARGE');
  }

  const distanceMeters = calculateHaversineDistance(
    previousSample.latitude,
    previousSample.longitude,
    currentSample.latitude,
    currentSample.longitude
  );

  const distanceSpeedMps = distanceMeters / deltaSeconds;
  const sensorSpeedMps = isFiniteNumber(currentSample.speedMps) && currentSample.speedMps >= 0
    ? currentSample.speedMps
    : undefined;

  const fusedSpeedMps =
    sensorSpeedMps !== undefined && sensorSpeedMps > 0
      ? (sensorSpeedMps + distanceSpeedMps) / 2
      : distanceSpeedMps;

  const validationSpeedMps = Math.max(distanceSpeedMps, sensorSpeedMps ?? 0);
  if (validationSpeedMps * 3.6 > config.maxSpeedKmh) {
    return rejected('SPEED_TOO_FAST', fusedSpeedMps);
  }

  const stationarySpeedMps = sensorSpeedMps ?? distanceSpeedMps;
  const isStationary =
    stationarySpeedMps < config.stationarySpeedMps &&
    distanceMeters <= config.stationaryRadiusMeters;

  if (isStationary) {
    return rejected('STATIONARY', fusedSpeedMps, true, distanceMeters);
  }

  if (distanceMeters < config.minDistanceMeters) {
    return rejected('DISTANCE_BELOW_MIN', fusedSpeedMps, true, distanceMeters);
  }

  return {
    acceptedForDistance: true,
    acceptedForPath: true,
    acceptedForPace: true,
    distanceMeters,
    speedMps: fusedSpeedMps,
    reason: 'OK',
  };
};
