/**
 * Pedometer Service
 *
 * 만보기(Pedometer) 기능 제공
 * - 걸음 수 추적
 * - 케이던스(분당 걸음 수) 계산
 * - iOS Core Motion / Android Step Counter 기반
 */

import { Pedometer } from 'expo-sensors';
import { DataSource } from './SensorTypes';

const MIN_CADENCE_MEASUREMENT_SECONDS = 10;
const MIN_CADENCE_MEASUREMENT_STEPS = 8;
const CADENCE_STALE_MS = 5000;
const MAX_CADENCE = 255;

/**
 * Pedometer 데이터
 */
export interface PedometerData {
  steps: number;              // 총 걸음 수
  cadence: number;            // 케이던스 (steps/min)
  timestamp: number;          // 측정 시간 (Unix timestamp)
  source: DataSource;         // 데이터 소스
}

/**
 * Pedometer 권한 결과
 */
export interface PedometerPermissionResult {
  granted: boolean;
  available: boolean;
}

export interface CadenceSnapshot {
  cadence: number;
  isMeasured: boolean;
}

/**
 * Pedometer 서비스
 *
 * Singleton 패턴
 * expo-sensors의 Pedometer API를 래핑하여 걸음 수 추적 기능 제공
 */
export class PedometerService {
  private static instance: PedometerService;

  // 추적 상태
  private isTracking: boolean = false;
  private subscription: { remove: () => void } | null = null;

  // 걸음 수 데이터
  private startSteps: number = 0;
  private currentSteps: number = 0;
  private startTime: number = 0;
  private currentCadence: number = 0;
  private lastMeasuredCadence: number = 0;
  private lastStepTimestamp: number | null = null;
  private isCadenceMeasured: boolean = false;

  private constructor() {}

  /**
   * Singleton 인스턴스 반환
   */
  static getInstance(): PedometerService {
    if (!PedometerService.instance) {
      PedometerService.instance = new PedometerService();
    }
    return PedometerService.instance;
  }

  /**
   * Pedometer 사용 가능 여부 확인
   */
  async isAvailable(): Promise<boolean> {
    try {
      const available = await Pedometer.isAvailableAsync();
      console.log('[PedometerService] Available:', available);
      return available;
    } catch (error) {
      console.error('[PedometerService] Availability check failed:', error);
      return false;
    }
  }

  /**
   * 권한 확인
   *
   * Note: iOS Core Motion은 별도 권한 요청 불필요
   *       하지만 Info.plist에 NSMotionUsageDescription 필요
   */
  async checkPermissions(): Promise<PedometerPermissionResult> {
    try {
      const available = await this.isAvailable();

      // iOS: Core Motion은 항상 허용 (Info.plist만 필요)
      // Android: ACTIVITY_RECOGNITION 권한 필요 (expo-sensors가 처리)
      const granted = available;

      return { granted, available };
    } catch (error) {
      console.error('[PedometerService] Permission check failed:', error);
      return { granted: false, available: false };
    }
  }

  /**
   * 권한 요청
   *
   * Note: expo-sensors Pedometer는 자동으로 권한 요청 처리
   *       명시적 요청 불필요
   */
  async requestPermissions(): Promise<PedometerPermissionResult> {
    return this.checkPermissions();
  }

