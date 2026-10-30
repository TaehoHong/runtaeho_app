/**
 * useRunningSegments Hook
 *
 * 10m 단위 세그먼트 관리를 담당하는 hook
 * iOS createSegment, finalizeCurrentSegment, initializeSegmentTracking 대응
 *
 * 책임:
 * - 세그먼트 생성 (10m마다)
 * - 최종 세그먼트 저장 (러닝 종료 시)
 * - 세그먼트 추적 초기화/리셋
 */

import { useCallback, useRef, useState } from 'react';
import type { Location, RunningRecordItem } from '../../models';
import { createRunningRecordItem } from '../../models';
import type { RunningStats, UseRunningSegmentsReturn } from './types';

interface UseRunningSegmentsProps {
  statsRef: React.MutableRefObject<RunningStats>;
  getActiveElapsedMs?: () => number;
}

export const useRunningSegments = ({
  statsRef,
  getActiveElapsedMs,
}: UseRunningSegmentsProps): UseRunningSegmentsReturn => {
  // Segment state
  const [currentSegmentItems, setCurrentSegmentItems] = useState<RunningRecordItem[]>([]);
  const [segmentDistance, setSegmentDistanceState] = useState<number>(0);
  const [segmentLocations, setSegmentLocationsState] = useState<Location[]>([]);

  // Completion reads these refs before React can render the final GPS drain.
  const segmentItemsRef = useRef<RunningRecordItem[]>([]);
  const segmentStartTimeRef = useRef<number | null>(null);
  const segmentDistanceRef = useRef(0);
  const segmentLocationsRef = useRef<Location[]>([]);
  const segmentActiveStartRef = useRef<number | null>(null);

  const setSegmentDistance = useCallback<React.Dispatch<React.SetStateAction<number>>>((value) => {
    segmentDistanceRef.current = typeof value === 'function' ? value(segmentDistanceRef.current) : value;
    setSegmentDistanceState(segmentDistanceRef.current);
  }, []);

  const setSegmentLocations = useCallback<React.Dispatch<React.SetStateAction<Location[]>>>((value) => {
    segmentLocationsRef.current = typeof value === 'function' ? value(segmentLocationsRef.current) : value;
    setSegmentLocationsState(segmentLocationsRef.current);
  }, []);

  /**
   * 세그먼트 생성 (iOS createSegment 대응)
   * 10미터마다 호출
   */
  const createSegment = useCallback(
    (distance: number, locations: Location[], startTime: number, now = Date.now()) => {
      const activeNow = getActiveElapsedMs?.();
      const segmentDuration = activeNow !== undefined && segmentActiveStartRef.current !== null
        ? Math.max(0, activeNow - segmentActiveStartRef.current) / 1000
        : (now - startTime) / 1000; // seconds
      const currentStats = statsRef.current;

      const currentItems = segmentItemsRef.current;
      const segmentId = currentItems.length + 1;
      const newSegment = createRunningRecordItem({
        id: segmentId,
        distance,
        cadence: currentStats.cadence ?? null,
        heartRate: currentStats.bpm ?? null,
        calories: Math.round((currentStats.calories || 0) / segmentId),
        orderIndex: segmentId - 1,
        durationSec: segmentDuration,
        endTimestamp: now / 1000,
        startTimestamp: startTime / 1000,
        locations,
      });
      segmentItemsRef.current = [...currentItems, newSegment];
      setCurrentSegmentItems(segmentItemsRef.current);

      console.log(`[useRunningSegments] Segment created: ID=${segmentId}, ${distance}m`);

      // 다음 세그먼트를 위한 초기화
      segmentStartTimeRef.current = now;
      segmentActiveStartRef.current = activeNow ?? null;
      setSegmentDistance(0);
      setSegmentLocations([]);
    },
    [statsRef, getActiveElapsedMs, setSegmentDistance, setSegmentLocations]
  );

  /**
   * 최종 세그먼트 생성 (iOS finalizeCurrentSegment 대응)
   * 러닝 종료 시 10m 미만이라도 저장
   * NOTE: ref도 동기적으로 업데이트하여 endRunning에서 즉시 참조 가능
   */
  const finalizeCurrentSegment = useCallback((endedAt?: number) => {
    const currentSegmentStartTime = segmentStartTimeRef.current;

    if (segmentDistanceRef.current > 0 && currentSegmentStartTime !== null) {
      createSegment(segmentDistanceRef.current, segmentLocationsRef.current, currentSegmentStartTime, endedAt);
      segmentStartTimeRef.current = null;
      segmentActiveStartRef.current = null;
    }
  }, [createSegment]);

  /**
   * 세그먼트 추적 초기화 (iOS initializeSegmentTracking 대응)
   */
  const initializeSegmentTracking = useCallback(() => {
    const now = Date.now();
    segmentActiveStartRef.current = getActiveElapsedMs?.() ?? null;
    segmentStartTimeRef.current = now;
    setSegmentDistance(0);
    setSegmentLocations([]);
    setCurrentSegmentItems([]);
    segmentItemsRef.current = [];
    console.log('[useRunningSegments] Segment tracking initialized');
  }, [getActiveElapsedMs, setSegmentDistance, setSegmentLocations]);

  /**
   * 거리 업데이트 처리 및 세그먼트 생성 여부 판단
   * @returns true if a new segment was created
   */
  const processDistanceUpdate = useCallback(
    (distanceDelta: number, newLocations: Location[], threshold: number): boolean => {
      if (distanceDelta <= 0) return false;

      const newSegmentDistance = segmentDistanceRef.current + distanceDelta;
      setSegmentDistance(newSegmentDistance);
      setSegmentLocations((prev) => [...prev, ...newLocations]);

      const currentSegmentStartTime = segmentStartTimeRef.current;

      // threshold 달성 시 세그먼트 생성
      if (newSegmentDistance >= threshold && currentSegmentStartTime !== null) {
        createSegment(newSegmentDistance, segmentLocationsRef.current, currentSegmentStartTime);
        return true;
      }

      return false;
    },
    [createSegment, setSegmentDistance, setSegmentLocations]
  );

  /**
   * 세그먼트 데이터 초기화
   */
  const resetSegments = useCallback(() => {
    setCurrentSegmentItems([]);
    segmentItemsRef.current = [];
    segmentStartTimeRef.current = null;
    segmentActiveStartRef.current = null;
    setSegmentDistance(0);
    setSegmentLocations([]);
    console.log('[useRunningSegments] Segments reset');
  }, [setSegmentDistance, setSegmentLocations]);

  return {
    // State
    currentSegmentItems,
    segmentDistance,
    segmentLocations,

    // Refs
    segmentItemsRef,
    segmentStartTimeRef,

    // Actions
    createSegment,
    finalizeCurrentSegment,
    initializeSegmentTracking,
    processDistanceUpdate,
    resetSegments,
    setSegmentDistance,
    setSegmentLocations,
  };
};
