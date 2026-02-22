import {
  DEFAULT_GPS_FILTER_CONFIG,
  evaluateGpsSample,
  type GpsSample,
} from '~/features/running/services/gps/GpsFilter';

const metersToLatitude = (meters: number): number => meters / 111_111;

describe('GpsFilter', () => {
  it('does not accumulate distance or path for stationary drift-like samples', () => {
    let previous: GpsSample | null = {
      latitude: 37.5,
      longitude: 127.0,
      timestampMs: 1_740_000_000_000,
      speedMps: 0.2,
      accuracyMeters: 5,
    };

    const first = evaluateGpsSample(null, previous, DEFAULT_GPS_FILTER_CONFIG);
    expect(first.acceptedForPath).toBe(true);

    let accumulatedDistance = 0;
    let acceptedPathCount = 0;

    const driftMeters = [1, 2, 3, 4, 5, 2, 1];
    for (let i = 0; i < driftMeters.length; i++) {
      const sample: GpsSample = {
        latitude: previous.latitude + metersToLatitude(driftMeters[i] ?? 0),
        longitude: previous.longitude,
        timestampMs: previous.timestampMs + 1000,
        speedMps: 0.3,
        accuracyMeters: 6,
      };

      const result = evaluateGpsSample(previous, sample, DEFAULT_GPS_FILTER_CONFIG);

      if (result.acceptedForDistance) {
        accumulatedDistance += result.distanceMeters;
      }
      if (result.acceptedForPath) {
        acceptedPathCount += 1;
      }

      previous = sample;
    }

    expect(accumulatedDistance).toBe(0);
    expect(acceptedPathCount).toBe(0);
  });

  it('accumulates distance for valid moving samples', () => {
    let previous: GpsSample = {
      latitude: 37.5,
      longitude: 127.0,
      timestampMs: 1_740_000_000_000,
      speedMps: 2.5,
      accuracyMeters: 5,
    };

    const stepsMeters = [6, 8, 10];
    let accumulatedDistance = 0;

    for (let i = 0; i < stepsMeters.length; i++) {
      const sample: GpsSample = {
        latitude: previous.latitude + metersToLatitude(stepsMeters[i] ?? 0),
        longitude: previous.longitude,
        timestampMs: previous.timestampMs + 2000,
        speedMps: 2.8,
        accuracyMeters: 5,
      };

      const result = evaluateGpsSample(previous, sample, DEFAULT_GPS_FILTER_CONFIG);
      expect(result.acceptedForDistance).toBe(true);
      expect(result.acceptedForPath).toBe(true);
      accumulatedDistance += result.distanceMeters;
      previous = sample;
    }

    expect(accumulatedDistance).toBeGreaterThan(20);
  });

  it('rejects low accuracy and speed spikes', () => {
    const previous: GpsSample = {
      latitude: 37.5,
      longitude: 127.0,
      timestampMs: 1_740_000_000_000,
      speedMps: 2.5,
      accuracyMeters: 5,
    };

    const lowAccuracySample: GpsSample = {
      latitude: 37.5001,
      longitude: 127.0,
      timestampMs: previous.timestampMs + 1000,
      speedMps: 2,
      accuracyMeters: 30,
    };

    const lowAccuracyResult = evaluateGpsSample(previous, lowAccuracySample, DEFAULT_GPS_FILTER_CONFIG);
    expect(lowAccuracyResult.acceptedForDistance).toBe(false);
    expect(lowAccuracyResult.acceptedForPath).toBe(false);
    expect(lowAccuracyResult.acceptedForPace).toBe(false);

    const speedSpikeSample: GpsSample = {
      latitude: 37.5 + metersToLatitude(50),
      longitude: 127.0,
      timestampMs: previous.timestampMs + 1000,
      speedMps: 20,
      accuracyMeters: 5,
    };

    const speedSpikeResult = evaluateGpsSample(previous, speedSpikeSample, DEFAULT_GPS_FILTER_CONFIG);
    expect(speedSpikeResult.acceptedForDistance).toBe(false);
    expect(speedSpikeResult.acceptedForPath).toBe(false);
    expect(speedSpikeResult.acceptedForPace).toBe(false);
  });
});
