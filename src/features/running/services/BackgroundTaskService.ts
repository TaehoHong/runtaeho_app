/**
 * Background Task Service
 * Expo Task Manager를 사용하여 백그라운드 위치 추적 구현
 * Android: Foreground Service
 * iOS: Background Location Updates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import {
  DEFAULT_GPS_FILTER_CONFIG,
  evaluateGpsSample,
  type GpsSample,
} from './gps/GpsFilter';
import { RED } from '~/shared/styles';

/**
 * Task 이름 상수
 */
export const BACKGROUND_LOCATION_TASK = 'background-location-task';

/**
 * AsyncStorage 키
 */
const STORAGE_KEYS = {
  RUNNING_SESSION: '@running_session',
  BACKGROUND_LOCATIONS: '@background_locations',
  TOTAL_DISTANCE: '@total_distance',
  LATEST_PACE_SIGNAL: '@latest_pace_signal',
  GPS_FILTER_STATE: '@gps_filter_state',
} as const;

/**
 * 백그라운드 세션 데이터
 */
interface BackgroundRunningSession {
  runningRecordId: number;
  startTime: number;
  isActive: boolean;
  totalDistance: number;
  locationCount: number;
}

/**
 * 백그라운드 위치 데이터
 */
interface BackgroundLocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number;
  altitude: number;
  accuracy: number;
}

interface BackgroundGpsFilterState {
  lastSample: GpsSample | null;
}

export interface BackgroundPaceSignal {
  timestampMs: number;
  speedMps?: number;
  accuracyMeters?: number;
  distanceDeltaMeters?: number;
}

/**
 * Background Task 정의
 * 백그라운드에서 위치 업데이트 처리
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundTask] Error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    if (!locations || locations.length === 0) {
      return;
    }

    try {
      // 현재 세션 정보 가져오기
      const sessionData = await AsyncStorage.getItem(STORAGE_KEYS.RUNNING_SESSION);
      if (!sessionData) {
        // console.log('[BackgroundTask] No active session');
        return;
      }

      const session: BackgroundRunningSession = JSON.parse(sessionData);
      if (!session.isActive) {
        console.log('[BackgroundTask] Session is not active');
        return;
      }

      // 기존 위치 데이터 가져오기
      const storedLocationsData = await AsyncStorage.getItem(STORAGE_KEYS.BACKGROUND_LOCATIONS);
      const storedLocations: BackgroundLocationData[] = storedLocationsData
        ? JSON.parse(storedLocationsData)
        : [];

      const filterStateData = await AsyncStorage.getItem(STORAGE_KEYS.GPS_FILTER_STATE);
      const gpsFilterState: BackgroundGpsFilterState = filterStateData
        ? JSON.parse(filterStateData)
        : { lastSample: null };

      // 새로운 위치들 처리
      let totalDistanceAdded = 0;
      const newLocations: BackgroundLocationData[] = [];
      let latestPaceSignal: BackgroundPaceSignal | null = null;

      for (const location of locations) {
        const currentSample: GpsSample = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestampMs: location.timestamp,
          speedMps: location.coords.speed ?? undefined,
          accuracyMeters: location.coords.accuracy ?? undefined,
        };

        const newLocation: BackgroundLocationData = {
          latitude: currentSample.latitude,
          longitude: currentSample.longitude,
          timestamp: location.timestamp,
          speed: location.coords.speed || 0,
          altitude: location.coords.altitude || 0,
          accuracy: location.coords.accuracy || 0,
        };

        const filterResult = evaluateGpsSample(
          gpsFilterState.lastSample,
          currentSample,
          DEFAULT_GPS_FILTER_CONFIG
        );

        if (filterResult.acceptedForDistance) {
          totalDistanceAdded += filterResult.distanceMeters;
        }

        if (filterResult.acceptedForPath) {
          newLocations.push(newLocation);
        }

        if (filterResult.acceptedForPace) {
          latestPaceSignal = {
            timestampMs: currentSample.timestampMs,
            speedMps: filterResult.speedMps,
            accuracyMeters: currentSample.accuracyMeters,
            distanceDeltaMeters: filterResult.acceptedForDistance
              ? filterResult.distanceMeters
              : 0,
          };
        }

        gpsFilterState.lastSample = currentSample;
      }

      // 업데이트된 데이터 저장
      const updatedLocations = [...storedLocations, ...newLocations];
      const updatedSession: BackgroundRunningSession = {
        ...session,
        totalDistance: session.totalDistance + totalDistanceAdded,
        locationCount: updatedLocations.length,
      };

      const updates: [string, string][] = [
        [STORAGE_KEYS.BACKGROUND_LOCATIONS, JSON.stringify(updatedLocations)],
        [STORAGE_KEYS.RUNNING_SESSION, JSON.stringify(updatedSession)],
        [STORAGE_KEYS.TOTAL_DISTANCE, updatedSession.totalDistance.toString()],
        [STORAGE_KEYS.GPS_FILTER_STATE, JSON.stringify(gpsFilterState)],
      ];

      if (latestPaceSignal) {
        updates.push([STORAGE_KEYS.LATEST_PACE_SIGNAL, JSON.stringify(latestPaceSignal)]);
      }

      await AsyncStorage.multiSet(updates);

      // console.log(
      //   `[BackgroundTask] Processed ${newLocations.length} locations, ` +
      //   `distance added: ${totalDistanceAdded.toFixed(2)}m, ` +
      //   `total: ${updatedSession.totalDistance.toFixed(2)}m`
      // );
    } catch (err) {
      console.error('[BackgroundTask] Error processing locations:', err);
    }
  }
});

/**
 * Background Task Service
 */
