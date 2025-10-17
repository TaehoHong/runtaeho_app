/**
 * Data Source Priority Service
 * 데이터 소스 우선순위 관리 서비스
 * 우선순위: 웨어러블 (WatchOS/WearOS/Garmin) → 핸드폰 센서 → undefined
 */

import { Platform } from 'react-native';
import { HealthKitService } from './HealthKitService';
import { GoogleFitService } from './GoogleFitService';
import type {
  HeartRateData,
  CadenceData,
  CalorieData,
  ISensorService,
} from './SensorTypes';
import { DataSource } from './SensorTypes';


/**
 * 센서 데이터 우선순위 결과
 */
export interface SensorDataResult<T> {
  value: T | undefined;
  source: DataSource | 'none';
}

/**
 * Data Source Priority Service
 */
export class DataSourcePriorityService {
  private static instance: DataSourcePriorityService;

  // 핸드폰 센서 서비스
  private healthKitService: ISensorService;
  private googleFitService: ISensorService;

  // 웨어러블 연결 상태
  private wearableConnected = false;
  private wearableType: 'watch_os' | 'wear_os' | 'garmin' | null = null;

  // 현재 활성 센서 소스
  private activeHeartRateSource: DataSource | null = null;
  private activeCadenceSource: DataSource | null = null;

  private constructor() {
    this.healthKitService = HealthKitService.getInstance();
    this.googleFitService = GoogleFitService.getInstance();
  }

  static getInstance(): DataSourcePriorityService {
    if (!DataSourcePriorityService.instance) {
      DataSourcePriorityService.instance = new DataSourcePriorityService();
    }
    return DataSourcePriorityService.instance;
  }

  /**
   * 웨어러블 연결 상태 설정
   */
  setWearableConnection(
    connected: boolean,
    type?: 'watch_os' | 'wear_os' | 'garmin'
  ): void {
    this.wearableConnected = connected;
    this.wearableType = connected && type ? type : null;
    console.log(`[DataSourcePriority] Wearable connection: ${connected}, type: ${type}`);
  }

  /**
   * 웨어러블 연결 여부 확인
   */
  isWearableConnected(): boolean {
    return this.wearableConnected;
  }

  /**
   * 사용 가능한 센서 서비스 가져오기
   */
  private getPhoneSensorService(): ISensorService | null {
    if (Platform.OS === 'ios') {
      return this.healthKitService;
    } else if (Platform.OS === 'android') {
      return this.googleFitService;
    }
    return null;
  }

  /**
   * 심박수 모니터링 시작
   * 우선순위에 따라 데이터 소스 선택
   */
  async startHeartRateMonitoring(
    callback: (data: SensorDataResult<number>) => void
  ): Promise<void> {
    // 1순위: 웨어러블
    if (this.wearableConnected) {
      // TODO: 웨어러블에서 심박수 가져오기
      // await this.startWearableHeartRate(callback);
      console.log('[DataSourcePriority] Wearable heart rate monitoring (TODO)');
      callback({ value: undefined, source: 'none' });
      return;
    }

    // 2순위: 핸드폰 센서 (HealthKit/Google Fit)
    const phoneSensor = this.getPhoneSensorService();
    if (phoneSensor) {
      const isAvailable = await phoneSensor.isAvailable();
      if (isAvailable) {
        await phoneSensor.startHeartRateMonitoring((data) => {
          if (data) {
            this.activeHeartRateSource = data.source;
            callback({ value: data.bpm, source: data.source });
          } else {
            callback({ value: undefined, source: 'none' });
          }
        });
        console.log('[DataSourcePriority] Phone sensor heart rate monitoring started');
        return;
      }
    }

    // 3순위: 데이터 없음 (undefined)
    console.log('[DataSourcePriority] No heart rate source available');
    callback({ value: undefined, source: 'none' });
  }

  /**
   * 심박수 모니터링 중지
   */
  async stopHeartRateMonitoring(): Promise<void> {
    // 웨어러블 중지
    if (this.wearableConnected) {
      // TODO: 웨어러블 심박수 모니터링 중지
      console.log('[DataSourcePriority] Stopping wearable heart rate (TODO)');
    }

    // 핸드폰 센서 중지
    const phoneSensor = this.getPhoneSensorService();
    if (phoneSensor) {
      await phoneSensor.stopHeartRateMonitoring();
    }

    this.activeHeartRateSource = null;
    console.log('[DataSourcePriority] Heart rate monitoring stopped');
  }

  /**
   * 케이던스 모니터링 시작
   * 우선순위에 따라 데이터 소스 선택
   */
  async startCadenceMonitoring(
    callback: (data: SensorDataResult<number>) => void
  ): Promise<void> {
    // 1순위: 웨어러블
    if (this.wearableConnected) {
      // TODO: 웨어러블에서 케이던스 가져오기
      console.log('[DataSourcePriority] Wearable cadence monitoring (TODO)');
      callback({ value: undefined, source: 'none' });
      return;
    }

    // 2순위: 핸드폰 센서 (HealthKit/Google Fit/가속도계)
    const phoneSensor = this.getPhoneSensorService();
    if (phoneSensor) {
      const isAvailable = await phoneSensor.isAvailable();
      if (isAvailable) {
        await phoneSensor.startCadenceMonitoring((data) => {
          if (data) {
            this.activeCadenceSource = data.source;
            callback({ value: data.stepsPerMinute, source: data.source });
          } else {
            callback({ value: undefined, source: 'none' });
          }
        });
        console.log('[DataSourcePriority] Phone sensor cadence monitoring started');
        return;
      }
    }

    // 3순위: 데이터 없음 (undefined)
    console.log('[DataSourcePriority] No cadence source available');
    callback({ value: undefined, source: 'none' });
  }

