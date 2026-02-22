/**
 * useGpsTracking Hook
 *
 * GPS 추적을 담당하는 hook
 * 포그라운드/백그라운드 모드 지원
 *
 * 책임:
 * - 포그라운드 GPS 추적 (LocationService)
 * - 백그라운드 GPS 추적 (BackgroundTaskService + polling)
 * - 거리/위치 상태 관리
 * - 앱 상태 변경 처리 (포그라운드/백그라운드 전환)
 */

import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { Location } from '../../models';
import { locationService, type LocationTrackingData } from '../../services/LocationService';
import { backgroundTaskService } from '../../services/BackgroundTaskService';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import type { PaceSignal, UseGpsTrackingProps, UseGpsTrackingReturn } from './types';

const SEGMENT_DISTANCE_THRESHOLD = 10.0; // 10미터마다 세그먼트 생성

export const useGpsTracking = ({
  segmentStartTimeRef,
  statsRef,
  onSegmentCreate,
  onDistanceUpdate,
}: Omit<UseGpsTrackingProps, 'runningState'>): UseGpsTrackingReturn => {
  // runningState를 appStore에서 직접 읽음 (원본 코드와 동일)
  const runningState = useAppStore((state) => state.runningState);
  // State
  const [distance, setDistance] = useState<number>(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [trackingData, setTrackingData] = useState<LocationTrackingData | null>(null);
  const [useBackgroundMode, setUseBackgroundMode] = useState<boolean>(true);
  const [latestPaceSignal, setLatestPaceSignal] = useState<PaceSignal | null>(null);

  /**
   * GPS 추적 시작
   */
  const startGpsTracking = useCallback(
    async (recordId: number) => {
      if (useBackgroundMode) {
        // 백그라운드 모드: Task Manager 사용
        await backgroundTaskService.startBackgroundTracking(recordId);
        console.log('[useGpsTracking] Background tracking started');
      } else {
        // Foreground 모드: LocationService 사용
        await locationService.startTracking();
        console.log('[useGpsTracking] Foreground GPS tracking started');
      }
    },
    [useBackgroundMode]
  );

  /**
   * GPS 추적 중지 및 최종 데이터 반환
   */
  const stopGpsTracking = useCallback(async (): Promise<{
    distance: number;
    locations: Location[];
  }> => {
    let finalDistance = 0;
    let allLocations: Location[] = [];

    if (useBackgroundMode) {
      // 백그라운드 모드: AsyncStorage에서 데이터 가져오기
      await backgroundTaskService.stopBackgroundTracking();
      finalDistance = await backgroundTaskService.getTotalDistance();
      const backgroundLocations = await backgroundTaskService.getBackgroundLocations();

      // Location 형식으로 변환
      allLocations = backgroundLocations.map((loc) => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        altitude: loc.altitude,
        accuracy: loc.accuracy,
        speed: loc.speed,
        timestamp: new Date(loc.timestamp),
      }));

      console.log('[useGpsTracking] Background tracking stopped');
    } else {
      // Foreground 모드: LocationService에서 데이터 가져오기
      locationService.stopTracking();
      finalDistance = locationService.totalDistanceMeters;
      allLocations = locationService.allLocations;
      console.log('[useGpsTracking] Foreground GPS tracking stopped');
    }

    return { distance: finalDistance, locations: allLocations };
  }, [useBackgroundMode]);

  /**
   * GPS 추적 일시정지
   */
  const pauseGpsTracking = useCallback(() => {
    if (useBackgroundMode) {
      backgroundTaskService.pauseBackgroundTracking().catch((error) => {
        console.error('[useGpsTracking] Failed to pause background tracking:', error);
      });
    } else {
      locationService.pauseTracking();
    }
    console.log('[useGpsTracking] GPS tracking paused');
  }, [useBackgroundMode]);

  /**
   * GPS 추적 재개
   */
  const resumeGpsTracking = useCallback(() => {
    if (useBackgroundMode) {
      backgroundTaskService.resumeBackgroundTracking().catch((error) => {
        console.error('[useGpsTracking] Failed to resume background tracking:', error);
      });
    } else {
      locationService.resumeTracking();
    }
    console.log('[useGpsTracking] GPS tracking resumed');
  }, [useBackgroundMode]);

  /**
   * GPS 데이터 초기화
   */
  const resetGpsTracking = useCallback(() => {
    setDistance(0);
    setLocations([]);
    setTrackingData(null);
    setLatestPaceSignal(null);
    console.log('[useGpsTracking] GPS tracking reset');
  }, []);

  /**
   * 포그라운드 모드: LocationService 구독
   * 백그라운드 모드가 활성화되면 비활성화됨
   */
  useEffect(() => {
    // 백그라운드 모드가 활성화되면 GPS 구독 비활성화 (중복 방지)
    if (useBackgroundMode) {
      console.log('[useGpsTracking] GPS subscription disabled (background mode active)');
      return;
    }

    let previousDistance = 0;
    let currentSegmentDist = 0;
    let currentSegmentLocs: Location[] = [];

    // 위치 업데이트 구독
    const unsubscribeLocation = locationService.subscribeToLocation((location) => {
      setLocations((prev) => [...prev, location]);

      // 세그먼트에 위치 추가 (러닝 중일 때만)
      if (runningState === RunningState.Running) {
        currentSegmentLocs.push(location);
      }
    });

    // 추적 데이터 구독 (거리, 속도 등)
    const unsubscribeTracking = locationService.subscribeToTrackingData((data) => {
      setTrackingData(data);
      setDistance(data.totalDistance);

      // 거리 변화 감지 및 세그먼트 업데이트
      if (runningState === RunningState.Running) {
        const distanceDelta = data.totalDistance - previousDistance;
        if (distanceDelta > 0) {
          currentSegmentDist += distanceDelta;

          // onDistanceUpdate 콜백 호출
          onDistanceUpdate(distanceDelta, currentSegmentLocs);

          // 10m 달성 시 세그먼트 생성
          const currentSegmentStartTime = segmentStartTimeRef.current;
          if (
            currentSegmentDist >= SEGMENT_DISTANCE_THRESHOLD &&
            currentSegmentStartTime !== null
          ) {
            onSegmentCreate(currentSegmentDist, currentSegmentLocs, currentSegmentStartTime);
            currentSegmentDist = 0;
            currentSegmentLocs = [];
          }
        }
        previousDistance = data.totalDistance;
      }
    });

    const unsubscribePaceSignal = locationService.subscribeToPaceSignal((paceSignal) => {
      setLatestPaceSignal({
        timestampMs: paceSignal.timestampMs,
        speedMps: paceSignal.speedMps,
        accuracyMeters: paceSignal.accuracyMeters,
        distanceDeltaMeters: paceSignal.distanceDeltaMeters,
      });
    });

    console.log('[useGpsTracking] GPS subscription active (foreground mode)');

    return () => {
      unsubscribeLocation();
      unsubscribeTracking();
      unsubscribePaceSignal();
      console.log('[useGpsTracking] GPS subscription cleanup');
    };
  }, [
    useBackgroundMode,
    runningState,
    segmentStartTimeRef,
    onSegmentCreate,
    onDistanceUpdate,
  ]);

  /**
   * 백그라운드 모드: 앱이 포그라운드일 때만 AsyncStorage에서 거리 폴링 + 세그먼트 생성
   */
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let previousDistance = 0;
    let currentSegmentDist = 0;
    let lastProcessedLocationCount = 0;

    const startPolling = () => {
      if (interval) return; // 이미 실행 중이면 중복 방지

      interval = setInterval(async () => {
        try {
          const totalDistance = await backgroundTaskService.getTotalDistance();
          const allLocations = await backgroundTaskService.getBackgroundLocations();
          const paceSignal = await backgroundTaskService.getLatestPaceSignal();

          if (paceSignal) {
            setLatestPaceSignal({
              timestampMs: paceSignal.timestampMs,
              speedMps: paceSignal.speedMps,
              accuracyMeters: paceSignal.accuracyMeters,
              distanceDeltaMeters: paceSignal.distanceDeltaMeters,
            });
          }

          // 거리 업데이트
          setDistance(totalDistance);

          // 거리 변화 감지 및 세그먼트 업데이트
          const distanceDelta = totalDistance - previousDistance;
          if (distanceDelta > 0) {
            currentSegmentDist += distanceDelta;

            // 10m 달성 시 세그먼트 생성
            const currentSegmentStartTime = segmentStartTimeRef.current;
            if (
              currentSegmentDist >= SEGMENT_DISTANCE_THRESHOLD &&
              currentSegmentStartTime !== null
            ) {
              const segmentDistanceValue = currentSegmentDist;
              const now = Date.now();
              const segmentDuration = (now - currentSegmentStartTime) / 1000;

              // 새로 추가된 위치들만 추출
              const newLocations = allLocations.slice(lastProcessedLocationCount);

              // Location 형식으로 변환
              const segmentLocs: Location[] = newLocations.map((loc) => ({
                latitude: loc.latitude,
                longitude: loc.longitude,
                altitude: loc.altitude,
                accuracy: loc.accuracy,
                speed: loc.speed,
                timestamp: new Date(loc.timestamp),
              }));

              // 세그먼트 생성 콜백 호출
              onSegmentCreate(segmentDistanceValue, segmentLocs, currentSegmentStartTime);

              // 다음 세그먼트를 위한 초기화
              currentSegmentDist = 0;
              lastProcessedLocationCount = allLocations.length;
            } else {
              // 10m 미만이면 위치만 업데이트
              const newLocations = allLocations.slice(lastProcessedLocationCount);
              if (newLocations.length > 0) {
                const segmentLocs: Location[] = newLocations.map((loc) => ({
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  altitude: loc.altitude,
                  accuracy: loc.accuracy,
                  speed: loc.speed,
                  timestamp: new Date(loc.timestamp),
                }));
                onDistanceUpdate(distanceDelta, segmentLocs);
                lastProcessedLocationCount = allLocations.length;
              }
            }

            previousDistance = totalDistance;
          }
        } catch (error) {
          console.error('[useGpsTracking] Failed to poll background distance:', error);
        }
      }, 1000);

      console.log('[useGpsTracking] Background distance polling started');
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
        console.log('[useGpsTracking] Background distance polling stopped');
      }
    };

    // 앱 상태 변경 구독
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log(`[useGpsTracking] App state changed: ${nextAppState}`);

      if (runningState === RunningState.Running && useBackgroundMode) {
        if (nextAppState === 'active') {
          startPolling(); // 포그라운드로 돌아오면 폴링 시작
        } else {
          stopPolling(); // 백그라운드로 가면 폴링 중지
        }
      }
    });

    // 초기 상태: 백그라운드 모드 + 러닝 중 + 앱이 포그라운드일 때 폴링 시작
    if (
      runningState === RunningState.Running &&
      useBackgroundMode &&
      AppState.currentState === 'active'
    ) {
      startPolling();
    }

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [
    runningState,
    useBackgroundMode,
    segmentStartTimeRef,
    statsRef,
    onSegmentCreate,
    onDistanceUpdate,
  ]);

  return {
    // State
    distance,
    locations,
    trackingData,
    useBackgroundMode,
    latestPaceSignal,

    // Actions
    startGpsTracking,
    stopGpsTracking,
    pauseGpsTracking,
    resumeGpsTracking,
    setUseBackgroundMode,
    resetGpsTracking,
  };
};
