import {
  createInitialPaceFusionState,
  DEFAULT_PACE_FUSION_CONFIG,
  fuseInstantPace,
  calculateDistanceWindowSpeed,
} from '~/features/running/services/gps/PaceFusion';

describe('PaceFusion', () => {
  const start = 1_740_000_000_000;
  const tick = (state: ReturnType<typeof createInitialPaceFusionState>, seconds: number, speed: number,
    timestampSeconds = seconds, distanceSpeed = speed) => fuseInstantPace({
    nowMs: start + seconds * 1000,
    distanceWindowSpeedMps: distanceSpeed,
    paceSignal: { timestampMs: start + timestampSeconds * 1000, speedMps: speed, accuracyMeters: 5 },
  }, state);

  it('expires a cached speed after five seconds instead of continuing to display it', () => {
    const moving = tick(createInitialPaceFusionState(), 0, 3);
    const stale = tick(moving.nextState, 5, 3, 0, 0);
    expect(stale.pace.totalSeconds).toBe(0);
    expect(stale.isStationary).toBe(false);
  });

  it('uses fresh sensor speed without averaging in a noisy distance speed', () => {
    expect(tick(createInitialPaceFusionState(), 0, 3, 0, 6).pace.totalSeconds).toBe(333);
  });

  it('does not repeatedly smooth or count a cached sample', () => {
    const moving = tick(createInitialPaceFusionState(), 0, 2.5);
    const accelerated = tick(moving.nextState, 1, 4);
    const repeated = tick(accelerated.nextState, 1.5, 4, 1);
    expect(repeated.pace).toEqual(accelerated.pace);
    expect(repeated.fusedSpeedMps).toBe(accelerated.fusedSpeedMps);
  });

  it('uses the distance fallback when the speed accuracy is insufficient', () => {
    const result = fuseInstantPace({
      nowMs: start,
      distanceWindowSpeedMps: 3,
      paceSignal: { timestampMs: start, speedMps: 6, speedAccuracyMps: 2 },
    }, createInitialPaceFusionState());
    expect(result.pace.totalSeconds).toBe(333);
  });

  it('does not let unusable new signals keep an old speed alive', () => {
    let state = tick(createInitialPaceFusionState(), 0, 3).nextState;
    for (let seconds = 1; seconds <= 5; seconds++) {
      state = fuseInstantPace({
        nowMs: start + seconds * 1000,
        distanceWindowSpeedMps: null,
        paceSignal: { timestampMs: start + seconds * 1000 },
      }, state).nextState;
    }
    expect(state.lastPaceSecondsPerKm).toBeNull();
    expect(state.isStationary).toBe(false);
  });

  it('smooths according to elapsed measurement time', () => {
    const initial = tick(createInitialPaceFusionState(), 0, 3).nextState;
    const once = tick(initial, 1, 3.2);
    const half = tick(initial, 0.5, 3.2);
    const twice = tick(half.nextState, 1, 3.2);
    expect(once.fusedSpeedMps).toBeCloseTo(twice.fusedSpeedMps, 6);
  });

  it.each([[2.5, 4], [4, 2.5]])('converges from %s to %s m/s within five measurements', (from, to) => {
    let state = tick(createInitialPaceFusionState(), 0, from).nextState;
    for (let seconds = 1; seconds <= 5; seconds++) state = tick(state, seconds, to).nextState;
    expect(Math.abs((state.lastPaceSecondsPerKm ?? 0) - 1000 / to)).toBeLessThan(15);
  });

  it('requires three seconds of real distance measurements for fallback', () => {
    const samples = [{ timestamp: start, distance: 0 }, { timestamp: start + 1000, distance: 3 }];
    expect(calculateDistanceWindowSpeed(samples, start + 1000)).toBeNull();
    samples.push({ timestamp: start + 3000, distance: 9 });
    expect(calculateDistanceWindowSpeed(samples, start + 3000)).toBe(3);
    expect(calculateDistanceWindowSpeed(samples, start + 9000)).toBeNull();
  });

  it("converges to around 5'30/km within ±10 sec", () => {
    const targetPaceSec = 330;
    const targetSpeedMps = 1000 / targetPaceSec;

    let state = createInitialPaceFusionState();
    let nowMs = 1_740_000_000_000;
    let lastPaceSec = 0;

    for (let i = 0; i < 12; i++) {
      const result = fuseInstantPace(
        {
          distanceWindowSpeedMps: targetSpeedMps,
          paceSignal: {
            timestampMs: nowMs,
            speedMps: targetSpeedMps,
            accuracyMeters: 5,
          },
          nowMs,
        },
        state,
        DEFAULT_PACE_FUSION_CONFIG
      );

      state = result.nextState;
      lastPaceSec = result.pace.totalSeconds;
      nowMs += 1000;
    }

    expect(lastPaceSec).toBeGreaterThanOrEqual(targetPaceSec - 10);
    expect(lastPaceSec).toBeLessThanOrEqual(targetPaceSec + 10);
  });

  it('adapts to acceleration/deceleration within 3-5 seconds', () => {
    let state = createInitialPaceFusionState();
    let nowMs = 1_740_000_000_000;

    for (let i = 0; i < 5; i++) {
      const result = fuseInstantPace(
        {
          distanceWindowSpeedMps: 2.5,
          paceSignal: { timestampMs: nowMs, speedMps: 2.5, accuracyMeters: 5 },
          nowMs,
        },
        state,
        DEFAULT_PACE_FUSION_CONFIG
      );
      state = result.nextState;
      nowMs += 1000;
    }

    let accelerated = 0;
    for (let i = 0; i < 5; i++) {
      const result = fuseInstantPace(
        {
          distanceWindowSpeedMps: 4.0,
          paceSignal: { timestampMs: nowMs, speedMps: 4.0, accuracyMeters: 5 },
          nowMs,
        },
        state,
        DEFAULT_PACE_FUSION_CONFIG
      );
      state = result.nextState;
      accelerated = result.pace.totalSeconds;
      nowMs += 1000;
    }

    const targetAcceleratedPace = Math.round(1000 / 4.0);
    expect(accelerated).toBeGreaterThanOrEqual(targetAcceleratedPace - 25);
    expect(accelerated).toBeLessThanOrEqual(targetAcceleratedPace + 25);
  });


});
