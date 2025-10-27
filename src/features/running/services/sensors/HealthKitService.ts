/**
 * HealthKit Service (iOS)
 * iOS HealthKit을 통한 심박수, 케이던스, 칼로리 데이터 수집
 *
 * 정책: 실시간 센서 데이터 수집 (Priority 3 - Phone fallback)
 * - 1초 간격 실시간 폴링
 * - 데이터 없으면 undefined 반환 (UI: "--")
 */

import { Platform } from 'react-native';
import * as AppleHealthKit from 'react-native-health';
import type { HealthKitPermissions } from 'react-native-health';
import { HealthPermission } from 'react-native-health';
import type {
  ISensorService,
  HeartRateData,
  CadenceData,
  PermissionResult,
} from './SensorTypes';

/**
 * HealthKit Service
 * iOS 전용 헬스 데이터 수집 서비스
 */

/**
 * HealthKit 권한 설정
 * react-native-health 라이브러리의 권한 객체 구조
 */
// const permissions: HealthKitPermissions = {
//   permissions: {
//     read: [
//       HealthPermission.HeartRate,
//       HealthPermission.StepCount,
//       HealthPermission.ActiveEnergyBurned,
//       HealthPermission.DistanceWalkingRunning,
//     ],
//     write: [HealthPermission.Workout],
//   },
// };

export class HealthKitService implements ISensorService {
  private static instance: HealthKitService;
  private heartRateCallback: ((data: HeartRateData | undefined) => void) | null = null;
  private cadenceCallback: ((data: CadenceData | undefined) => void) | null = null;
  private heartRateInterval: ReturnType<typeof setInterval> | null = null;
  private cadenceInterval: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  private constructor() {
    this.initHealthKit();
  }

  static getInstance(): HealthKitService {
    if (!HealthKitService.instance) {
      HealthKitService.instance = new HealthKitService();
    }
    return HealthKitService.instance;
  }

