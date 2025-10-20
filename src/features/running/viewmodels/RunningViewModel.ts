import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useStartRunning, useEndRunning, useUpdateRunningRecord } from '../services';
import { runningService } from '../services/runningService';
import type {
  RunningRecord,
  EndRunningRecord,
  Location,
  RunningRecordItem,
} from '../models';
import {
  createRunningRecord,
  updateRunningRecord,
  formatRunningRecord,
  createRunningRecordItem,
} from '../models';
import { locationService, type LocationTrackingData } from '../services/LocationService';
import { backgroundTaskService } from '../services/BackgroundTaskService';
import { offlineStorageService } from '../services/OfflineStorageService';
import { dataSourcePriorityService } from '../services/sensors/DataSourcePriorityService';
import { unityService } from '../../unity/services/UnityService'
import { useUserStore } from '../../../stores/user/userStore'
import type { AvatarItem } from '~/features/avatar'

/**
 * 실시간 러닝 통계
 * Swift StatsManager에서 마이그레이션
 * 센서 데이터는 undefined 가능 (웨어러블/핸드폰 센서 없을 경우)
 */
interface RunningStats {
  bpm: number | undefined; // Heart rate (beats per minute) - 센서 데이터 없으면 undefined
  cadence: number | undefined; // 케이던스 (steps/min) - 센서 데이터 없으면 undefined
  pace: {
    minutes: number;
    seconds: number;
    totalSeconds: number;
  };
  speed: number; // km/h
  calories: number | undefined; // 칼로리 - 센서 데이터 없으면 undefined
}

/**
 * 러닝 상태
 */
export enum RunningState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

/**
 * Running ViewModel
 * Swift StatsManager와 Running 관련 로직들을 React Hook으로 마이그레이션
 * LocationService와 통합하여 실제 GPS 추적 구현
 */
