/**
 * Background Task Service
 * Expo Task Manager를 사용하여 백그라운드 위치 추적 구현
 * Android: Foreground Service
 * iOS: Background Location Updates
 */

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

/**
 * 거리 계산 (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
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

      // 새로운 위치들 처리
      let totalDistanceAdded = 0;
      const newLocations: BackgroundLocationData[] = [];

      for (const location of locations) {
        const newLocation: BackgroundLocationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
          speed: location.coords.speed || 0,
          altitude: location.coords.altitude || 0,
          accuracy: location.coords.accuracy || 0,
        };

        // 거리 계산 (이전 위치가 있을 때만)
        const previousLocation = newLocations.length > 0
          ? newLocations[newLocations.length - 1]
          : storedLocations.length > 0
            ? storedLocations[storedLocations.length - 1]
            : undefined;

        if (previousLocation) {
          // 유효성 검증
          if (newLocation.accuracy <= 20) { // 20m 이하 정확도만 사용
            const distance = calculateDistance(
              previousLocation.latitude,
              previousLocation.longitude,
              newLocation.latitude,
              newLocation.longitude
            );

            // 비정상적인 거리 필터링 (2m ~ 100m)
            if (distance >= 2 && distance <= 100) {
              totalDistanceAdded += distance;
            }
          }
        }

        newLocations.push(newLocation);
      }

      // 업데이트된 데이터 저장
      const updatedLocations = [...storedLocations, ...newLocations];
      const updatedSession: BackgroundRunningSession = {
        ...session,
        totalDistance: session.totalDistance + totalDistanceAdded,
        locationCount: updatedLocations.length,
      };

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.BACKGROUND_LOCATIONS, JSON.stringify(updatedLocations)],
        [STORAGE_KEYS.RUNNING_SESSION, JSON.stringify(updatedSession)],
        [STORAGE_KEYS.TOTAL_DISTANCE, updatedSession.totalDistance.toString()],
      ]);

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
      ]);

      // Task가 이미 등록되어 있는지 확인
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      // 백그라운드 위치 업데이트 시작
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000, // 1초
        distanceInterval: 5, // 5m
        deferredUpdatesInterval: 1000,
        deferredUpdatesDistance: 5,
        showsBackgroundLocationIndicator: true,
        // Foreground Service 설정 (Android)
        ...(Platform.OS === 'android' && {
          foregroundService: {
            notificationTitle: 'RunTaeho 러닝 추적 중',
            notificationBody: '러닝 기록이 진행 중입니다.',
            notificationColor: '#FF6B6B',
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