  /**
   * HealthKit 초기화
   *
   * TODO: react-native-health 라이브러리 실제 설치 필요
   * 현재는 스켈레톤 코드로 에러 방지
   */
  private initHealthKit(): void {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      // TODO: react-native-health 라이브러리가 설치되면 아래 주석 해제
      // AppleHealthKit.initHealthKit(permissions, (error: string) => {
      //   if (error) {
      //     console.error('[HealthKit] Initialization failed:', error);
      //     this.isInitialized = false;
      //     return;
      //   }
      //   this.isInitialized = true;
      //   console.log('[HealthKit] Initialized successfully');
      // });

      console.log('[HealthKit] Initialization skipped (library not configured)');
      this.isInitialized = false;
    } catch (error) {
      console.error('[HealthKit] Initialization error:', error);
      this.isInitialized = false;
    }
  }

  /**
   * HealthKit 사용 가능 여부 (iOS만 지원)
   *
   * TODO: react-native-health 라이브러리 설치 후 구현
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    // TODO: 라이브러리 설치 후 아래 주석 해제
    // return new Promise((resolve) => {
    //   AppleHealthKit.isAvailable((error: string, available: boolean) => {
    //     if (error) {
    //       console.error('[HealthKit] Availability check failed:', error);
    //       resolve(false);
    //       return;
    //     }
    //     console.log('[HealthKit] Available:', available);
    //     resolve(available);
    //   });
    // });

    console.log('[HealthKit] Availability check skipped (library not configured)');
    return false; // 라이브러리 설치 전까지는 false 반환
  }

  /**
   * HealthKit 권한 확인
   */
  async checkPermissions(): Promise<PermissionResult> {
    if (Platform.OS !== 'ios') {
      return { status: 'denied' };
    }

    // TODO: react-native-health 라이브러리가 설치되면 아래 주석 해제
    // return new Promise((resolve) => {
    //   AppleHealthKit.getAuthStatus(permissions, (error, results) => {
    //     if (error) {
    //       console.error('[HealthKit] Permission check failed:', error);
    //       resolve({ status: 'denied' });
    //       return;
    //     }
    //
    //     const heartRateStatus = results[AppleHealthKit.Constants.Permissions.HeartRate];
    //
    //     if (heartRateStatus === AppleHealthKit.Constants.Permissions.NotDetermined) {
    //       resolve({ status: 'undetermined' });
    //     } else if (heartRateStatus === AppleHealthKit.Constants.Permissions.SharingAuthorized) {
    //       resolve({ status: 'granted' });
    //     } else {
    //       resolve({ status: 'denied' });
    //     }
    //   });
    // });

    console.log('[HealthKit] Permission check skipped (library not configured)');
    return { status: 'undetermined' };
  }

  /**
   * HealthKit 권한 요청
   */
  async requestPermissions(): Promise<PermissionResult> {
    if (Platform.OS !== 'ios') {
      return { status: 'denied' };
    }

    // TODO: react-native-health 라이브러리가 설치되면 아래 주석 해제
    // return new Promise((resolve) => {
    //   (AppleHealthKit as any).initHealthKit(permissions, (error: string) => {
    //     if (error) {
    //       console.error('[HealthKit] Permission request failed:', error);
    //       resolve({ status: 'denied' });
    //       return;
    //     }
    //
    //     this.isInitialized = true;
    //     console.log('[HealthKit] Permissions granted');
    //     resolve({ status: 'granted' });
    //   });
    // });

    console.log('[HealthKit] Permission request skipped (library not configured)');
    return { status: 'undetermined' };
  }

  /**
   * 심박수 모니터링 시작
   * 정책: 1초 간격 실시간 폴링, 데이터 없으면 undefined
   */
  async startHeartRateMonitoring(
    callback: (data: HeartRateData | undefined) => void
  ): Promise<void> {
    if (Platform.OS !== 'ios') {
      callback(undefined);
      return;
    }

    if (!this.isInitialized) {
      console.warn('[HealthKit] Not initialized, cannot start heart rate monitoring');
      callback(undefined);
      return;
    }

    this.heartRateCallback = callback;

    // TODO: react-native-health 라이브러리가 설치되면 아래 주석 해제
    // 1초 간격으로 최신 심박수 조회
    // this.heartRateInterval = setInterval(() => {
    //   const options = {
    //     unit: 'bpm' as const,
    //     startDate: new Date(Date.now() - 10000).toISOString(), // 최근 10초 이내
    //     ascending: false,
    //     limit: 1,
    //   };
    //
    //   AppleHealthKit.getHeartRateSamples(
    //     options,
    //     (err: string, results: HealthValue[]) => {
    //       if (err) {
    //         console.error('[HealthKit] Heart rate query failed:', err);
    //         this.heartRateCallback?.(undefined);
    //         return;
    //       }
    //
    //       if (results && results.length > 0) {
    //         const data: HeartRateData = {
    //           bpm: Math.round(results[0].value),
    //           timestamp: new Date(results[0].startDate).getTime(),
    //           source: 'phone_health_kit',
    //         };
    //         this.heartRateCallback?.(data);
    //       } else {
    //         // 데이터 없음 (정책: undefined 반환)
    //         this.heartRateCallback?.(undefined);
    //       }
    //     }
    //   );
    // }, 1000); // 1초 간격

    console.log('[HealthKit] Heart rate monitoring skipped (library not configured)');
    callback(undefined);
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
   * 정책: 1초 간격 실시간 폴링, StepCount를 1분 단위로 계산
   */
  async startCadenceMonitoring(
    callback: (data: CadenceData | undefined) => void
  ): Promise<void> {
    if (Platform.OS !== 'ios') {
      callback(undefined);
      return;
    }

    if (!this.isInitialized) {
      console.warn('[HealthKit] Not initialized, cannot start cadence monitoring');
      callback(undefined);
      return;
    }

    this.cadenceCallback = callback;

    // TODO: react-native-health 라이브러리가 설치되면 아래 주석 해제
    // let previousStepCount = 0;
    // let previousTimestamp = Date.now();
    //
    // // 1초 간격으로 걸음 수 조회 및 케이던스 계산
    // this.cadenceInterval = setInterval(() => {
    //   const options = {
    //     startDate: new Date(Date.now() - 60000).toISOString(), // 최근 1분
    //     endDate: new Date().toISOString(),
    //   };
    //
    //   AppleHealthKit.getStepCount(
    //     options,
    //     (err: string, results: HealthValue) => {
    //       if (err) {
    //         console.error('[HealthKit] Step count query failed:', err);
    //         this.cadenceCallback?.(undefined);
    //         return;
    //       }
    //
    //       if (results && results.value !== undefined) {
    //         const currentTimestamp = Date.now();
    //         const elapsedMinutes = (currentTimestamp - previousTimestamp) / 60000;
    //
    //         // 걸음 수 증분 계산
    //         const stepIncrement = results.value - previousStepCount;
    //
    //         // 케이던스 = 걸음/분
    //         const stepsPerMinute = elapsedMinutes > 0
    //           ? Math.round(stepIncrement / elapsedMinutes)
    //           : 0;
    //
    //         if (stepsPerMinute > 0) {
    //           const data: CadenceData = {
    //             stepsPerMinute,
    //             timestamp: currentTimestamp,
    //             source: 'phone_health_kit',
    //           };
    //           this.cadenceCallback?.(data);
    //         } else {
    //           // 데이터 없음 (정책: undefined 반환)
    //           this.cadenceCallback?.(undefined);
    //         }
    //
    //         previousStepCount = results.value;
    //         previousTimestamp = currentTimestamp;
    //       } else {
    //         // 데이터 없음
    //         this.cadenceCallback?.(undefined);
    //       }
    //     }
    //   );
    // }, 1000); // 1초 간격

    console.log('[HealthKit] Cadence monitoring skipped (library not configured)');
    callback(undefined);
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
    if (Platform.OS !== 'ios' || !this.isInitialized) {
      return undefined;
    }

    // TODO: react-native-health 라이브러리가 설치되면 아래 주석 해제
    // return new Promise((resolve) => {
    //   const options = {
    //     unit: 'bpm' as const,
    //     startDate: new Date(Date.now() - 60000).toISOString(), // 최근 1분
    //     ascending: false,
    //     limit: 1,
    //   };
    //
    //   AppleHealthKit.getHeartRateSamples(
    //     options,
    //     (err: string, results: HealthValue[]) => {
    //       if (err || !results || results.length === 0) {
    //         resolve(undefined);
    //         return;
    //       }
    //       resolve(Math.round(results[0].value));
    //     }
    //   );
    // });

    console.log('[HealthKit] Get current heart rate skipped (library not configured)');
    return undefined;
  }

  /**
   * 현재 케이던스 조회
   */
  async getCurrentCadence(): Promise<number | undefined> {
    if (Platform.OS !== 'ios' || !this.isInitialized) {
      return undefined;
    }

    // TODO: react-native-health 라이브러리가 설치되면 아래 주석 해제
    // return new Promise((resolve) => {
    //   const options = {
    //     startDate: new Date(Date.now() - 60000).toISOString(), // 최근 1분
    //     endDate: new Date().toISOString(),
    //   };
    //
    //   AppleHealthKit.getStepCount(
    //     options,
    //     (err: string, results: HealthValue) => {
    //       if (err || !results || results.value === undefined) {
    //         resolve(undefined);
    //         return;
    //       }
    //       // 1분간 걸음 수 = 케이던스
    //       resolve(Math.round(results.value));
    //     }
    //   );
    // });

    console.log('[HealthKit] Get current cadence skipped (library not configured)');
    return undefined;
  }

  /**
   * 칼로리 계산
   * HealthKit의 ActiveEnergyBurned 우선, 없으면 자체 계산
   */
  async calculateCalories(params: {
    distance: number;
    duration: number;
    weight?: number;
    heartRate?: number;
  }): Promise<number | undefined> {
    if (Platform.OS !== 'ios' || !this.isInitialized) {
      return undefined;
    }

    // TODO: react-native-health 라이브러리가 설치되면 아래 주석 해제
    // HealthKit에서 ActiveEnergyBurned 조회 시도
    // return new Promise((resolve) => {
    //   const options = {
    //     startDate: new Date(Date.now() - params.duration * 1000).toISOString(),
    //     endDate: new Date().toISOString(),
    //     ascending: false,
    //   };
    //
    //   AppleHealthKit.getActiveEnergyBurned(
    //     options,
    //     (err: string, results: HealthValue[]) => {
    //       if (err || !results || results.length === 0) {
    //         // Fallback: MET 공식 사용
    //         const weight = params.weight || 70;
    //         const hours = params.duration / 3600;
    //         const met = 9.8; // 러닝 MET
    //         const calories = met * weight * hours;
    //         resolve(calories);
    //         return;
    //       }
    //
    //       // HealthKit의 칼로리 합산
    //       const totalCalories = results.reduce((sum, item) => sum + item.value, 0);
    //       resolve(totalCalories);
    //     }
    //   );
    // });

    // Fallback: MET 공식 사용
    console.log('[HealthKit] Calculate calories skipped (library not configured), using MET formula');
    const weight = params.weight || 70;
    const hours = params.duration / 3600;
    const met = 9.8; // 러닝 MET
    const calories = met * weight * hours;
    return calories;
  }
}

// Singleton export
export const healthKitService = HealthKitService.getInstance();
