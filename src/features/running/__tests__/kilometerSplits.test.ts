import { buildKilometerSplits } from '~/features/running/models/kilometerSplits';
import type { RunningRecordItemResponse } from '~/features/running/services/runningService';

const buildItem = (
  overrides: Partial<RunningRecordItemResponse>
): RunningRecordItemResponse => ({
  distance: 0,
  durationSec: 0,
  cadence: 0,
  heartRate: 0,
  minHeartRate: 0,
  maxHeartRate: 0,
  orderIndex: 0,
  startTimeStamp: 0,
  endTimeStamp: 0,
  ...overrides,
});

describe('buildKilometerSplits', () => {
  it('splits segment items into kilometer rows and keeps the final remainder', () => {
    const splits = buildKilometerSplits([
      buildItem({ distance: 600, durationSec: 180, heartRate: 140, cadence: 160 }),
      buildItem({ distance: 500, durationSec: 150, heartRate: 150, cadence: 170 }),
      buildItem({ distance: 900, durationSec: 270, heartRate: 160, cadence: 180 }),
      buildItem({ distance: 360, durationSec: 108, heartRate: 0, cadence: 0 }),
    ]);

    expect(splits).toEqual([
      {
        splitNumber: 1,
        distanceMeters: 1000,
        durationSec: 300,
        paceSecPerKm: 300,
        heartRate: 144,
        cadence: 164,
        isPartial: false,
      },
      {
        splitNumber: 2,
        distanceMeters: 1000,
        durationSec: 300,
        paceSecPerKm: 300,
        heartRate: 159,
        cadence: 179,
        isPartial: false,
      },
      {
        splitNumber: 3,
        distanceMeters: 360,
        durationSec: 108,
        paceSecPerKm: 300,
        heartRate: null,
        cadence: null,
        isPartial: true,
      },
    ]);
  });

  it('shows a tiny final remainder instead of dropping it', () => {
    const splits = buildKilometerSplits([
      buildItem({ distance: 1005, durationSec: 402, heartRate: 150, cadence: 170 }),
    ]);

    expect(splits).toHaveLength(2);
    expect(splits[1]).toEqual({
      splitNumber: 2,
      distanceMeters: 5,
      durationSec: 2,
      paceSecPerKm: 400,
      heartRate: 150,
      cadence: 170,
      isPartial: true,
    });
  });

  it('returns no splits for empty or non-positive item data', () => {
    expect(buildKilometerSplits([])).toEqual([]);
    expect(buildKilometerSplits([
      buildItem({ distance: 0, durationSec: 120, heartRate: 150, cadence: 170 }),
      buildItem({ distance: 100, durationSec: 0, heartRate: 150, cadence: 170 }),
    ])).toEqual([]);
  });
});