  /**
   * 걸음 수 추적 시작
   *
   * @param callback - 걸음 수 업데이트 콜백
   */
  async startTracking(callback: (data: PedometerData) => void): Promise<void> {
    if (this.isTracking) {
      console.warn('[PedometerService] Already tracking');
      return;
    }

    try {
      // 1. 사용 가능 여부 확인
      const available = await this.isAvailable();
      if (!available) {
        console.warn('[PedometerService] Pedometer not available');
        // 사용 불가능해도 에러는 던지지 않음 (선택적 기능)
        return;
      }

      // 2. 초기 상태 설정
      this.startTime = Date.now();
      this.startSteps = 0;
      this.currentSteps = 0;
      this.currentCadence = 0;
      this.lastMeasuredCadence = 0;
      this.lastStepTimestamp = null;
      this.isCadenceMeasured = false;
      this.isTracking = true;

      console.log('[PedometerService] Starting tracking...');

      // 3. Pedometer 구독
      this.subscription = Pedometer.watchStepCount((result) => {
        try {
          const now = Date.now();

          // 걸음 수 업데이트
          this.currentSteps = result.steps;
          if (this.currentSteps > 0) {
            this.lastStepTimestamp = now;
          }

          // 케이던스 계산 (steps/min)
          const elapsedMs = now - this.startTime;
          const elapsedSec = elapsedMs / 1000;
          const elapsedMin = elapsedMs / 60000;
          const hasEnoughWarmup =
            elapsedSec >= MIN_CADENCE_MEASUREMENT_SECONDS
            && this.currentSteps >= MIN_CADENCE_MEASUREMENT_STEPS;
          const isFreshSignal =
            this.lastStepTimestamp !== null
            && now - this.lastStepTimestamp <= CADENCE_STALE_MS;

          if (elapsedMin > 0 && hasEnoughWarmup && isFreshSignal) {
            this.currentCadence = this.normalizeCadence(
              Math.round(this.currentSteps / elapsedMin)
            );
            this.lastMeasuredCadence = this.currentCadence;
            this.isCadenceMeasured = true;
          } else {
            this.currentCadence = 0;
            this.isCadenceMeasured = false;
          }

          // 콜백 호출
          const data: PedometerData = {
            steps: this.currentSteps,
            cadence: this.currentCadence,
            timestamp: now,
            source: DataSource.PHONE_SENSORS,
          };

          console.log(
            `[PedometerService] Steps: ${data.steps}, Cadence: ${data.cadence} steps/min`
          );

          callback(data);
        } catch (error) {
          console.error('[PedometerService] Callback error:', error);
        }
      });

      console.log('[PedometerService] Tracking started successfully');
    } catch (error) {
      console.error('[PedometerService] Failed to start tracking:', error);
      this.isTracking = false;
      // 에러를 던지지 않음 (선택적 기능)
    }
  }

  /**
   * 걸음 수 추적 중지
   */
  stopTracking(): void {
    if (!this.isTracking) {
      console.warn('[PedometerService] Not tracking');
      return;
    }

    try {
      console.log('[PedometerService] Stopping tracking...');

      // 구독 해제
      if (this.subscription) {
        this.subscription.remove();
        this.subscription = null;
      }

      this.isTracking = false;

      console.log(
        `[PedometerService] Tracking stopped. Final steps: ${this.currentSteps}, Final cadence: ${this.currentCadence}`
      );
    } catch (error) {
      console.error('[PedometerService] Failed to stop tracking:', error);
    }
  }

  /**
   * 현재 걸음 수 조회
   */
  getCurrentSteps(): number {
    return this.currentSteps;
  }

  /**
   * 현재 케이던스 조회 (steps/min)
   */
  getCurrentCadence(): number {
    return this.getCadenceSnapshot().cadence;
  }

  /**
   * 러닝 종료 업로드용 케이던스 조회
   * 종료 직전 신호만 stale인 경우에는 마지막 유효 측정값을 유지한다.
   */
  getFinalCadence(): number {
    const snapshot = this.getCadenceSnapshot();
    if (snapshot.isMeasured) {
      return snapshot.cadence;
    }

    return this.lastMeasuredCadence;
  }

  /**
   * 현재 케이던스 스냅샷 조회
   * 실측 신뢰 조건 미충족 시 cadence=0, isMeasured=false 반환
   */
  getCadenceSnapshot(): CadenceSnapshot {
    if (
      !this.isCadenceMeasured
      || this.lastStepTimestamp === null
      || Date.now() - this.lastStepTimestamp > CADENCE_STALE_MS
    ) {
      return {
        cadence: 0,
        isMeasured: false,
      };
    }

    return {
      cadence: this.currentCadence,
      isMeasured: true,
    };
  }

  /**
   * 추적 중 여부 확인
   */
  getIsTracking(): boolean {
    return this.isTracking;
  }

  /**
   * 상태 초기화 (테스트용)
   */
  reset(): void {
    this.stopTracking();
    this.startSteps = 0;
    this.currentSteps = 0;
    this.startTime = 0;
    this.currentCadence = 0;
    this.lastMeasuredCadence = 0;
    this.lastStepTimestamp = null;
    this.isCadenceMeasured = false;
  }

  private normalizeCadence(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    const rounded = Math.round(value);
    if (rounded < 0) {
      return 0;
    }

    return Math.min(rounded, MAX_CADENCE);
  }
}

/**
 * Singleton 인스턴스 export
 */
export const pedometerService = PedometerService.getInstance();
