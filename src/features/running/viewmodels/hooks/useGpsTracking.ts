/**
 * useGpsTracking Hook
 *
 * Active 러닝 세션의 tracking SSOT를 담당하는 hook
 *
 * 정책:
 * - active 화면의 live source는 foreground GPS 하나만 사용
 * - background tracking은 앱이 background일 때만 수집 경로로 사용
 * - foreground/background handoff와 snapshot 관리는 coordinator 한 곳에서 수행
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import type { Location } from '../../models';
import { RunningTrackingCoordinator } from '../../services/RunningTrackingCoordinator';
import type { UseGpsTrackingProps, UseGpsTrackingReturn } from './types';

const SEGMENT_DISTANCE_THRESHOLD = 10.0;

export const useGpsTracking = ({
  segmentStartTimeRef,
  statsRef: _statsRef,
  onSegmentCreate,
  onDistanceUpdate,
  onAutoPause,
}: Omit<UseGpsTrackingProps, 'runningState'>): UseGpsTrackingReturn => {
  const runningState = useAppStore((state) => state.runningState);
  const coordinatorRef = useRef<RunningTrackingCoordinator | null>(null);
  const runningStateRef = useRef(runningState);
  const previousDistanceRef = useRef(0);
  const lastProcessedLocationCountRef = useRef(0);
  const currentSegmentDistanceRef = useRef(0);
  const currentSegmentLocationsRef = useRef<Location[]>([]);
  const previousSourceRef = useRef<'idle' | 'foreground' | 'background'>('idle');

  if (!coordinatorRef.current) {
    coordinatorRef.current = new RunningTrackingCoordinator(AppState.currentState);
  }

  const [snapshot, setSnapshot] = useState(() => coordinatorRef.current!.getSnapshot());

  useEffect(() => {
    const coordinator = coordinatorRef.current!;
    return coordinator.subscribe((nextSnapshot) => {
      const previousSource = previousSourceRef.current;
      const sourceChanged = previousSource !== nextSnapshot.source;

      const appendSegmentProgress = (distanceDelta: number, newLocations: Location[]) => {
        if (newLocations.length > 0) {
          currentSegmentLocationsRef.current.push(...newLocations);
        }

        if (distanceDelta <= 0) {
          return;
        }

        currentSegmentDistanceRef.current += distanceDelta;
        onDistanceUpdate(distanceDelta, newLocations);

        const currentSegmentStartTime = segmentStartTimeRef.current;
        if (
          currentSegmentDistanceRef.current >= SEGMENT_DISTANCE_THRESHOLD &&
          currentSegmentStartTime !== null
        ) {
          onSegmentCreate(
            currentSegmentDistanceRef.current,
            currentSegmentLocationsRef.current,
            currentSegmentStartTime
          );
          currentSegmentDistanceRef.current = 0;
          currentSegmentLocationsRef.current = [];
        }
      };

      if (sourceChanged) {
        if (
          previousSource === 'background' &&
          nextSnapshot.source === 'foreground' &&
          runningStateRef.current === RunningState.Running
        ) {
          const handoffDistanceDelta = nextSnapshot.distance - previousDistanceRef.current;
          const handoffLocations = nextSnapshot.locations.slice(lastProcessedLocationCountRef.current);
          appendSegmentProgress(handoffDistanceDelta, handoffLocations);
        } else {
          currentSegmentDistanceRef.current = 0;
          currentSegmentLocationsRef.current = [];
        }

        previousDistanceRef.current = nextSnapshot.distance;
        lastProcessedLocationCountRef.current = nextSnapshot.locations.length;
        previousSourceRef.current = nextSnapshot.source;
      } else if (nextSnapshot.distance < previousDistanceRef.current) {
        previousDistanceRef.current = nextSnapshot.distance;
        lastProcessedLocationCountRef.current = nextSnapshot.locations.length;
        currentSegmentDistanceRef.current = 0;
        currentSegmentLocationsRef.current = [];
      }

      if (
        nextSnapshot.source === 'foreground' &&
        runningStateRef.current === RunningState.Running
      ) {
        const distanceDelta = nextSnapshot.distance - previousDistanceRef.current;
        const newLocations = nextSnapshot.locations.slice(lastProcessedLocationCountRef.current);

        if (newLocations.length > 0) {
          lastProcessedLocationCountRef.current = nextSnapshot.locations.length;
        }

        appendSegmentProgress(distanceDelta, newLocations);
        previousDistanceRef.current = nextSnapshot.distance;
      }

      setSnapshot(nextSnapshot);
    });
  }, [onDistanceUpdate, onSegmentCreate, segmentStartTimeRef]);

  useEffect(() => {
    runningStateRef.current = runningState;
    coordinatorRef.current?.setRunningState(runningState);
  }, [runningState]);

  useEffect(() => {
    const coordinator = coordinatorRef.current!;
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      void coordinator.handleAppStateChange(nextAppState).then((result) => {
        if (result?.autoPaused) {
          onAutoPause?.();
        }
      });
    });

    return () => {
      subscription.remove();
      coordinator.destroy();
    };
  }, [onAutoPause]);

  const startGpsTracking = useCallback(async (recordId: number) => {
    await coordinatorRef.current!.startSession(recordId);
    console.log('[useGpsTracking] Tracking session started');
  }, []);

  const stopGpsTracking = useCallback(async () => {
    const result = await coordinatorRef.current!.stopSession();
    console.log('[useGpsTracking] Tracking session stopped');
    return result;
  }, []);

  const pauseGpsTracking = useCallback(() => {
    coordinatorRef.current?.pauseSession();
    console.log('[useGpsTracking] Tracking session paused');
  }, []);

  const resumeGpsTracking = useCallback(() => {
    coordinatorRef.current?.resumeSession();
    console.log('[useGpsTracking] Tracking session resumed');
  }, []);

  const resetGpsTracking = useCallback(() => {
    coordinatorRef.current?.resetSession();
    previousDistanceRef.current = 0;
    lastProcessedLocationCountRef.current = 0;
    currentSegmentDistanceRef.current = 0;
    currentSegmentLocationsRef.current = [];
    previousSourceRef.current = 'idle';
    console.log('[useGpsTracking] Tracking session reset');
  }, []);

  return {
    distance: snapshot.distance,
    locations: snapshot.locations,
    trackingData: snapshot.trackingData,
    useBackgroundMode: snapshot.source === 'background',
    latestPaceSignal: snapshot.latestPaceSignal,
    startGpsTracking,
    stopGpsTracking,
    pauseGpsTracking,
    resumeGpsTracking,
    resetGpsTracking,
  };
};
