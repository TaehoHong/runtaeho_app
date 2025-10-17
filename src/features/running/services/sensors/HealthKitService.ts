/**
 * HealthKit Service (iOS)
 * iOS HealthKit을 통한 심박수, 케이던스, 칼로리 데이터 수집
 */

import { Platform } from 'react-native';
import type {
  ISensorService,
  HeartRateData,
  CadenceData,
  PermissionResult,
  DataSource,
} from './SensorTypes';

/**
 * HealthKit Service
 * iOS 전용 헬스 데이터 수집 서비스
 */
export class HealthKitService implements ISensorService {
  private static instance: HealthKitService;
  private heartRateCallback: ((data: HeartRateData | undefined) => void) | null = null;
  private cadenceCallback: ((data: CadenceData | undefined) => void) | null = null;
  private heartRateInterval: ReturnType<typeof setInterval> | null = null;
  private cadenceInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  static getInstance(): HealthKitService {
    if (!HealthKitService.instance) {
      HealthKitService.instance = new HealthKitService();
    }
    return HealthKitService.instance;
  }

  /**
   * HealthKit 사용 가능 여부 (iOS만 지원)
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    // TODO: 실제 HealthKit 사용 가능 여부 확인
    // import AppleHealthKit from 'react-native-health';
    // return AppleHealthKit.isAvailable();

    console.log('[HealthKit] Platform check: iOS available');
    return true;
  }

  /**
   * HealthKit 권한 확인
   */
  async checkPermissions(): Promise<PermissionResult> {
    if (Platform.OS !== 'ios') {
      return { status: 'denied' };
    }

    // TODO: 실제 HealthKit 권한 확인
    // const permissions = {
    //   permissions: {
    //     read: ['HeartRate', 'StepCount', 'ActiveEnergyBurned'],
    //     write: ['Workout']
    //   }
    // };
    // return AppleHealthKit.getAuthStatus(permissions);

    console.log('[HealthKit] Checking permissions (mock)');
    return { status: 'undetermined' };
  }

  /**
   * HealthKit 권한 요청
   */
  async requestPermissions(): Promise<PermissionResult> {
    if (Platform.OS !== 'ios') {
      return { status: 'denied' };
    }

    try {
      // TODO: 실제 HealthKit 권한 요청
      // const permissions = {
      //   permissions: {
      //     read: [
      //       'HeartRate',        // 심박수
      //       'StepCount',        // 걸음 수
      //       'ActiveEnergyBurned', // 활동 칼로리
      //       'DistanceWalkingRunning' // 이동 거리
      //     ],
      //     write: ['Workout']   // 운동 기록 쓰기
      //   }
      // };
      // await AppleHealthKit.initHealthKit(permissions);

      console.log('[HealthKit] Requesting permissions (mock)');
      return { status: 'granted' };
    } catch (error) {
      console.error('[HealthKit] Permission request failed:', error);
      return { status: 'denied' };
    }
  }

  /**
   * 심박수 모니터링 시작
   */
  async startHeartRateMonitoring(
    callback: (data: HeartRateData | undefined) => void
  ): Promise<void> {
    if (Platform.OS !== 'ios') {
      callback(undefined);
      return;
    }

    this.heartRateCallback = callback;

    // TODO: 실제 HealthKit 심박수 스트림 구독
    // const options = {
    //   unit: 'bpm',
    //   startDate: new Date().toISOString(),
    //   ascending: false,
    //   limit: 1
    // };
    //
    // AppleHealthKit.getHeartRateSamples(options, (err, results) => {
    //   if (err) {
    //     this.heartRateCallback?.(undefined);
    //     return;
    //   }
    //   if (results && results.length > 0) {
    //     const data: HeartRateData = {
    //       bpm: results[0].value,
    //       timestamp: new Date(results[0].startDate).getTime(),
    //       source: DataSource.PHONE_HEALTH_KIT,
    //     };
    //     this.heartRateCallback?.(data);
    //   }
    // });

    // 현재는 모의 데이터 (1초마다 undefined 또는 실제 값)
    this.heartRateInterval = setInterval(() => {
      // 실제 HealthKit 연동 전까지는 undefined 반환
      this.heartRateCallback?.(undefined);
    }, 1000);

    console.log('[HealthKit] Heart rate monitoring started (mock - returns undefined)');
  }

