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

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Location, RunningRecordItem } from '../../models';
import { createRunningRecordItem } from '../../models';
import type { RunningStats, UseRunningSegmentsReturn } from './types';

interface UseRunningSegmentsProps {
  statsRef: React.MutableRefObject<RunningStats>;
}

export const useRunningSegments = ({
  statsRef,
}: UseRunningSegmentsProps): UseRunningSegmentsReturn => {
  // Segment state
  const [currentSegmentItems, setCurrentSegmentItems] = useState<RunningRecordItem[]>([]);
  const [segmentStartTime, setSegmentStartTime] = useState<number | null>(null);
  const [segmentDistance, setSegmentDistance] = useState<number>(0);
  const [segmentLocations, setSegmentLocations] = useState<Location[]>([]);
  const [, setSegmentIdCounter] = useState<number>(1);

  // Refs for synchronous access in callbacks (closure stale value 방지)
  const segmentItemsRef = useRef<RunningRecordItem[]>(currentSegmentItems);
  const segmentStartTimeRef = useRef<number | null>(segmentStartTime);

  // Sync refs with state
  useEffect(() => {
    segmentItemsRef.current = currentSegmentItems;
  }, [currentSegmentItems]);

  useEffect(() => {
    segmentStartTimeRef.current = segmentStartTime;
  }, [segmentStartTime]);

  /**
   * 세그먼트 생성 (iOS createSegment 대응)
   * 10미터마다 호출
   */
  const createSegment = useCallback(
    (distance: number, locations: Location[], startTime: number) => {
      const now = Date.now();
      const segmentDuration = (now - startTime) / 1000; // seconds
      const currentStats = statsRef.current;

      // Race condition 방지: segmentIdCounter 읽기 + 증가를 원자적으로 처리
      setSegmentIdCounter((currentId) => {
        const segmentId = currentId;

        setCurrentSegmentItems((prev) => {
          const segmentCalories = Math.round(
            (currentStats.calories || 0) / Math.max(1, prev.length + 1)
          );

          const newSegment = createRunningRecordItem({
            id: segmentId,
            distance: distance,
            cadence: currentStats.cadence ?? null,
            heartRate: currentStats.bpm ?? null,
            calories: segmentCalories,
            orderIndex: segmentId - 1,
            durationSec: segmentDuration,
            startTimestamp: startTime / 1000, // Unix timestamp in seconds
            locations: locations,
          });

          console.log(
            `[useRunningSegments] Segment created: #${prev.length + 1}, ID=${segmentId}, ${distance}m`
          );
          return [...prev, newSegment];
        });

        return currentId + 1;
      });

      // 다음 세그먼트를 위한 초기화
      setSegmentStartTime(now);
      setSegmentDistance(0);
      setSegmentLocations([]);
    },
    [statsRef]
  );

  /**
   * 최종 세그먼트 생성 (iOS finalizeCurrentSegment 대응)
   * 러닝 종료 시 10m 미만이라도 저장
   * NOTE: ref도 동기적으로 업데이트하여 endRunning에서 즉시 참조 가능
   */
  const finalizeCurrentSegment = useCallback(() => {
    const currentSegmentStartTime = segmentStartTimeRef.current;

    if (segmentDistance > 0 && currentSegmentStartTime !== null) {
      const now = Date.now();
      const segmentDuration = (now - currentSegmentStartTime) / 1000;
      const currentStats = statsRef.current;
      const currentItems = segmentItemsRef.current;

      const segmentId = currentItems.length + 1;
      const segmentCalories = Math.round(
        (currentStats.calories || 0) / Math.max(1, currentItems.length + 1)
      );

      const finalSegment = createRunningRecordItem({
        id: segmentId,
        distance: segmentDistance,
        cadence: currentStats.cadence ?? null,
        heartRate: currentStats.bpm ?? null,
        calories: segmentCalories,
        orderIndex: segmentId - 1,
        durationSec: segmentDuration,
        startTimestamp: currentSegmentStartTime / 1000,
        locations: segmentLocations,
      });

      console.log(
        `[useRunningSegments] Final segment created: ID=${segmentId}, ${segmentDistance}m`
      );

      // ref를 먼저 업데이트 (동기) -> endRunning에서 즉시 참조 가능
      const newItems = [...currentItems, finalSegment];
      segmentItemsRef.current = newItems;

      // state도 업데이트 (비동기) -> UI 반영용
      setCurrentSegmentItems(newItems);
      setSegmentIdCounter(segmentId + 1);
    }
  }, [segmentDistance, segmentLocations, statsRef]);

  /**
   * 세그먼트 추적 초기화 (iOS initializeSegmentTracking 대응)
   */
  const initializeSegmentTracking = useCallback(() => {
    const now = Date.now();
    setSegmentStartTime(now);
    segmentStartTimeRef.current = now;
    setSegmentDistance(0);
    setSegmentLocations([]);
    setCurrentSegmentItems([]);
    segmentItemsRef.current = [];
    setSegmentIdCounter(1);
    console.log('[useRunningSegments] Segment tracking initialized');
  }, []);

  /**
   * 거리 업데이트 처리 및 세그먼트 생성 여부 판단
   * @returns true if a new segment was created
   */
  const processDistanceUpdate = useCallback(
    (distanceDelta: number, newLocations: Location[], threshold: number): boolean => {
      if (distanceDelta <= 0) return false;

      const newSegmentDistance = segmentDistance + distanceDelta;
      setSegmentDistance(newSegmentDistance);
      setSegmentLocations((prev) => [...prev, ...newLocations]);

      const currentSegmentStartTime = segmentStartTimeRef.current;

      // threshold 달성 시 세그먼트 생성
      if (newSegmentDistance >= threshold && currentSegmentStartTime !== null) {
        createSegment(newSegmentDistance, [...segmentLocations, ...newLocations], currentSegmentStartTime);
        return true;
      }

      return false;
    },
    [segmentDistance, segmentLocations, createSegment]
  );

  /**
   * 세그먼트 데이터 초기화
   */
  const resetSegments = useCallback(() => {
    setCurrentSegmentItems([]);
    segmentItemsRef.current = [];
    setSegmentStartTime(null);
    segmentStartTimeRef.current = null;
    setSegmentDistance(0);
    setSegmentLocations([]);
    setSegmentIdCounter(1);
    console.log('[useRunningSegments] Segments reset');
  }, []);

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
