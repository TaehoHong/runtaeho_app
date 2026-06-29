type NullableNumber = number | null | undefined;

interface DistanceFormatOptions {
  fractionDigits?: number;
  includeUnit?: boolean;
}

interface PaceFormatOptions {
  includeUnit?: boolean;
}

interface PointFormatOptions {
  signed?: boolean;
  useGrouping?: boolean;
}

interface MetricParts {
  value: string;
  unit: string;
  text: string;
}

const EMPTY_VALUE = '--';
const KM_UNIT = 'km';
const PACE_UNIT = '/km';

const toFiniteNumber = (value: NullableNumber): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const toNonNegativeNumber = (value: NullableNumber): number => {
  const finiteValue = toFiniteNumber(value);
  return finiteValue === null ? 0 : Math.max(0, finiteValue);
};

const toPositiveRoundedInteger = (value: NullableNumber): number | null => {
  const finiteValue = toFiniteNumber(value);
  if (finiteValue === null || finiteValue <= 0) {
    return null;
  }

  return Math.round(finiteValue);
};

const formatPaceSeconds = (totalSeconds: number, includeUnit: boolean): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const value = `${minutes}'${String(seconds).padStart(2, '0')}"`;

  return includeUnit ? `${value}${PACE_UNIT}` : value;
};

export const RunningStatusFormat = {
  distanceParts(meters: NullableNumber, options: DistanceFormatOptions = {}): MetricParts {
    const { fractionDigits = 2, includeUnit = true } = options;
    const value = (toNonNegativeNumber(meters) / 1000).toFixed(fractionDigits);
    const unit = includeUnit ? KM_UNIT : '';

    return {
      value,
      unit,
      text: includeUnit ? `${value} ${KM_UNIT}` : value,
    };
  },

  distance(meters: NullableNumber, options: DistanceFormatOptions = {}): string {
    return this.distanceParts(meters, options).text;
  },

  duration(seconds: NullableNumber): string {
    const totalSeconds = Math.floor(toNonNegativeNumber(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  },

  pace(paceMinPerKm: NullableNumber, options: PaceFormatOptions = {}): string {
    const { includeUnit = true } = options;
    const finitePace = toFiniteNumber(paceMinPerKm);

    if (finitePace === null || finitePace <= 0) {
      return includeUnit ? `${EMPTY_VALUE}${PACE_UNIT}` : EMPTY_VALUE;
    }

    return formatPaceSeconds(Math.round(finitePace * 60), includeUnit);
  },

  paceFromMetersAndSeconds(
    distanceMeters: NullableNumber,
    durationSeconds: NullableNumber,
    options: PaceFormatOptions = {}
  ): string {
    const distance = toFiniteNumber(distanceMeters);
    const duration = toFiniteNumber(durationSeconds);

    if (distance === null || duration === null || distance <= 0 || duration <= 0) {
      return options.includeUnit === false ? EMPTY_VALUE : `${EMPTY_VALUE}${PACE_UNIT}`;
    }

    return formatPaceSeconds(Math.round((duration / distance) * 1000), options.includeUnit !== false);
  },

  paceFromSecondsPerKm(paceSecPerKm: NullableNumber, options: PaceFormatOptions = {}): string {
    const totalSeconds = toPositiveRoundedInteger(paceSecPerKm);
    const includeUnit = options.includeUnit !== false;

    return totalSeconds === null
      ? includeUnit ? `${EMPTY_VALUE}${PACE_UNIT}` : EMPTY_VALUE
      : formatPaceSeconds(totalSeconds, includeUnit);
  },

  heartRate(value: NullableNumber): string {
    const roundedValue = toPositiveRoundedInteger(value);
    return roundedValue === null ? EMPTY_VALUE : `${roundedValue} bpm`;
  },

  cadence(value: NullableNumber): string {
    const roundedValue = toPositiveRoundedInteger(value);
    return roundedValue === null ? EMPTY_VALUE : `${roundedValue} spm`;
  },

  calories(value: NullableNumber): string {
    const roundedValue = toPositiveRoundedInteger(value);
    return roundedValue === null ? EMPTY_VALUE : `${roundedValue} kcal`;
  },

  speedKmh(value: NullableNumber): string {
    const speed = toFiniteNumber(value);
    return speed === null || speed < 0 ? EMPTY_VALUE : `${speed.toFixed(1)} km/h`;
  },

  points(value: NullableNumber, options: PointFormatOptions = {}): string {
    const finiteValue = toFiniteNumber(value);
    const roundedValue = finiteValue === null ? 0 : Math.max(0, Math.round(finiteValue));
    const formattedValue = options.useGrouping
      ? roundedValue.toLocaleString('en-US')
      : String(roundedValue);
    const sign = options.signed && roundedValue > 0 ? '+' : '';

    return `${sign}${formattedValue} P`;
  },
} as const;
