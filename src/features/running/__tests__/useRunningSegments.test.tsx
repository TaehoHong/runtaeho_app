import { toSegmentPayload } from '../services/segmentPayload';
import { act, renderHook } from '@testing-library/react-native';
import type { MutableRefObject } from 'react';
import { useRunningSegments } from '~/features/running/viewmodels/hooks/useRunningSegments';
import type { RunningStats } from '~/features/running/viewmodels/hooks/types';
import type { Location } from '~/features/running/models';

const createStatsRef = (): MutableRefObject<RunningStats> => ({
  current: {
    bpm: 150,
    cadence: 170,
    pace: { minutes: 5, seconds: 0, totalSeconds: 300 },
    instantPace: { minutes: 4, seconds: 45, totalSeconds: 285 },
    speed: 12,
    calories: 100,
  },
});

const createLocation = (offset = 0): Location => ({
  latitude: 37.5 + offset,
  longitude: 127.0 + offset,
  timestamp: new Date('2025-01-01T00:00:00.000Z'),
  speed: 2.5,
  altitude: 20,
  accuracy: 5,
});

describe('useRunningSegments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('RUN-SEG-001 creates a segment when threshold distance is reached', () => {
    const statsRef = createStatsRef();
    const { result } = renderHook(() => useRunningSegments({ statsRef }));

    act(() => {
      result.current.initializeSegmentTracking();
    });

    act(() => {
      const created = result.current.processDistanceUpdate(12, [createLocation()], 10);
      expect(created).toBe(true);
    });

    expect(result.current.currentSegmentItems).toHaveLength(1);
    expect(result.current.currentSegmentItems[0]?.distance).toBe(12);
    expect(result.current.segmentDistance).toBe(0);
    expect(result.current.segmentLocations).toHaveLength(0);
    expect(result.current.currentSegmentItems[0]?.cadence).toBe(170);
    expect(result.current.currentSegmentItems[0]?.heartRate).toBe(150);
  });

  it('RUN-SEG-002 does not create a segment for non-positive distance delta', () => {
    const statsRef = createStatsRef();
    const { result } = renderHook(() => useRunningSegments({ statsRef }));

    act(() => {
      result.current.initializeSegmentTracking();
    });

    act(() => {
      const created = result.current.processDistanceUpdate(0, [createLocation()], 10);
      expect(created).toBe(false);
    });

    expect(result.current.currentSegmentItems).toHaveLength(0);
    expect(result.current.segmentDistance).toBe(0);
    expect(result.current.segmentLocations).toHaveLength(0);
  });

  it('RUN-SEG-003 finalizes remaining segment and resets all segment state', () => {
    const statsRef = createStatsRef();
    const { result } = renderHook(() => useRunningSegments({ statsRef }));

    act(() => {
      result.current.initializeSegmentTracking();
      result.current.setSegmentDistance(5);
      result.current.setSegmentLocations([createLocation(0.001)]);
    });

    act(() => {
      result.current.finalizeCurrentSegment();
    });

    expect(result.current.currentSegmentItems).toHaveLength(1);
    expect(result.current.currentSegmentItems[0]?.distance).toBe(5);
    expect(result.current.currentSegmentItems[0]?.locations).toHaveLength(1);
    act(() => result.current.finalizeCurrentSegment());
    expect(result.current.currentSegmentItems).toHaveLength(1);

    act(() => {
      result.current.resetSegments();
    });

    expect(result.current.currentSegmentItems).toHaveLength(0);
    expect(result.current.segmentDistance).toBe(0);
    expect(result.current.segmentStartTimeRef.current).toBeNull();
    expect(result.current.segmentLocations).toHaveLength(0);
  });
  it('uses active duration while preserving wall-clock end and GPS timestamps', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(100000);
    let activeMs = 0;
    const location = createLocation();
    const { result } = renderHook(() => useRunningSegments({ statsRef: createStatsRef(), getActiveElapsedMs: () => activeMs }));
    act(() => result.current.initializeSegmentTracking());
    now.mockReturnValue(170000);
    activeMs = 10000;
    act(() => { result.current.processDistanceUpdate(12, [location], 10); });
    const item = result.current.currentSegmentItems[0]!;
    expect(item.durationSec).toBe(10);
    expect(item.startTimestamp).toBe(100);
    expect(item.endTimestamp).toBe(170);
    expect(toSegmentPayload(item).endTimeStamp).toBe(170);
    expect(toSegmentPayload(item).gpsPoints[0]?.timestampMs).toBe(1735689600000);
    now.mockRestore();
  });

});