export const useRunningViewModel = () => {
  // userStore에서 장착한 아바타 아이템 가져오기
  const equippedItems = useUserStore((state) => state.equippedItems);

  // 현재 러닝 상태
  const [runningState, setRunningState] = useState<RunningState>(RunningState.IDLE);
  const [currentRecord, setCurrentRecord] = useState<RunningRecord | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [trackingData, setTrackingData] = useState<LocationTrackingData | null>(null);
  const [useBackgroundMode, setUseBackgroundMode] = useState<boolean>(true); // 백그라운드 모드 사용 여부

  // 센서 데이터 (웨어러블/핸드폰 센서에서 수집)
  const [sensorHeartRate, setSensorHeartRate] = useState<number | undefined>(undefined);
  const [sensorCadence, setSensorCadence] = useState<number | undefined>(undefined);

  // 실시간 통계
  const [stats, setStats] = useState<RunningStats>({
    bpm: undefined,
    cadence: undefined,
    pace: { minutes: 0, seconds: 0, totalSeconds: 0 },
    speed: 0,
    calories: undefined,
  });

  // stats의 최신 값을 참조하기 위한 ref (백그라운드 폴링용)
  const statsRef = useRef<RunningStats>(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // 러닝 종료 후 최종 기록 (Finished 화면에서 사용)
  const [lastEndedRecord, setLastEndedRecord] = useState<EndRunningRecord | null>(null);

  const [currentSegmentItems, setCurrentSegmentItems] = useState<RunningRecordItem[]>([]);
  const [segmentStartTime, setSegmentStartTime] = useState<number | null>(null);
  const [segmentDistance, setSegmentDistance] = useState<number>(0);
  const [segmentLocations, setSegmentLocations] = useState<Location[]>([]);
  const [segmentIdCounter, setSegmentIdCounter] = useState<number>(1);
  const segmentDistanceThreshold = 10.0; // 10미터마다 세그먼트 생성

  // React Query Mutations
  const { mutateAsync: startRunningMutation, isPending: isStarting } = useStartRunning();
  const { mutateAsync: endRunningMutation, isPending: isEnding } = useEndRunning();
  const { mutateAsync: updateRecordMutation } = useUpdateRunningRecord();

  /**
   * 실시간 통계 업데이트
   * 센서 데이터 우선순위: 웨어러블 → 핸드폰 센서 → undefined
   */
  const updateStats = useCallback((
    distanceMeters: number,
    elapsedSeconds: number,
    heartRate?: number,
    cadence?: number
  ) => {
    if (elapsedSeconds === 0) return;

    // 페이스 계산 (분/km)
    const paceSeconds = distanceMeters > 0 ? Math.floor((elapsedSeconds / distanceMeters) * 1000) : 0;
    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceSecondsRemainder = paceSeconds % 60;

    // 속도 계산 (km/h)
    const speedKmh = distanceMeters > 0 ? (distanceMeters / elapsedSeconds) * 3.6 : 0;

    // 칼로리 계산 (센서 우선, 없으면 MET 공식)
    let calories: number | undefined = undefined;
    if (heartRate && distanceMeters > 0) {
      // 심박수 기반 칼로리 계산 (더 정확)
      const weight = 70.0;
      const hours = elapsedSeconds / 3600.0;
      // Harris-Benedict equation 변형
      calories = ((heartRate * 0.6309) + (weight * 0.1988) + (30 * 0.2017) - 55.0969) * hours;
    } else if (distanceMeters > 0) {
      // MET 공식 (Fallback)
      const weight = 70.0;
      const hours = elapsedSeconds / 3600.0;
      const met = 9.8;
      calories = met * weight * hours;
    }

    setStats({
      bpm: heartRate, // 센서 데이터 (undefined 가능)
      cadence, // 센서 데이터 (undefined 가능)
      pace: {
        minutes: paceMinutes,
        seconds: paceSecondsRemainder,
        totalSeconds: paceSeconds,
      },
      speed: speedKmh,
      calories, // 센서 기반 또는 계산값 (undefined 가능)
    });
  }, []);

  /**
   * 통계 데이터 포맷팅 유틸리티 함수들
   * stats-view.tsx와 공유하여 일관성 있는 포맷팅 제공
   */

  // 러닝 시간 포맷팅 (MM:SS)
  const formatElapsedTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  // BPM 포맷팅 (2자리 패딩 또는 '--')
  const formatBpm = useCallback((bpm: number | undefined): string => {
    return bpm !== undefined ? String(bpm).padStart(2, '0') : '--';
  }, []);

  // 페이스 포맷팅 (MM:SS)
  const formatPace = useCallback((minutes: number, seconds: number): string => {
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  /**
   * 세그먼트 생성 (iOS createSegment 대응)
   * 10미터마다 호출
   */
  const createSegment = useCallback((distance: number, locations: Location[], startTime: number) => {
    const now = Date.now();
    const segmentDuration = (now - startTime) / 1000; // seconds

    setCurrentSegmentItems(prev => {
      const segmentCalories = Math.round((stats.calories || 0) / Math.max(1, prev.length + 1));

      const newSegment = createRunningRecordItem({
        id: segmentIdCounter,
        distance: distance,
        cadence: stats.cadence || 0,
        heartRate: stats.bpm || 0,
        calories: segmentCalories,
        orderIndex: segmentIdCounter - 1,
        durationSec: segmentDuration,
        startTimestamp: startTime / 1000, // Unix timestamp in seconds
        locations: locations,
      });

      console.log(`📍 [RunningViewModel] 세그먼트 생성 완료: ${prev.length + 1}번째, ${distance}m`);
      return [...prev, newSegment];
    });

    setSegmentIdCounter(prev => prev + 1);

    // 다음 세그먼트를 위한 초기화
    setSegmentStartTime(now);
    setSegmentDistance(0);
    setSegmentLocations([]);
  }, [stats, segmentIdCounter]);

  /**
   * 최종 세그먼트 생성 (iOS finalizeCurrentSegment 대응)
   * 러닝 종료 시 10m 미만이라도 저장
   */
  const finalizeCurrentSegment = useCallback(() => {
    if (segmentDistance > 0 && segmentStartTime !== null) {
      const now = Date.now();
      const segmentDuration = (now - segmentStartTime) / 1000;
      const segmentCalories = Math.round((stats.calories || 0) / Math.max(1, currentSegmentItems.length + 1));

      const finalSegment = createRunningRecordItem({
        id: segmentIdCounter,
        distance: segmentDistance,
        cadence: stats.cadence || 0,
        heartRate: stats.bpm || 0,
        calories: segmentCalories,
        orderIndex: segmentIdCounter - 1,
        durationSec: segmentDuration,
        startTimestamp: segmentStartTime / 1000,
        locations: segmentLocations,
      });

      setCurrentSegmentItems(prev => [...prev, finalSegment]);
      console.log(`📍 [RunningViewModel] 최종 세그먼트 생성: ${segmentDistance}m`);
    }
  }, [segmentDistance, segmentStartTime, segmentLocations, stats, segmentIdCounter, currentSegmentItems.length]);

  /**
   * 세그먼트 추적 초기화 (iOS initializeSegmentTracking 대응)
   */
  const initializeSegmentTracking = useCallback(() => {
    setSegmentStartTime(Date.now());
    setSegmentDistance(0);
    setSegmentLocations([]);
    setCurrentSegmentItems([]);
    setSegmentIdCounter(1);
    console.log('[RunningViewModel] 세그먼트 추적 초기화');
  }, []);

  /**
   * LocationService 구독 설정
   * GPS 위치 업데이트 시 거리 및 통계 갱신
   */
  useEffect(() => {
    let previousDistance = 0;
    let currentSegmentDist = 0;
    let currentSegmentLocs: Location[] = [];

    // 위치 업데이트 구독
    const unsubscribeLocation = locationService.subscribeToLocation((location) => {
      setLocations(prev => [...prev, location]);

      // 세그먼트에 위치 추가 (러닝 중일 때만)
      if (runningState === RunningState.RUNNING) {
        currentSegmentLocs.push(location);
        setSegmentLocations(prev => [...prev, location]);
      }
    });

    // 추적 데이터 구독 (거리, 속도 등)
    const unsubscribeTracking = locationService.subscribeToTrackingData((data) => {
      setTrackingData(data);
      setDistance(data.totalDistance);

      // 거리 변화 감지 및 세그먼트 업데이트
      if (runningState === RunningState.RUNNING) {
        const distanceDelta = data.totalDistance - previousDistance;
        if (distanceDelta > 0) {
          currentSegmentDist += distanceDelta;
          setSegmentDistance(currentSegmentDist);

          // 10m 달성 시 세그먼트 생성
          if (currentSegmentDist >= segmentDistanceThreshold && segmentStartTime !== null) {
            createSegment(currentSegmentDist, currentSegmentLocs, segmentStartTime);
            currentSegmentDist = 0;
            currentSegmentLocs = [];
          }
        }
        previousDistance = data.totalDistance;
      }
    });

    return () => {
      unsubscribeLocation();
      unsubscribeTracking();
    };
  }, [locationService, runningState, createSegment, segmentDistanceThreshold, segmentStartTime]);

  // 타이머 인터벌
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (runningState === RunningState.RUNNING && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);

        // 실시간 통계 업데이트 (센서 데이터 포함)
        updateStats(distance, elapsed, sensorHeartRate, sensorCadence);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [runningState, startTime, distance, sensorHeartRate, sensorCadence, updateStats]);

  // 백그라운드 모드: 앱이 포그라운드일 때만 AsyncStorage에서 거리 폴링 + 세그먼트 생성
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let previousDistance = 0;
    let currentSegmentDist = 0;
    let lastProcessedLocationCount = 0; // 마지막으로 처리한 위치 개수

    const startPolling = () => {
      if (interval) return; // 이미 실행 중이면 중복 방지

      interval = setInterval(async () => {
        try {
          const totalDistance = await backgroundTaskService.getTotalDistance();
          const allLocations = await backgroundTaskService.getBackgroundLocations();

          // 거리 업데이트
          setDistance(totalDistance);

          // 거리 변화 감지 및 세그먼트 업데이트
          const distanceDelta = totalDistance - previousDistance;
          if (distanceDelta > 0) {
            currentSegmentDist += distanceDelta;
            setSegmentDistance(currentSegmentDist);

            // 10m 달성 시 세그먼트 생성
            if (currentSegmentDist >= segmentDistanceThreshold) {
              // 현재 거리를 상수에 저장 (초기화 전에 값 보존)
              const segmentDistanceValue = currentSegmentDist;

              // segmentStartTime을 현재 시점에서 가져오기 (ref가 아닌 state 직접 참조)
              setSegmentStartTime((currentSegmentStartTime) => {
                if (currentSegmentStartTime === null) return currentSegmentStartTime;

                const now = Date.now();
                const segmentDuration = (now - currentSegmentStartTime) / 1000; // seconds

                // 새로 추가된 위치들만 추출 (이전에 처리한 위치 이후부터)
                const newLocations = allLocations.slice(lastProcessedLocationCount);

                // Location 형식으로 변환
                const segmentLocs: Location[] = newLocations.map(loc => ({
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  altitude: loc.altitude,
                  accuracy: loc.accuracy,
                  speed: loc.speed,
                  timestamp: new Date(loc.timestamp),
                }));

                // 세그먼트 생성 (statsRef.current 사용하여 최신 stats 참조)
                // 먼저 현재 segmentIdCounter를 가져오기 위해 함수형 업데이트 사용
                let createdSegmentId = 0;
                setSegmentIdCounter(currentId => {
                  createdSegmentId = currentId;
                  return currentId + 1; // segmentIdCounter 증가
                });

                // 가져온 ID로 세그먼트 생성
                const currentStats = statsRef.current; // 최신 stats 가져오기
                setCurrentSegmentItems(prev => {
                  const segmentCalories = Math.round((currentStats.calories || 0) / Math.max(1, prev.length + 1));

                  const newSegment = createRunningRecordItem({
                    id: createdSegmentId,
                    distance: segmentDistanceValue,  // 👈 저장된 값 사용
                    cadence: currentStats.cadence || 0,
                    heartRate: currentStats.bpm || 0,
                    calories: segmentCalories,
                    orderIndex: createdSegmentId - 1,
                    durationSec: segmentDuration,
                    startTimestamp: currentSegmentStartTime / 1000,
                    locations: segmentLocs,
                  });

                  console.log(`📍 [RunningViewModel] 세그먼트 생성 완료 (백그라운드): ${prev.length + 1}번째, ${segmentDistanceValue.toFixed(2)}m`);

                  return [...prev, newSegment];
                });

                return now; // segmentStartTime 업데이트
              });

              // 다음 세그먼트를 위한 초기화 (setSegmentStartTime 외부에서 실행)
              currentSegmentDist = 0;
              setSegmentDistance(0);
              setSegmentLocations([]);
              lastProcessedLocationCount = allLocations.length; // 현재까지 처리한 위치 개수 기록
            } else {
              // 10m 미만이면 위치만 업데이트
              const newLocations = allLocations.slice(lastProcessedLocationCount);
              if (newLocations.length > 0) {
                const segmentLocs: Location[] = newLocations.map(loc => ({
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  altitude: loc.altitude,
                  accuracy: loc.accuracy,
                  speed: loc.speed,
                  timestamp: new Date(loc.timestamp),
                }));
                setSegmentLocations(prev => [...prev, ...segmentLocs]);
                lastProcessedLocationCount = allLocations.length;
              }
            }

            previousDistance = totalDistance;
          }
        } catch (error) {
          console.error('[RunningViewModel] Failed to poll background distance:', error);
        }
      }, 1000);
      console.log('[RunningViewModel] Started background distance polling with segment tracking');
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
        console.log('[RunningViewModel] Stopped background distance polling');
      }
    };

    // 앱 상태 변경 구독
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log(`[RunningViewModel] App state changed: ${nextAppState}`);

      if (runningState === RunningState.RUNNING && useBackgroundMode) {
        if (nextAppState === 'active') {
          startPolling(); // 포그라운드로 돌아오면 폴링 시작
        } else {
          stopPolling(); // 백그라운드로 가면 폴링 중지
        }
      }
    });

    // 초기 상태: 백그라운드 모드 + 러닝 중 + 앱이 포그라운드일 때 폴링 시작
    if (runningState === RunningState.RUNNING && useBackgroundMode && AppState.currentState === 'active') {
      startPolling();
    }

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [runningState, useBackgroundMode, backgroundTaskService]);

  /**
   * Unity 로드 시 현재 장착한 아바타 전송
   * Note: equippedItems는 Map 또는 객체일 수 있음 (persist 이슈)
   */
  useEffect(() => {
    // equippedItems가 유효한지 확인
    if (!equippedItems) return;

    // Map인 경우 values() 사용, 객체인 경우 Object.values() 사용
    let items = Object.values(equippedItems).filter((item): item is AvatarItem => !!item);

    if (items.length > 0) {
      console.log('[RunningViewModel] Avatar changed in Unity:', items);
      unityService.changeAvatar(items);
    }
  }, [equippedItems])

  useEffect(() => {
    if(runningState == RunningState.RUNNING) {
      unityService.setCharacterSpeed(stats.speed)
    } else {
      unityService.stopCharacter()
    }
  })


  /**
   * 러닝 시작
   * LocationService GPS 추적 + 센서 모니터링 + 백그라운드 모드 시작
   */
  const startRunning = useCallback(async () => {
    try {
      // 1. GPS 권한 확인 및 요청
      const hasPermission = await locationService.checkPermissions();
      if (!hasPermission) {
        const permission = await locationService.requestPermissions();
        if (permission.status !== 'granted') {
          throw new Error('Location permission required');
        }
      }

      // 2. 백엔드 API: 러닝 시작
      const record = await startRunningMutation();
      setCurrentRecord(record);
      setStartTime(Date.now());
      setElapsedTime(0);
      setDistance(0);
      setLocations([]);
      setRunningState(RunningState.RUNNING);

      // 3. GPS 추적 시작
      if (useBackgroundMode) {
        // 백그라운드 모드: Task Manager 사용
        await backgroundTaskService.startBackgroundTracking(record.id);
        console.log('[RunningViewModel] Background tracking started');
      } else {
        // Foreground 모드: LocationService 사용
        await locationService.startTracking();
        console.log('[RunningViewModel] Foreground GPS tracking started');
      }

      // 4. 센서 모니터링 시작 (웨어러블 → 핸드폰 센서 → undefined)
      await dataSourcePriorityService.startAllMonitoring({
        onHeartRate: (data) => {
          setSensorHeartRate(data.value);
          console.log('[RunningViewModel] Heart rate:', data.value, 'from', data.source);
        },
        onCadence: (data) => {
          setSensorCadence(data.value);
          console.log('[RunningViewModel] Cadence:', data.value, 'from', data.source);
        },
      });
      console.log('[RunningViewModel] Sensor monitoring started');

      // 통계 초기화
      setStats({
        bpm: undefined,
        cadence: undefined,
        pace: { minutes: 0, seconds: 0, totalSeconds: 0 },
        speed: 0,
        calories: undefined,
      });
      // 세그먼트 추적 초기화
      initializeSegmentTracking();

      return record;
    } catch (error) {
      
      console.error('Failed to start running:', error);

      // GPS 추적 중지 (에러 시 정리)
      locationService.stopTracking();
      backgroundTaskService.stopBackgroundTracking().catch(console.error);
      dataSourcePriorityService.stopAllMonitoring().catch(console.error);

      // Swift와 동일하게 에러 시 더미 기록 생성
      const dummyRecord = createRunningRecord(0);
      setCurrentRecord(dummyRecord);
      setStartTime(Date.now());
      setRunningState(RunningState.RUNNING);
      return dummyRecord;
    }
  }, [startRunningMutation, locationService, backgroundTaskService, dataSourcePriorityService, useBackgroundMode, initializeSegmentTracking]);

  /**
   * 러닝 일시정지
   * LocationService GPS 추적 일시정지
   */
  const pauseRunning = useCallback(() => {
    locationService.pauseTracking();
    setRunningState(RunningState.PAUSED);
    console.log('[RunningViewModel] Running paused, GPS tracking paused');
  }, [locationService]);

  /**
   * 러닝 재개
   * LocationService GPS 추적 재개
   */
  const resumeRunning = useCallback(() => {
    locationService.resumeTracking();
    setRunningState(RunningState.RUNNING);
    console.log('[RunningViewModel] Running resumed, GPS tracking resumed');
  }, [locationService]);

  /**
   * 러닝 종료
   * Swift RunningRecordService.end 메서드 대응
   * GPS 추적 중지, 센서 모니터링 중지, 백그라운드 데이터 수집, 최종 데이터 서버 전송
   */
  const endRunning = useCallback(async (): Promise<EndRunningRecord | null> => {
    if (!currentRecord) return null;

    try {
      // 0. 마지막 세그먼트 저장 (10m 미만이라도)
      finalizeCurrentSegment();

      // 1. GPS 추적 중지
      let finalDistance = 0;
      let allLocations: any[] = [];

      if (useBackgroundMode) {
        // 백그라운드 모드: AsyncStorage에서 데이터 가져오기
        await backgroundTaskService.stopBackgroundTracking();
        finalDistance = await backgroundTaskService.getTotalDistance();
        const backgroundLocations = await backgroundTaskService.getBackgroundLocations();
        allLocations = backgroundLocations;
        console.log('[RunningViewModel] Background tracking stopped');
      } else {
        // Foreground 모드: LocationService에서 데이터 가져오기
        locationService.stopTracking();
        finalDistance = locationService.totalDistanceMeters;
        allLocations = locationService.allLocations;
        console.log('[RunningViewModel] Foreground GPS tracking stopped');
      }

      // 2. 센서 모니터링 중지
      await dataSourcePriorityService.stopAllMonitoring();
      console.log('[RunningViewModel] Sensor monitoring stopped');

      console.log(`[RunningViewModel] Final stats:`, {
        distance: finalDistance,
        duration: elapsedTime,
        locations: allLocations.length,
        segments: currentSegmentItems.length,
        heartRate: stats.bpm,
        cadence: stats.cadence,
        calories: stats.calories ? Math.round(stats.calories) : undefined,
      });

      // 3. 최종 기록 업데이트
      const finalRecord = updateRunningRecord(currentRecord, {
        distance: Math.round(finalDistance), // GPS 기반 거리
        cadence: stats.cadence || 0, // 센서 데이터 (없으면 0)
        heartRate: stats.bpm || 0, // 센서 데이터 (없으면 0)
        calorie: stats.calories ? Math.round(stats.calories) : 0, // 계산값 (없으면 0)
        durationSec: elapsedTime,
      });

      // 4. 백엔드 API: 러닝 종료 (오프라인 지원)
      try {
        const endRecord = await endRunningMutation(finalRecord);
        setLastEndedRecord(endRecord); // Finished 화면에서 사용할 최종 기록 저장
        setRunningState(RunningState.COMPLETED);
        console.log('[RunningViewModel] Running completed, data sent to server');

        // 5. RunningRecordItems를 비동기로 전송 (iOS Task.detached 패턴)
        // UI 블로킹 없이 백그라운드에서 전송
        if (currentSegmentItems.length > 0) {
          // 세그먼트 데이터를 서버 형식으로 변환
          const itemsForServer = currentSegmentItems.map(segment => ({
            distance: segment.distance,
            durationSec: segment.durationSec,
            cadence: segment.cadence,
            heartRate: segment.heartRate,
            minHeartRate: segment.heartRate, // TODO: 실제 최소값 계산
            maxHeartRate: segment.heartRate, // TODO: 실제 최대값 계산
            orderIndex: segment.orderIndex,
            startTimeStamp: segment.startTimestamp,
            endTimeStamp: segment.startTimestamp + segment.durationSec,
          }));

          // 비동기로 전송 (await 하지 않음 - UI 블로킹 방지)
          runningService.saveRunningRecordItems({
            runningRecordId: currentRecord.id,
            items: itemsForServer,
          })
            .then(() => {
              console.log(`📤 [RunningViewModel] ${currentSegmentItems.length}개 세그먼트 비동기 업로드 완료`);
            })
            .catch((error) => {
              console.warn('⚠️ [RunningViewModel] 세그먼트 비동기 업로드 실패:', error);
            });
        }

        // 백그라운드 데이터 정리
        if (useBackgroundMode) {
          await backgroundTaskService.clearBackgroundData();
        }

        return endRecord;
      } catch (apiError: any) {
        // 네트워크 에러 시 오프라인 저장
        console.warn('[RunningViewModel] API failed, saving offline:', apiError.message);
        await offlineStorageService.addPendingUpload(currentRecord.id, finalRecord);
        setRunningState(RunningState.COMPLETED);

        // 일단 완료로 처리 (나중에 재시도)
        return null;
      }
    } catch (error) {
      console.error('Failed to end running:', error);

      // 에러 발생 시에도 GPS 추적 및 센서 모니터링 중지
      locationService.stopTracking();
      backgroundTaskService.stopBackgroundTracking().catch(console.error);
      dataSourcePriorityService.stopAllMonitoring().catch(console.error);

      throw error;
    }
  }, [
    currentRecord,
    stats,
    elapsedTime,
    endRunningMutation,
    locationService,
    backgroundTaskService,
    offlineStorageService,
    dataSourcePriorityService,
    useBackgroundMode,
    finalizeCurrentSegment,
    currentSegmentItems,
  ]);

  /**
   * 러닝 기록 업데이트
   * Swift RunningRecordService.update 메서드 대응
   */
  const updateCurrentRecord = useCallback(async () => {
    if (!currentRecord) return;

    try {
      const updatedRecord = updateRunningRecord(currentRecord, {
        distance,
        heartRate: stats.bpm || 0,
        cadence: stats.cadence || 0,
        calorie: stats.calories ? Math.round(stats.calories) : 0,
        durationSec: elapsedTime,
      });

      await updateRecordMutation(updatedRecord);
      setCurrentRecord(updatedRecord);
    } catch (error) {
      console.error('Failed to update running record:', error);
    }
  }, [currentRecord, distance, stats, elapsedTime, updateRecordMutation]);

  /**
   * 거리 업데이트 (GPS 트래킹)
   */
  const updateDistance = useCallback((newDistance: number) => {
    setDistance(newDistance);
  }, []);

  /**
   * 위치 추가
   */
  const addLocation = useCallback((location: Location) => {
    setLocations(prev => [...prev, location]);
  }, []);

  /**
   * 러닝 초기화
   */
  const resetRunning = useCallback(() => {
    setRunningState(RunningState.IDLE);
    setCurrentRecord(null);
    setStartTime(null);
    setElapsedTime(0);
    setDistance(0);
    setLocations([]);
    setSensorHeartRate(undefined);
    setSensorCadence(undefined);
    setStats({
      bpm: undefined,
      cadence: undefined,
      pace: { minutes: 0, seconds: 0, totalSeconds: 0 },
      speed: 0,
      calories: undefined,
    });

    // 세그먼트 데이터 초기화
    setCurrentSegmentItems([]);
    setSegmentStartTime(null);
    setSegmentDistance(0);
    setSegmentLocations([]);
    setSegmentIdCounter(1);
  }, []);

  return {
    // State
    runningState,
    currentRecord,
    elapsedTime,
    distance,
    locations,
    stats,
    lastEndedRecord, // 러닝 종료 후 최종 기록
    trackingData, // GPS 추적 데이터
    useBackgroundMode, // 백그라운드 모드 사용 여부
    currentSegmentItems, // 현재 세그먼트 아이템들

    // Loading states
    isStarting,
    isEnding,

    // Actions
    startRunning,
    pauseRunning,
    resumeRunning,
    endRunning,
    updateCurrentRecord,
    updateDistance,
    addLocation,
    resetRunning,
    setUseBackgroundMode, // 백그라운드 모드 토글

    // Formatting utilities
    formatElapsedTime,
    formatBpm,
    formatPace,

    // Computed values
    isRunning: runningState === RunningState.RUNNING,
    isPaused: runningState === RunningState.PAUSED,
    isCompleted: runningState === RunningState.COMPLETED,
    gpsAccuracy: trackingData?.accuracy || 0,
    currentSpeed: trackingData?.currentSpeed || 0,
    averageSpeed: trackingData?.averageSpeed || 0,
    formattedStats: currentRecord ? formatRunningRecord({
      ...currentRecord,
      distance,
      durationSec: elapsedTime,
      heartRate: stats.bpm ?? 0,
      calorie: stats.calories !== undefined ? Math.round(stats.calories) : 0,
    }) : null,
  };
};