export class BackgroundTaskService {
  private static instance: BackgroundTaskService;

  private constructor() {}

  static getInstance(): BackgroundTaskService {
    if (!BackgroundTaskService.instance) {
      BackgroundTaskService.instance = new BackgroundTaskService();
    }
    return BackgroundTaskService.instance;
  }

  /**
   * 백그라운드 추적 시작
   */
  async startBackgroundTracking(runningRecordId: number): Promise<void> {
    try {
      // 권한 확인
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        throw new Error('Foreground location permission required');
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('[BackgroundTask] Background permission not granted, using foreground only');
      }

      // 세션 데이터 초기화
      const session: BackgroundRunningSession = {
        runningRecordId,
        startTime: Date.now(),
        isActive: true,
        totalDistance: 0,
        locationCount: 0,
      };

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.RUNNING_SESSION, JSON.stringify(session)],
        [STORAGE_KEYS.BACKGROUND_LOCATIONS, JSON.stringify([])],
        [STORAGE_KEYS.TOTAL_DISTANCE, '0'],
        [STORAGE_KEYS.GPS_FILTER_STATE, JSON.stringify({ lastSample: null })],
        [STORAGE_KEYS.LATEST_PACE_SIGNAL, JSON.stringify(null)],
      ]);

      // Task가 이미 등록되어 있는지 확인
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      // 백그라운드 위치 업데이트 시작
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000, // 2초
        distanceInterval: 5, // 5m
        deferredUpdatesInterval: 2000,
        deferredUpdatesDistance: 5,
        showsBackgroundLocationIndicator: true,
        // Foreground Service 설정 (Android)
        ...(Platform.OS === 'android' && {
          foregroundService: {
            notificationTitle: 'RunTaeho 러닝 추적 중',
            notificationBody: '러닝 기록이 진행 중입니다.',
            notificationColor: RED[400],
          }
        }),
      });

      console.log('[BackgroundTask] Started background tracking');
    } catch (error) {
      console.error('[BackgroundTask] Failed to start:', error);
      throw error;
    }
  }

  /**
   * 백그라운드 추적 중지
   */
  async stopBackgroundTracking(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      // 세션 비활성화
      const sessionData = await AsyncStorage.getItem(STORAGE_KEYS.RUNNING_SESSION);
      if (sessionData) {
        const session: BackgroundRunningSession = JSON.parse(sessionData);
        await AsyncStorage.setItem(
          STORAGE_KEYS.RUNNING_SESSION,
          JSON.stringify({ ...session, isActive: false })
        );
      }

      console.log('[BackgroundTask] Stopped background tracking');
    } catch (error) {
      console.error('[BackgroundTask] Failed to stop:', error);
      throw error;
    }
  }

  /**
   * 백그라운드 추적 일시정지 (세션 비활성화)
   */
  async pauseBackgroundTracking(): Promise<void> {
    try {
      const sessionData = await AsyncStorage.getItem(STORAGE_KEYS.RUNNING_SESSION);
      if (!sessionData) return;

      const session: BackgroundRunningSession = JSON.parse(sessionData);
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.RUNNING_SESSION, JSON.stringify({ ...session, isActive: false })],
        [STORAGE_KEYS.GPS_FILTER_STATE, JSON.stringify({ lastSample: null })],
      ]);
      console.log('[BackgroundTask] Paused background tracking');
    } catch (error) {
      console.error('[BackgroundTask] Failed to pause:', error);
      throw error;
    }
  }

  /**
   * 백그라운드 추적 재개 (세션 활성화 + 필터 재앵커)
   */
  async resumeBackgroundTracking(): Promise<void> {
    try {
      const sessionData = await AsyncStorage.getItem(STORAGE_KEYS.RUNNING_SESSION);
      if (!sessionData) return;

      const session: BackgroundRunningSession = JSON.parse(sessionData);
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.RUNNING_SESSION, JSON.stringify({ ...session, isActive: true })],
        [STORAGE_KEYS.GPS_FILTER_STATE, JSON.stringify({ lastSample: null })],
      ]);
      console.log('[BackgroundTask] Resumed background tracking');
    } catch (error) {
      console.error('[BackgroundTask] Failed to resume:', error);
      throw error;
    }
  }

  /**
   * 현재 세션 정보 조회
   */
  async getCurrentSession(): Promise<BackgroundRunningSession | null> {
    try {
      const sessionData = await AsyncStorage.getItem(STORAGE_KEYS.RUNNING_SESSION);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('[BackgroundTask] Failed to get session:', error);
      return null;
    }
  }

  /**
   * 최신 실시간 페이스 신호 조회
   */
  async getLatestPaceSignal(): Promise<BackgroundPaceSignal | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.LATEST_PACE_SIGNAL);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('[BackgroundTask] Failed to get latest pace signal:', error);
      return null;
    }
  }

  /**
   * 수집된 위치 데이터 조회
   */
  async getBackgroundLocations(): Promise<BackgroundLocationData[]> {
    try {
      const locationsData = await AsyncStorage.getItem(STORAGE_KEYS.BACKGROUND_LOCATIONS);
      return locationsData ? JSON.parse(locationsData) : [];
    } catch (error) {
      console.error('[BackgroundTask] Failed to get locations:', error);
      return [];
    }
  }

  /**
   * 총 거리 조회
   */
  async getTotalDistance(): Promise<number> {
    try {
      const distance = await AsyncStorage.getItem(STORAGE_KEYS.TOTAL_DISTANCE);
      return distance ? parseFloat(distance) : 0;
    } catch (error) {
      console.error('[BackgroundTask] Failed to get distance:', error);
      return 0;
    }
  }

  /**
   * 백그라운드 데이터 초기화
   */
  async clearBackgroundData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.RUNNING_SESSION,
        STORAGE_KEYS.BACKGROUND_LOCATIONS,
        STORAGE_KEYS.TOTAL_DISTANCE,
        STORAGE_KEYS.LATEST_PACE_SIGNAL,
        STORAGE_KEYS.GPS_FILTER_STATE,
      ]);
      console.log('[BackgroundTask] Cleared background data');
    } catch (error) {
      console.error('[BackgroundTask] Failed to clear data:', error);
    }
  }

  /**
   * Task 등록 상태 확인
   */
  async isTaskRegistered(): Promise<boolean> {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  }

  /**
   * 백그라운드 실행 중인지 확인
   */
  async isRunning(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return session?.isActive ?? false;
  }
}

// Singleton export
export const backgroundTaskService = BackgroundTaskService.getInstance();
