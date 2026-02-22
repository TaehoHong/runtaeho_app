import {
  createInitialPaceFusionState,
  DEFAULT_PACE_FUSION_CONFIG,
  fuseInstantPace,
} from '~/features/running/services/gps/PaceFusion';

describe('PaceFusion', () => {
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

  it('returns -- pace after 3s stationary and recovers after 2 moving samples', () => {
    let state = createInitialPaceFusionState();
    let nowMs = 1_740_000_000_000;

    for (let i = 0; i < 3; i++) {
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

    let stationaryPace = 999;
    for (let i = 0; i < 3; i++) {
      const result = fuseInstantPace(
        {
          distanceWindowSpeedMps: 0,
          paceSignal: { timestampMs: nowMs, speedMps: 0.2, accuracyMeters: 5 },
          nowMs,
        },
        state,
        DEFAULT_PACE_FUSION_CONFIG
      );
      state = result.nextState;
      stationaryPace = result.pace.totalSeconds;
      nowMs += 1000;
    }

    expect(stationaryPace).toBe(0);

    let resumedPace = 0;
    for (let i = 0; i < 2; i++) {
      const result = fuseInstantPace(
        {
          distanceWindowSpeedMps: 2.8,
          paceSignal: { timestampMs: nowMs, speedMps: 2.8, accuracyMeters: 5 },
          nowMs,
        },
        state,
        DEFAULT_PACE_FUSION_CONFIG
      );
      state = result.nextState;
      resumedPace = result.pace.totalSeconds;
      nowMs += 1000;
    }

    expect(resumedPace).toBeGreaterThan(0);
  });
});
