import { act, renderHook } from '@testing-library/react-native';
import { useRunningStats } from '~/features/running/viewmodels/hooks/useRunningStats';

describe('useRunningStats', () => {
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
});
