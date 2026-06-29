import type { RunningRecordItemResponse } from '../services/runningService';

const SPLIT_DISTANCE_METERS = 1000;
const DISTANCE_EPSILON = 0.000001;

export interface KilometerSplit {
  splitNumber: number;
  distanceMeters: number;
  durationSec: number;
  paceSecPerKm: number;
  heartRate: number | null;
  cadence: number | null;
  isPartial: boolean;
}

interface SplitAccumulator {
  distanceMeters: number;
  durationSec: number;
  heartRateWeightedSum: number;
  heartRateWeightSec: number;
  cadenceWeightedSum: number;
  cadenceWeightSec: number;
}

const createAccumulator = (): SplitAccumulator => ({
  distanceMeters: 0,
  durationSec: 0,
  heartRateWeightedSum: 0,
  heartRateWeightSec: 0,
  cadenceWeightedSum: 0,
  cadenceWeightSec: 0,
});

const buildSplit = (
  accumulator: SplitAccumulator,
  splitNumber: number,
  isPartial: boolean
): KilometerSplit => {
  const distanceMeters = Math.round(accumulator.distanceMeters);
  const durationSec = Math.round(accumulator.durationSec);

  return {
    splitNumber,
    distanceMeters,
    durationSec,
    paceSecPerKm: distanceMeters > 0
      ? Math.round(durationSec / (distanceMeters / SPLIT_DISTANCE_METERS))
      : 0,
    heartRate: accumulator.heartRateWeightSec > 0
      ? Math.round(accumulator.heartRateWeightedSum / accumulator.heartRateWeightSec)
      : null,
    cadence: accumulator.cadenceWeightSec > 0
      ? Math.round(accumulator.cadenceWeightedSum / accumulator.cadenceWeightSec)
      : null,
    isPartial,
  };
};

const addSensorContribution = (
  accumulator: SplitAccumulator,
  item: RunningRecordItemResponse,
  chunkDurationSec: number
) => {
  if (item.heartRate > 0) {
    accumulator.heartRateWeightedSum += item.heartRate * chunkDurationSec;
    accumulator.heartRateWeightSec += chunkDurationSec;
  }

  if (item.cadence > 0) {
    accumulator.cadenceWeightedSum += item.cadence * chunkDurationSec;
    accumulator.cadenceWeightSec += chunkDurationSec;
  }
};

export const buildKilometerSplits = (
  items: RunningRecordItemResponse[]
): KilometerSplit[] => {
  const splits: KilometerSplit[] = [];
  let accumulator = createAccumulator();
  let splitNumber = 1;

  const orderedItems = [...items].sort((a, b) => a.orderIndex - b.orderIndex);

  orderedItems.forEach((item) => {
    if (item.distance <= 0 || item.durationSec <= 0) {
      return;
    }

    let remainingDistance = item.distance;

    while (remainingDistance > DISTANCE_EPSILON) {
      const remainingSplitDistance = SPLIT_DISTANCE_METERS - accumulator.distanceMeters;
      const chunkDistance = Math.min(remainingDistance, remainingSplitDistance);
      const chunkDurationSec = item.durationSec * (chunkDistance / item.distance);

      accumulator.distanceMeters += chunkDistance;
      accumulator.durationSec += chunkDurationSec;
      addSensorContribution(accumulator, item, chunkDurationSec);

      remainingDistance -= chunkDistance;

      if (accumulator.distanceMeters >= SPLIT_DISTANCE_METERS - DISTANCE_EPSILON) {
        splits.push(buildSplit(accumulator, splitNumber, false));
        splitNumber += 1;
        accumulator = createAccumulator();
      }
    }
  });

  if (accumulator.distanceMeters > DISTANCE_EPSILON) {
    splits.push(buildSplit(accumulator, splitNumber, true));
  }

  return splits;
};
