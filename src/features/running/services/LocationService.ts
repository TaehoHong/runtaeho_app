/**
 * Location Service
 * iOS LocationService.swift에서 마이그레이션
 * GPS 추적 및 거리 계산 담당
 */

import * as ExpoLocation from 'expo-location';
import { type Location, createLocationFromPosition, calculateDistance } from '../models/Location';

/**
 * 위치 추적 설정
 */
interface LocationConfig {
  accuracy: ExpoLocation.LocationAccuracy;
  timeInterval: number; // milliseconds
  distanceInterval: number; // meters
  maximumAcceptableAccuracy: number; // meters
  maximumReasonableSpeed: number; // km/h
  minimumDistanceForUpdate: number; // meters
}

/**
 * 위치 추적 데이터
 */
export interface LocationTrackingData {
  currentLocation: Location | null;
  totalDistance: number; // meters
  currentSpeed: number; // km/h
  averageSpeed: number; // km/h
  accuracy: number; // meters
  isTracking: boolean;
}

/**
 * 위치 서비스
 * iOS LocationService와 동일한 로직
 */
export class LocationService {
  private static instance: LocationService;

  // Configuration
  private config: LocationConfig = {
    accuracy: ExpoLocation.Accuracy.BestForNavigation,
    timeInterval: 1000, // 1초
    distanceInterval: 5, // 5m
    maximumAcceptableAccuracy: 20.0, // 20m
    maximumReasonableSpeed: 30.0, // 30km/h
    minimumDistanceForUpdate: 2.0, // 2m
  };

  // Tracking state
  private isTracking: boolean = false;
  private isPaused: boolean = false;
  private watchSubscription: ExpoLocation.LocationSubscription | null = null;

  // Location data
  private locations: Location[] = [];
  private previousLocation: Location | null = null;
  private lastValidLocation: Location | null = null;
  private totalDistance: number = 0;
  private speedReadings: number[] = [];

  // Validation
  private consecutiveInvalidReadings: number = 0;
  private readonly maxConsecutiveInvalidReadings: number = 5;

  // Callbacks
  private locationCallbacks: Set<(location: Location) => void> = new Set();
  private trackingDataCallbacks: Set<(data: LocationTrackingData) => void> = new Set();

  private constructor() {}

  /**
   * Singleton 인스턴스
   */
  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * 권한 요청
   */
  async requestPermissions(): Promise<ExpoLocation.PermissionResponse> {
    const foregroundPermission = await ExpoLocation.requestForegroundPermissionsAsync();

    if (foregroundPermission.status === 'granted') {
      // 백그라운드 권한도 요청 (선택사항)
      const backgroundPermission = await ExpoLocation.requestBackgroundPermissionsAsync();
      return backgroundPermission;
    }

    return foregroundPermission;
  }

  /**
   * 권한 확인
   */
  async checkPermissions(): Promise<ExpoLocation.PermissionResponse> {
    return await ExpoLocation.getForegroundPermissionsAsync();
  }

  /**
   * 추적 시작
   */
  async startTracking(): Promise<void> {
    const hasPermission = await this.checkPermissions();
    if (!hasPermission) {
      const permission = await this.requestPermissions();
      if (permission.status !== 'granted') {
        throw new Error('Location permission denied');
      }
    }

    if (this.isTracking) {
      console.warn('Location tracking already active');
      return;
    }

    // 상태 초기화
    this.resetTrackingState();
    this.isTracking = true;
    this.isPaused = false;

    // GPS 추적 시작
    this.watchSubscription = await ExpoLocation.watchPositionAsync(
      {
        accuracy: this.config.accuracy,
        timeInterval: this.config.timeInterval,
        distanceInterval: this.config.distanceInterval,
      },
      (position) => this.updateLocation(position)
    );

    console.log('[LocationService] Tracking started');
    this.notifyTrackingDataUpdate();
  }

  /**
   * 추적 일시정지
   */
  pauseTracking(): void {
    if (!this.isTracking) return;

    this.isPaused = true;
    console.log('[LocationService] Tracking paused');
    this.notifyTrackingDataUpdate();
  }

  /**
   * 추적 재개
   */
  resumeTracking(): void {
    if (!this.isTracking) return;

    this.isPaused = false;
    console.log('[LocationService] Tracking resumed');
    this.notifyTrackingDataUpdate();
  }

  /**
   * 추적 중지
   */
  stopTracking(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }

    this.isTracking = false;
    this.isPaused = false;

