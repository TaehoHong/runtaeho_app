import { useCallback, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import {
  useStartRunning,
  useEndRunning,
  useUpdateRunningRecord,
  useDeleteRunningRecord,
} from '../services';
import type {
  RunningRecord,
  EndRunningRecord,
  Location,
} from '../models';
import {
  createRunningRecord,
  updateRunningRecord,
  formatRunningRecord,
} from '../models';
import { locationService, type LocationTrackingData } from '../services/LocationService';
import { backgroundTaskService } from '../services/BackgroundTaskService';
import { offlineStorageService } from '../services/OfflineStorageService';
import { dataSourcePriorityService } from '../services/sensors/DataSourcePriorityService';
import { UnityService } from '../../unity/services/UnityService'

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

  // React Query Mutations
  const { mutateAsync: startRunningMutation, isPending: isStarting } = useStartRunning();
  const { mutateAsync: endRunningMutation, isPending: isEnding } = useEndRunning();
  const { mutateAsync: updateRecordMutation } = useUpdateRunningRecord();
  const { mutateAsync: deleteRecordMutation } = useDeleteRunningRecord();

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
   * LocationService 구독 설정
   * GPS 위치 업데이트 시 거리 및 통계 갱신
   */
  useEffect(() => {
    // 위치 업데이트 구독
    const unsubscribeLocation = locationService.subscribeToLocation((location) => {
      setLocations(prev => [...prev, location]);
    });

    // 추적 데이터 구독 (거리, 속도 등)
    const unsubscribeTracking = locationService.subscribeToTrackingData((data) => {
      setTrackingData(data);
      setDistance(data.totalDistance);
    });

    return () => {
      unsubscribeLocation();
      unsubscribeTracking();
    };
  }, [locationService]);

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

  // 백그라운드 모드: 앱이 포그라운드일 때만 AsyncStorage에서 거리 폴링
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (interval) return; // 이미 실행 중이면 중복 방지

      interval = setInterval(async () => {
        try {
          const totalDistance = await backgroundTaskService.getTotalDistance();
          if (totalDistance !== distance) {
            setDistance(totalDistance);
            console.log(`[RunningViewModel] Distance updated from background storage: ${totalDistance.toFixed(2)}m`);
          }
        } catch (error) {
          console.error('[RunningViewModel] Failed to poll background distance:', error);
        }
      }, 1000);
      console.log('[RunningViewModel] Started background distance polling');
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
  }, [runningState, useBackgroundMode, distance, backgroundTaskService]);

  /**
   * 
   */
  useEffect(() => {
    if(runningState == RunningState.RUNNING && AppState.currentState === 'active') {
      
    }
  })


  /**
   * 러닝 시작
   * Swift RunningRecordService.startRunning 메서드 대응
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
  }, [startRunningMutation, locationService, backgroundTaskService, dataSourcePriorityService, useBackgroundMode]);

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

      // 3. 백엔드 API: 러닝 종료 (오프라인 지원)
      try {
        const endRecord = await endRunningMutation(finalRecord);
        setRunningState(RunningState.COMPLETED);
        console.log('[RunningViewModel] Running completed, data sent to server');

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
   * 러닝 기록 삭제
   */
  const deleteRecord = useCallback(async (recordId: number) => {
    try {
      await deleteRecordMutation(recordId);
    } catch (error) {
      console.error('Failed to delete running record:', error);
      throw error;
    }
  }, [deleteRecordMutation]);

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
  }, []);

  return {
    // State
    runningState,
    currentRecord,
    elapsedTime,
    distance,
    locations,
    stats,
    trackingData, // GPS 추적 데이터
    useBackgroundMode, // 백그라운드 모드 사용 여부

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
    deleteRecord,
    resetRunning,
    setUseBackgroundMode, // 백그라운드 모드 토글

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