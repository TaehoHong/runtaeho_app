import { act, renderHook } from '@testing-library/react-native';
import { useRunningStats } from '~/features/running/viewmodels/hooks/useRunningStats';

describe('useRunningStats', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('updates running stats with distance and elapsed time', () => {
    const { result } = renderHook(() => useRunningStats());

    act(() => {
      result.current.updateStats(1000, 300, 150, 170);
    });

    expect(result.current.stats.bpm).toBe(150);
    expect(result.current.stats.cadence).toBe(170);
    expect(result.current.stats.pace.totalSeconds).toBe(300);
    expect(result.current.stats.speed).toBeCloseTo(12, 5);
  });

  it('resets stats and elapsed time', () => {
    const { result } = renderHook(() => useRunningStats());

    act(() => {
      result.current.setElapsedTime(123);
      result.current.updateStats(1000, 123, 120, 160);
    });

    act(() => {
      result.current.resetStats();
    });

    expect(result.current.elapsedTime).toBe(0);
    expect(result.current.stats.speed).toBe(0);
    expect(result.current.stats.bpm).toBeUndefined();
  });

  it('fuses distance and pace signal for instant pace, then hides pace during stationary period', () => {
    const { result } = renderHook(() => useRunningStats());

    act(() => {
      result.current.updateStats(0, 1, undefined, undefined, {
        timestampMs: Date.now(),
        speedMps: 3.0,
        accuracyMeters: 5,
        distanceDeltaMeters: 0,
      });
    });

    act(() => {
      jest.advanceTimersByTime(1000);
      result.current.updateStats(3, 2, undefined, undefined, {
        timestampMs: Date.now(),
        speedMps: 3.0,
        accuracyMeters: 5,
        distanceDeltaMeters: 3,
      });
    });

    expect(result.current.stats.instantPace.totalSeconds).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(1000);
      result.current.updateStats(3, 3, undefined, undefined, {
        timestampMs: Date.now(),
        speedMps: 0.2,
        accuracyMeters: 5,
        distanceDeltaMeters: 0,
      });
    });
    act(() => {
      jest.advanceTimersByTime(1000);
      result.current.updateStats(3, 4, undefined, undefined, {
        timestampMs: Date.now(),
        speedMps: 0.2,
        accuracyMeters: 5,
        distanceDeltaMeters: 0,
      });
    });
    act(() => {
      jest.advanceTimersByTime(1000);
      result.current.updateStats(3, 5, undefined, undefined, {
        timestampMs: Date.now(),
        speedMps: 0.2,
        accuracyMeters: 5,
        distanceDeltaMeters: 0,
      });
    });

    expect(result.current.stats.instantPace.totalSeconds).toBe(0);
  });
});