    console.log('[LocationService] Tracking stopped');
    this.notifyTrackingDataUpdate();
  }

  /**
   * 위치 업데이트 처리
   */
  private updateLocation(position: ExpoLocation.LocationObject): void {
    if (!this.isTracking || this.isPaused) return;

    const location = createLocationFromPosition(position);

    // 위치 데이터 저장
    this.locations.push(location);

    // 거리 계산
    if (this.previousLocation) {
      const distance = calculateDistance(this.previousLocation, location);

      // 유효성 검증
      if (this.isValidLocationUpdate(location, this.previousLocation, distance)) {
        this.totalDistance += distance;

        // 속도 기록 저장
        let speed = 0; // m/s
        const timeDelta = (location.timestamp.getTime() - this.previousLocation.timestamp.getTime()) / 1000;
        if (timeDelta > 0) {
          speed = distance / timeDelta; // m/s
          this.speedReadings.push(speed);

          // 최근 30개만 유지 (약 30초)
          if (this.speedReadings.length > 30) {
            this.speedReadings.shift();
          }
        }

        this.consecutiveInvalidReadings = 0;
        this.lastValidLocation = location;

        // 콜백 호출
        this.locationCallbacks.forEach(callback => callback(location));
        this.notifyTrackingDataUpdate();

        console.log(
          `[LocationService] Distance: ${distance.toFixed(2)}m, ` +
          `Total: ${this.totalDistance.toFixed(2)}m, ` +
          `Speed: ${(speed * 3.6).toFixed(1)} km/h`
        );
      } else {
        this.consecutiveInvalidReadings++;
        console.log('[LocationService] Invalid location update ignored');

        // 너무 많은 무효 데이터 시 경고
        if (this.consecutiveInvalidReadings >= this.maxConsecutiveInvalidReadings) {
          console.warn('[LocationService] Too many consecutive invalid readings');
        }
      }
    } else {
      // 첫 번째 위치
      this.lastValidLocation = location;
    }

    this.previousLocation = location;
  }

  /**
   * 위치 업데이트 유효성 검증
   */
  private isValidLocationUpdate(
    location: Location,
    previousLocation: Location,
    distance: number
  ): boolean {
    // 정확도 체크
    if (location.accuracy && location.accuracy > this.config.maximumAcceptableAccuracy) {
      return false;
    }

    // 최소 거리 체크
    if (distance < this.config.minimumDistanceForUpdate) {
      return false;
    }

    // 속도 체크 (비정상적으로 빠른 이동 방지)
    const timeDelta = (location.timestamp.getTime() - previousLocation.timestamp.getTime()) / 1000;
    if (timeDelta > 0) {
      const speedKmh = (distance / timeDelta) * 3.6;
      if (speedKmh > this.config.maximumReasonableSpeed) {
        return false;
      }
    }

    return true;
  }

  /**
   * 상태 초기화
   */
  private resetTrackingState(): void {
    this.locations = [];
    this.previousLocation = null;
    this.lastValidLocation = null;
    this.totalDistance = 0;
    this.speedReadings = [];
    this.consecutiveInvalidReadings = 0;
  }

  /**
   * 평균 속도 계산
   */
  private calculateAverageSpeed(): number {
    if (this.speedReadings.length === 0) return 0;

    const sum = this.speedReadings.reduce((acc, speed) => acc + speed, 0);
    return (sum / this.speedReadings.length) * 3.6; // km/h
  }

  /**
   * 현재 추적 데이터 반환
   */
  getCurrentTrackingData(): LocationTrackingData {
    const currentLocation = this.locations[this.locations.length - 1] || null;
    const currentSpeed = currentLocation?.speed ? currentLocation.speed * 3.6 : 0;
    const averageSpeed = this.calculateAverageSpeed();
    const accuracy = currentLocation?.accuracy || 0;

    return {
      currentLocation,
      totalDistance: this.totalDistance,
      currentSpeed,
      averageSpeed,
      accuracy,
      isTracking: this.isTracking && !this.isPaused,
    };
  }

  /**
   * 위치 업데이트 구독
   */
  subscribeToLocation(callback: (location: Location) => void): () => void {
    this.locationCallbacks.add(callback);
    return () => {
      this.locationCallbacks.delete(callback);
    };
  }

  /**
   * 추적 데이터 업데이트 구독
   */
  subscribeToTrackingData(callback: (data: LocationTrackingData) => void): () => void {
    this.trackingDataCallbacks.add(callback);
    return () => {
      this.trackingDataCallbacks.delete(callback);
    };
  }

  /**
   * 추적 데이터 업데이트 알림
   */
  private notifyTrackingDataUpdate(): void {
    const data = this.getCurrentTrackingData();
    this.trackingDataCallbacks.forEach(callback => callback(data));
  }

  /**
   * 현재 상태 getter
   */
  get totalDistanceMeters(): number {
    return this.totalDistance;
  }

  get allLocations(): Location[] {
    return [...this.locations];
  }

  get isCurrentlyTracking(): boolean {
    return this.isTracking && !this.isPaused;
  }

  get isCurrentlyPaused(): boolean {
    return this.isPaused;
  }

  /**
   * 설정 업데이트 (선택사항)
   */
  updateConfig(config: Partial<LocationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton export
export const locationService = LocationService.getInstance();
