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

  it('does not turn repeated UI ticks into new distance measurements and expires cached pace', () => {
    const { result } = renderHook(() => useRunningStats());
    const signal = { timestampMs: Date.now(), speedMps: 3, distanceMeters: 0 };
    act(() => result.current.updateStats(0, 1, undefined, undefined, signal));
    for (let seconds = 1; seconds <= 5; seconds++) {
      act(() => {
        jest.advanceTimersByTime(1000);
        result.current.updateStats(0, seconds + 1, undefined, undefined, signal);
      });
    }
    expect(result.current.paceSnapshotsRef.current).toHaveLength(1);
    expect(result.current.stats.instantPace.totalSeconds).toBe(0);
  });

  it('uses measurement distance even when the display total has not caught up', () => {
    const { result } = renderHook(() => useRunningStats());
    for (let seconds = 0; seconds <= 3; seconds++) {
      act(() => {
        if (seconds > 0) jest.advanceTimersByTime(1000);
        result.current.updateStats(0, seconds + 1, undefined, undefined, {
          timestampMs: Date.now(), distanceMeters: seconds * 3,
        });
      });
    }
    expect(result.current.stats.instantPace.totalSeconds).toBe(333);
  });

  it('clears pace history on a source transition without losing overall stats', () => {
    const { result } = renderHook(() => useRunningStats());
    act(() => result.current.updateStats(100, 30, undefined, undefined, {
      timestampMs: Date.now(), speedMps: 3, distanceMeters: 100,
    }));
    act(() => result.current.resetInstantPace());
    expect(result.current.stats.pace.totalSeconds).toBe(300);
    expect(result.current.stats.instantPace.totalSeconds).toBe(0);
    act(() => {
      jest.advanceTimersByTime(1000);
      result.current.updateStats(400, 31, undefined, undefined, {
        timestampMs: Date.now(), distanceMeters: 400,
      });
    });
    expect(result.current.stats.instantPace.totalSeconds).toBe(0);
    expect(result.current.paceSnapshotsRef.current).toHaveLength(1);
  });
});
