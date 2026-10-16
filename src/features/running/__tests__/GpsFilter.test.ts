import {
  DEFAULT_GPS_FILTER_CONFIG,
  createInitialGpsFilterState,
  evaluateGpsSample,
  createGpsSample,
  reduceGpsSample,
  type GpsSample,
} from '~/features/running/services/gps/GpsFilter';

const metersToLatitude = (meters: number): number => meters / 111_111;

describe('GpsFilter', () => {
  const sampleAt = (meters: number, seconds: number, speedMps = 2): GpsSample => ({
    latitude: 37.5 + (meters / 6371000) * (180 / Math.PI),
    longitude: 127,
    timestampMs: 1_740_000_000_000 + seconds * 1000,
    speedMps,
    accuracyMeters: 5,
  });

  it('retains short movements until the distance anchor has moved enough', () => {
    const samples = [sampleAt(0, 0), sampleAt(2, 1), sampleAt(4, 2), sampleAt(6, 3), sampleAt(8, 4)];
    const replay = samples.reduce((acc, sample) => {
      const next = reduceGpsSample(acc.state, sample);
      return {
        state: next.nextState,
        distance: acc.distance + (next.result.acceptedForDistance ? next.result.distanceMeters : 0),
      };
    }, { state: createInitialGpsFilterState(), distance: 0 });

    expect(replay.distance).toBeCloseTo(8, 2);
  });

  it.each([
    { latitude: 91 },
    { longitude: -181 },
    { accuracyMeters: -1 },
    { accuracyMeters: Number.NaN },
  ])('rejects invalid coordinate metadata %p', (override) => {
    expect(evaluateGpsSample(null, { ...sampleAt(0, 0), ...override }).acceptedForPath).toBe(false);
  });

  it('rejects samples older than a short movement that has not yet been counted', () => {
    const first = reduceGpsSample(createInitialGpsFilterState(), sampleAt(0, 0));
    const short = reduceGpsSample(first.nextState, sampleAt(2, 2));
    const late = reduceGpsSample(short.nextState, sampleAt(6, 1));
    expect(late.result.reason).toBe('INVALID_TIMESTAMP');
    expect(late.nextState).toEqual(short.nextState);
  });

  it('keeps the sensor speed independent of coordinate noise', () => {
    const result = evaluateGpsSample(sampleAt(0, 0, 3), sampleAt(5, 1, 3));
    expect(result.speedMps).toBe(3);
  });

  it('rejects a future timestamp without poisoning the next valid measurement', () => {
    const first = reduceGpsSample(createInitialGpsFilterState(), sampleAt(0, 0));
    const future = reduceGpsSample(first.nextState, sampleAt(100, 100), DEFAULT_GPS_FILTER_CONFIG,
      sampleAt(0, 1).timestampMs);
    expect(future.result.reason).toBe('INVALID_TIMESTAMP');
    expect(future.nextState).toEqual(first.nextState);
    expect(reduceGpsSample(future.nextState, sampleAt(4, 2)).result.acceptedForDistance).toBe(true);
  });

  it('does not publish an impossible sensor speed on the first fix', () => {
    expect(evaluateGpsSample(null, sampleAt(0, 0, 30)).acceptedForPace).toBe(false);
  });

  it('discards an isolated jump and measures from the retained distance anchor', () => {
    const first = reduceGpsSample(createInitialGpsFilterState(), sampleAt(0, 0));
    const jump = reduceGpsSample(first.nextState, sampleAt(8, 1, 1.5));
    expect(jump.result.reason).toBe('JUMP_QUARANTINED');
    const recovered = reduceGpsSample(jump.nextState, sampleAt(4, 2));
    expect(recovered.result.distanceMeters).toBeCloseTo(4, 2);
  });

  it('does not count a relocated fix when the next sample confirms a stationary sensor', () => {
    const first = reduceGpsSample(createInitialGpsFilterState(), sampleAt(0, 0, 0));
    const jump = reduceGpsSample(first.nextState, sampleAt(8, 1, 0));
    const confirmed = reduceGpsSample(jump.nextState, sampleAt(8, 2, 0));
    expect(confirmed.result.acceptedForDistance).toBe(false);
    expect(confirmed.result.speedMps).toBe(0);
  });

  it.each([
    { speed: 0, hasSpeed: true, expected: 0 },
    { speed: 0, hasSpeed: false, expected: undefined },
    { speed: 0, expected: undefined },
    { speed: 3, expected: 3 },
  ])('normalizes native speed availability and legacy native builds: %p', ({ expected, ...speed }) => {
    expect(createGpsSample({
      timestamp: 1000,
      coords: { latitude: 37, longitude: 127, accuracy: 5, ...speed },
    }).speedMps).toBe(expected);
  });

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

  it('keeps default long-gap behavior unchanged', () => {
    const previous: GpsSample = {
      latitude: 37.5,
      longitude: 127.0,
      timestampMs: 1_740_000_000_000,
      speedMps: 2,
      accuracyMeters: 5,
    };

    const sampleAfterLongGap: GpsSample = {
      latitude: previous.latitude + metersToLatitude(80),
      longitude: previous.longitude,
      timestampMs: previous.timestampMs + 40_000,
      speedMps: 2,
      accuracyMeters: 5,
    };

    const result = evaluateGpsSample(
      previous,
      sampleAfterLongGap,
      DEFAULT_GPS_FILTER_CONFIG
    );

    expect(result.acceptedForDistance).toBe(false);
    expect(result.reason).toBe('TIME_GAP_TOO_LARGE');
  });

  it('allows Android background config to preserve normal running distance across update gaps', () => {
    const androidBackgroundConfig = {
      ...DEFAULT_GPS_FILTER_CONFIG,
      maxAccuracyMeters: 50,
      maxDeltaSeconds: 60,
    };
    let state = createInitialGpsFilterState();
    const firstSample: GpsSample = {
      latitude: 37.5,
      longitude: 127.0,
      timestampMs: 1_740_000_000_000,
      speedMps: 2,
      accuracyMeters: 35,
    };
    const secondSample: GpsSample = {
      latitude: firstSample.latitude + metersToLatitude(80),
      longitude: firstSample.longitude,
      timestampMs: firstSample.timestampMs + 40_000,
      speedMps: 2,
      accuracyMeters: 35,
    };

    state = reduceGpsSample(state, firstSample, androidBackgroundConfig).nextState;
    const { result } = reduceGpsSample(state, secondSample, androidBackgroundConfig);

    expect(result.acceptedForDistance).toBe(true);
    expect(result.distanceMeters).toBeGreaterThan(75);
    expect(result.reason).toBe('OK');
  });

  it('still rejects implausible speed spikes with Android background config', () => {
    const androidBackgroundConfig = {
      ...DEFAULT_GPS_FILTER_CONFIG,
      maxAccuracyMeters: 50,
      maxDeltaSeconds: 60,
    };
    const previous: GpsSample = {
      latitude: 37.5,
      longitude: 127.0,
      timestampMs: 1_740_000_000_000,
      speedMps: 2,
      accuracyMeters: 35,
    };
    const speedSpikeSample: GpsSample = {
      latitude: previous.latitude + metersToLatitude(1_000),
      longitude: previous.longitude,
      timestampMs: previous.timestampMs + 40_000,
      speedMps: 2,
      accuracyMeters: 35,
    };

    const result = evaluateGpsSample(previous, speedSpikeSample, androidBackgroundConfig);

    expect(result.acceptedForDistance).toBe(false);
    expect(result.reason).toBe('SPEED_TOO_FAST');
  });
});