  /**
   * 케이던스 모니터링 중지
   */
  async stopCadenceMonitoring(): Promise<void> {
    // 웨어러블 중지
    if (this.wearableConnected) {
      // TODO: 웨어러블 케이던스 모니터링 중지
      console.log('[DataSourcePriority] Stopping wearable cadence (TODO)');
    }

    // 핸드폰 센서 중지
    const phoneSensor = this.getPhoneSensorService();
    if (phoneSensor) {
      await phoneSensor.stopCadenceMonitoring();
    }

    this.activeCadenceSource = null;
    console.log('[DataSourcePriority] Cadence monitoring stopped');
  }

  /**
   * 현재 심박수 조회
   */
  async getCurrentHeartRate(): Promise<SensorDataResult<number>> {
    // 1순위: 웨어러블
    if (this.wearableConnected) {
      // TODO: 웨어러블에서 심박수 조회
      // const wearableHeartRate = await this.getWearableHeartRate();
      // if (wearableHeartRate !== undefined) {
      //   return { value: wearableHeartRate, source: DataSource.WEARABLE_* };
      // }
    }

    // 2순위: 핸드폰 센서
    const phoneSensor = this.getPhoneSensorService();
    if (phoneSensor) {
      const heartRate = await phoneSensor.getCurrentHeartRate();
      if (heartRate !== undefined) {
        const source = Platform.OS === 'ios'
          ? DataSource.PHONE_HEALTH_KIT
          : DataSource.PHONE_GOOGLE_FIT;
        return { value: heartRate, source };
      }
    }

    // 3순위: undefined
    return { value: undefined, source: 'none' };
  }

  /**
   * 현재 케이던스 조회
   */
  async getCurrentCadence(): Promise<SensorDataResult<number>> {
    // 1순위: 웨어러블
    if (this.wearableConnected) {
      // TODO: 웨어러블에서 케이던스 조회
    }

    // 2순위: 핸드폰 센서
    const phoneSensor = this.getPhoneSensorService();
    if (phoneSensor) {
      const cadence = await phoneSensor.getCurrentCadence();
      if (cadence !== undefined) {
        const source = Platform.OS === 'ios'
          ? DataSource.PHONE_HEALTH_KIT
          : DataSource.PHONE_GOOGLE_FIT;
        return { value: cadence, source };
      }
    }

    // 3순위: undefined
    return { value: undefined, source: 'none' };
  }

  /**
   * 칼로리 계산
   * 우선순위: 웨어러블 → 핸드폰 센서 → MET 공식
   */
  async calculateCalories(params: {
    distance: number;
    duration: number;
    weight?: number;
    heartRate?: number;
  }): Promise<SensorDataResult<number>> {
    // 1순위: 웨어러블
    if (this.wearableConnected) {
      // TODO: 웨어러블에서 칼로리 조회
    }

    // 2순위: 핸드폰 센서
    const phoneSensor = this.getPhoneSensorService();
    if (phoneSensor) {
      const calories = await phoneSensor.calculateCalories(params);
      if (calories !== undefined) {
        const source = Platform.OS === 'ios'
          ? DataSource.PHONE_HEALTH_KIT
          : DataSource.PHONE_GOOGLE_FIT;
        return { value: calories, source };
      }
    }

    // 3순위: MET 공식 (Fallback)
    const weight = params.weight || 70;
    const hours = params.duration / 3600;
    const met = 9.8;
    const calories = met * weight * hours;

    return { value: calories, source: DataSource.FALLBACK };
  }

  /**
   * 모든 센서 모니터링 시작
   */
  async startAllMonitoring(callbacks: {
    onHeartRate: (data: SensorDataResult<number>) => void;
    onCadence: (data: SensorDataResult<number>) => void;
  }): Promise<void> {
    await this.startHeartRateMonitoring(callbacks.onHeartRate);
    await this.startCadenceMonitoring(callbacks.onCadence);
    console.log('[DataSourcePriority] All monitoring started');
  }

  /**
   * 모든 센서 모니터링 중지
   */
  async stopAllMonitoring(): Promise<void> {
    await this.stopHeartRateMonitoring();
    await this.stopCadenceMonitoring();
    console.log('[DataSourcePriority] All monitoring stopped');
  }

  /**
   * 활성 데이터 소스 정보
   */
  getActiveDataSources(): {
    heartRate: DataSource | null;
    cadence: DataSource | null;
    wearableConnected: boolean;
  } {
    return {
      heartRate: this.activeHeartRateSource,
      cadence: this.activeCadenceSource,
      wearableConnected: this.wearableConnected,
    };
  }
}

// Singleton export
export const dataSourcePriorityService = DataSourcePriorityService.getInstance();