  /**
   * 심박수 모니터링 중지
   */
  async stopHeartRateMonitoring(): Promise<void> {
    if (this.heartRateInterval) {
      clearInterval(this.heartRateInterval);
      this.heartRateInterval = null;
    }
    this.heartRateCallback = null;
    console.log('[HealthKit] Heart rate monitoring stopped');
  }

  /**
   * 케이던스 모니터링 시작
   */
  async startCadenceMonitoring(
    callback: (data: CadenceData | undefined) => void
  ): Promise<void> {
    if (Platform.OS !== 'ios') {
      callback(undefined);
      return;
    }

    this.cadenceCallback = callback;

    // TODO: 실제 HealthKit 케이던스 측정
    // iOS에서는 StepCount를 시간으로 나눠서 케이던스 계산
    // const options = {
    //   startDate: new Date(Date.now() - 60000).toISOString(), // 1분 전
    //   endDate: new Date().toISOString(),
    // };
    //
    // AppleHealthKit.getStepCount(options, (err, results) => {
    //   if (err) {
    //     this.cadenceCallback?.(undefined);
    //     return;
    //   }
    //   const stepsPerMinute = results.value; // 1분간 걸음 수
    //   const data: CadenceData = {
    //     stepsPerMinute,
    //     timestamp: Date.now(),
    //     source: DataSource.PHONE_HEALTH_KIT,
    //   };
    //   this.cadenceCallback?.(data);
    // });

    // 현재는 모의 데이터
    this.cadenceInterval = setInterval(() => {
      this.cadenceCallback?.(undefined);
    }, 1000);

    console.log('[HealthKit] Cadence monitoring started (mock - returns undefined)');
  }

  /**
   * 케이던스 모니터링 중지
   */
  async stopCadenceMonitoring(): Promise<void> {
    if (this.cadenceInterval) {
      clearInterval(this.cadenceInterval);
      this.cadenceInterval = null;
    }
    this.cadenceCallback = null;
    console.log('[HealthKit] Cadence monitoring stopped');
  }

  /**
   * 현재 심박수 조회 (최신 1개)
   */
  async getCurrentHeartRate(): Promise<number | undefined> {
    if (Platform.OS !== 'ios') {
      return undefined;
    }

    // TODO: 실제 HealthKit에서 최신 심박수 조회
    // const options = {
    //   unit: 'bpm',
    //   startDate: new Date(Date.now() - 60000).toISOString(),
    //   ascending: false,
    //   limit: 1
    // };
    //
    // return new Promise((resolve) => {
    //   AppleHealthKit.getHeartRateSamples(options, (err, results) => {
    //     if (err || !results || results.length === 0) {
    //       resolve(undefined);
    //       return;
    //     }
    //     resolve(results[0].value);
    //   });
    // });

    return undefined;
  }

  /**
   * 현재 케이던스 조회
   */
  async getCurrentCadence(): Promise<number | undefined> {
    if (Platform.OS !== 'ios') {
      return undefined;
    }

    // TODO: 실제 HealthKit에서 케이던스 계산
    return undefined;
  }

  /**
   * 칼로리 계산
   * HealthKit의 ActiveEnergyBurned 사용 또는 자체 계산
   */
  async calculateCalories(params: {
    distance: number;
    duration: number;
    weight?: number;
    heartRate?: number;
  }): Promise<number | undefined> {
    if (Platform.OS !== 'ios') {
      return undefined;
    }

    // TODO: 실제 HealthKit ActiveEnergyBurned 조회
    // const options = {
    //   startDate: new Date(Date.now() - params.duration * 1000).toISOString(),
    //   endDate: new Date().toISOString(),
    // };
    //
    // return new Promise((resolve) => {
    //   AppleHealthKit.getActiveEnergyBurned(options, (err, results) => {
    //     if (err || !results) {
    //       resolve(undefined);
    //       return;
    //     }
    //     resolve(results.value); // kcal
    //   });
    // });

    // Fallback: MET 공식 사용
    const weight = params.weight || 70;
    const hours = params.duration / 3600;
    const met = 9.8; // 러닝 MET
    const calories = met * weight * hours;

    return calories;
  }
}

// Singleton export
export const healthKitService = HealthKitService.getInstance();
