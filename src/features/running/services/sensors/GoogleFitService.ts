/**
 * Google Fit Service (Android)
 * Android Google Fit을 통한 심박수, 케이던스, 칼로리 데이터 수집
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
 * Google Fit Service
 * Android 전용 헬스 데이터 수집 서비스
 */
export class GoogleFitService implements ISensorService {
  private static instance: GoogleFitService;
  private heartRateCallback: ((data: HeartRateData | undefined) => void) | null = null;
  private cadenceCallback: ((data: CadenceData | undefined) => void) | null = null;
  private heartRateInterval: ReturnType<typeof setInterval> | null = null;
  private cadenceInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  static getInstance(): GoogleFitService {
    if (!GoogleFitService.instance) {
      GoogleFitService.instance = new GoogleFitService();
    }
    return GoogleFitService.instance;
  }

  /**
   * Google Fit 사용 가능 여부 (Android만 지원)
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    // TODO: 실제 Google Fit 사용 가능 여부 확인
    // import GoogleFit from 'react-native-google-fit';
    // return GoogleFit.isAvailable();

    console.log('[GoogleFit] Platform check: Android available');
    return true;
  }

  /**
   * Google Fit 권한 확인
   */
  async checkPermissions(): Promise<PermissionResult> {
    if (Platform.OS !== 'android') {
      return { status: 'denied' };
    }

    // TODO: 실제 Google Fit 권한 확인
    // const options = {
    //   scopes: [
    //     Scopes.FITNESS_ACTIVITY_READ,
    //     Scopes.FITNESS_LOCATION_READ,
    //     Scopes.FITNESS_BODY_READ,
    //   ],
    // };
    // return GoogleFit.checkIsAuthorized();

    console.log('[GoogleFit] Checking permissions (mock)');
    return { status: 'undetermined' };
  }

  /**
   * Google Fit 권한 요청
   */
  async requestPermissions(): Promise<PermissionResult> {
    if (Platform.OS !== 'android') {
      return { status: 'denied' };
    }

    try {
      // TODO: 실제 Google Fit 권한 요청
      // const options = {
      //   scopes: [
      //     Scopes.FITNESS_ACTIVITY_READ,     // 활동 데이터
      //     Scopes.FITNESS_LOCATION_READ,     // 위치 데이터
      //     Scopes.FITNESS_BODY_READ,         // 신체 데이터 (심박수 등)
      //     Scopes.FITNESS_ACTIVITY_WRITE,    // 활동 기록 쓰기
      //   ],
      // };
      // await GoogleFit.authorize(options);

      console.log('[GoogleFit] Requesting permissions (mock)');
      return { status: 'granted' };
    } catch (error) {
      console.error('[GoogleFit] Permission request failed:', error);
      return { status: 'denied' };
    }
  }

  /**
   * 심박수 모니터링 시작
   */
  async startHeartRateMonitoring(
    callback: (data: HeartRateData | undefined) => void
  ): Promise<void> {
    if (Platform.OS !== 'android') {
      callback(undefined);
      return;
    }

    this.heartRateCallback = callback;

    // TODO: 실제 Google Fit 심박수 스트림 구독
    // const options = {
    //   startDate: new Date().toISOString(),
    //   bucketUnit: BucketUnit.SECOND,
    //   bucketInterval: 1,
    // };
    //
    // GoogleFit.getHeartRateSamples(options).then((results) => {
    //   if (results && results.length > 0) {
    //     const latest = results[results.length - 1];
    //     const data: HeartRateData = {
    //       bpm: latest.value,
    //       timestamp: new Date(latest.startDate).getTime(),
    //       source: DataSource.PHONE_GOOGLE_FIT,
    //     };
    //     this.heartRateCallback?.(data);
    //   } else {
    //     this.heartRateCallback?.(undefined);
    //   }
    // });

    // 현재는 모의 데이터 (1초마다 undefined)
    this.heartRateInterval = setInterval(() => {
      this.heartRateCallback?.(undefined);
    }, 1000);

    console.log('[GoogleFit] Heart rate monitoring started (mock - returns undefined)');
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
    console.log('[GoogleFit] Heart rate monitoring stopped');
  }

  /**
   * 케이던스 모니터링 시작
   */
  async startCadenceMonitoring(
    callback: (data: CadenceData | undefined) => void
  ): Promise<void> {
    if (Platform.OS !== 'android') {
      callback(undefined);
      return;
    }

    this.cadenceCallback = callback;

    // TODO: 실제 Google Fit 케이던스 측정
    // Google Fit에서는 step cadence를 직접 제공하지 않으므로
    // step count를 시간으로 나눠서 계산
    // const options = {
    //   startDate: new Date(Date.now() - 60000).toISOString(), // 1분 전
    //   endDate: new Date().toISOString(),
    // };
    //
    // GoogleFit.getDailyStepCountSamples(options).then((results) => {
    //   if (results && results.length > 0) {
    //     const steps = results[0].steps.reduce((sum, step) => sum + step.value, 0);
    //     const stepsPerMinute = steps; // 1분간 걸음 수
    //     const data: CadenceData = {
    //       stepsPerMinute,
    //       timestamp: Date.now(),
    //       source: DataSource.PHONE_GOOGLE_FIT,
    //     };
    //     this.cadenceCallback?.(data);
    //   } else {
    //     this.cadenceCallback?.(undefined);
    //   }
    // });

    // 현재는 모의 데이터
    this.cadenceInterval = setInterval(() => {
      this.cadenceCallback?.(undefined);
    }, 1000);

    console.log('[GoogleFit] Cadence monitoring started (mock - returns undefined)');
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
    console.log('[GoogleFit] Cadence monitoring stopped');
  }

  /**
   * 현재 심박수 조회
   */
  async getCurrentHeartRate(): Promise<number | undefined> {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    // TODO: 실제 Google Fit에서 최신 심박수 조회
    // const options = {
    //   startDate: new Date(Date.now() - 60000).toISOString(),
    //   endDate: new Date().toISOString(),
    // };
    //
    // const results = await GoogleFit.getHeartRateSamples(options);
    // if (results && results.length > 0) {
    //   return results[results.length - 1].value;
    // }

    return undefined;
  }

  /**
   * 현재 케이던스 조회
   */
  async getCurrentCadence(): Promise<number | undefined> {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    // TODO: 실제 Google Fit에서 케이던스 계산
    return undefined;
  }

  /**
   * 칼로리 계산
   * Google Fit의 Calories Expended 사용 또는 자체 계산
   */
  async calculateCalories(params: {
    distance: number;
    duration: number;
    weight?: number;
    heartRate?: number;
  }): Promise<number | undefined> {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    // TODO: 실제 Google Fit Calories Expended 조회
    // const options = {
    //   startDate: new Date(Date.now() - params.duration * 1000).toISOString(),
    //   endDate: new Date().toISOString(),
    //   bucketUnit: BucketUnit.DAY,
    //   bucketInterval: 1,
    // };
    //
    // const results = await GoogleFit.getCalorieSamples(options);
    // if (results && results.length > 0) {
    //   return results[0].calorie;
    // }

    // Fallback: MET 공식 사용
    const weight = params.weight || 70;
    const hours = params.duration / 3600;
    const met = 9.8; // 러닝 MET
    const calories = met * weight * hours;

    return calories;
  }
}

// Singleton export
export const googleFitService = GoogleFitService.getInstance();
