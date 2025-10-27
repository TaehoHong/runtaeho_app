/**
 * Data Source Priority Service
 * 데이터 소스 우선순위 관리 서비스
 *
 * 정책: Priority Fallback (실시간 데이터 수집)
 * 1. Garmin (최우선)
 * 2. WatchOS/WearOS - 전용 앱 설치된 경우만
 * 3. Phone (HealthKit / Google Fit)
 * 4. null (모든 디바이스에서 수집 실패)
 *
 * - 각 우선순위에서 실시간 데이터 수집 시도
 * - 실시간 수집 불가 시 다음 우선순위로 자동 fallback
 * - 모든 소스에서 실패 시 undefined 반환 (UI: "--")
 */

import { Platform } from 'react-native';
import { HealthKitService } from './HealthKitService';
import { GoogleFitService } from './GoogleFitService';
import { GarminService } from './GarminService';
import { WatchService } from './WatchService';
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

  // 센서 서비스들 (Priority 순서)
  private garminService: ISensorService;        // Priority 1
  private watchService: ISensorService;          // Priority 2
  private healthKitService: ISensorService;      // Priority 3 (iOS)
  private googleFitService: ISensorService;      // Priority 3 (Android)

  // 디바이스 사용 가능 여부
  private garminAvailable = false;
  private watchAvailable = false;
  private phoneAvailable = false;

  // 현재 활성 센서 소스
  private activeHeartRateSource: DataSource | null = null;
  private activeCadenceSource: DataSource | null = null;

  // 웨어러블 연결 상태
  private wearableConnected = false;

  private constructor() {
    this.garminService = GarminService.getInstance();
    this.watchService = WatchService.getInstance();
    this.healthKitService = HealthKitService.getInstance();
    this.googleFitService = GoogleFitService.getInstance();

    this.checkAvailableDevices();
  }

  /**
   * 사용 가능한 디바이스 확인
   * 정책: Priority 순서대로 체크
   */
  private async checkAvailableDevices(): Promise<void> {
    try {
      // Priority 1: Garmin
      this.garminAvailable = await this.garminService.isAvailable();
      console.log(`[DataSourcePriority] Garmin available: ${this.garminAvailable}`);

      // Priority 2: Watch (with app)
      this.watchAvailable = await this.watchService.isAvailable();
      console.log(`[DataSourcePriority] Watch available: ${this.watchAvailable}`);

      // Priority 3: Phone
      const phoneSensor = this.getPhoneSensorService();
      if (phoneSensor) {
        this.phoneAvailable = await phoneSensor.isAvailable();
        console.log(`[DataSourcePriority] Phone sensor available: ${this.phoneAvailable}`);
      }
    } catch (error) {
      console.error('[DataSourcePriority] Check available devices failed:', error);
    }
  }

  static getInstance(): DataSourcePriorityService {
    if (!DataSourcePriorityService.instance) {
      DataSourcePriorityService.instance = new DataSourcePriorityService();
    }
    return DataSourcePriorityService.instance;
  }

  /**
   * 디바이스 사용 가능 여부 재확인
   * 주기적으로 호출하여 디바이스 연결 상태 업데이트
   */
  async refreshAvailability(): Promise<void> {
    await this.checkAvailableDevices();
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
   * 정책: Priority Fallback (Garmin → Watch → Phone → null)
   * - 각 우선순위에서 실시간 데이터 수집 시도
   * - undefined 반환 시 다음 우선순위로 자동 fallback
   */
  async startHeartRateMonitoring(
    callback: (data: SensorDataResult<number>) => void
  ): Promise<void> {
    let dataReceived = false;

    // Priority 1: Garmin
    if (this.garminAvailable) {
      console.log('[DataSourcePriority] Trying Garmin heart rate (Priority 1)');
      await this.garminService.startHeartRateMonitoring((data) => {
        if (data && data.bpm !== undefined) {
          // 실시간 데이터 수집 성공
          dataReceived = true;
          this.activeHeartRateSource = data.source;
          callback({ value: data.bpm, source: data.source });
        } else if (!dataReceived) {
          // Garmin에서 데이터 없음 → fallback to Priority 2
          console.log('[DataSourcePriority] Garmin no data, fallback to Watch');
          this.tryWatchHeartRate(callback);
        }
      });
      return;
    }

    // Priority 2: Watch (with app)
    if (this.watchAvailable) {
      console.log('[DataSourcePriority] Trying Watch heart rate (Priority 2)');
      await this.tryWatchHeartRate(callback);
      return;
    }

    // Priority 3: Phone sensor
    if (this.phoneAvailable) {
      console.log('[DataSourcePriority] Trying Phone sensor heart rate (Priority 3)');
      await this.tryPhoneHeartRate(callback);
      return;
    }

    // Priority 4: No data available
    console.log('[DataSourcePriority] No heart rate source available');
    callback({ value: undefined, source: 'none' });
  }

  /**
   * Watch 심박수 시도
   */
  private async tryWatchHeartRate(
    callback: (data: SensorDataResult<number>) => void
  ): Promise<void> {
    let dataReceived = false;

    await this.watchService.startHeartRateMonitoring((data) => {
      if (data && data.bpm !== undefined) {
        dataReceived = true;
        this.activeHeartRateSource = data.source;
        callback({ value: data.bpm, source: data.source });
      } else if (!dataReceived) {
        // Watch에서 데이터 없음 → fallback to Priority 3
        console.log('[DataSourcePriority] Watch no data, fallback to Phone');
        this.tryPhoneHeartRate(callback);
      }
    });
  }

  /**
   * Phone 센서 심박수 시도
   */
  private async tryPhoneHeartRate(
    callback: (data: SensorDataResult<number>) => void
  ): Promise<void> {
    const phoneSensor = this.getPhoneSensorService();
    if (!phoneSensor) {
      callback({ value: undefined, source: 'none' });
      return;
    }

    await phoneSensor.startHeartRateMonitoring((data) => {
      if (data && data.bpm !== undefined) {
        this.activeHeartRateSource = data.source;
        callback({ value: data.bpm, source: data.source });
      } else {
        // 모든 소스에서 데이터 없음 (정책: null)
        callback({ value: undefined, source: 'none' });
      }
    });
  }

  /**
   * 심박수 모니터링 중지
   */
  async stopHeartRateMonitoring(): Promise<void> {
    // 모든 센서 중지
    await this.garminService.stopHeartRateMonitoring();
    await this.watchService.stopHeartRateMonitoring();

    const phoneSensor = this.getPhoneSensorService();
    if (phoneSensor) {
      await phoneSensor.stopHeartRateMonitoring();
    }

    this.activeHeartRateSource = null;
    console.log('[DataSourcePriority] Heart rate monitoring stopped');
  }

  /**
   * 케이던스 모니터링 시작
   * 정책: Priority Fallback (Garmin → Watch → Phone → null)
   */
  async startCadenceMonitoring(
    callback: (data: SensorDataResult<number>) => void
  ): Promise<void> {
    let dataReceived = false;

    // Priority 1: Garmin
    if (this.garminAvailable) {
      console.log('[DataSourcePriority] Trying Garmin cadence (Priority 1)');
      await this.garminService.startCadenceMonitoring((data) => {
        if (data && data.stepsPerMinute !== undefined) {
          dataReceived = true;
          this.activeCadenceSource = data.source;
          callback({ value: data.stepsPerMinute, source: data.source });
        } else if (!dataReceived) {
          console.log('[DataSourcePriority] Garmin no data, fallback to Watch');
          this.tryWatchCadence(callback);
        }
      });
      return;
    }

    // Priority 2: Watch (with app)
    if (this.watchAvailable) {
      console.log('[DataSourcePriority] Trying Watch cadence (Priority 2)');
      await this.tryWatchCadence(callback);
      return;
    }

    // Priority 3: Phone sensor
    if (this.phoneAvailable) {
      console.log('[DataSourcePriority] Trying Phone sensor cadence (Priority 3)');
      await this.tryPhoneCadence(callback);
      return;
    }

    // Priority 4: No data available
    console.log('[DataSourcePriority] No cadence source available');
    callback({ value: undefined, source: 'none' });
  }

  /**
   * Watch 케이던스 시도
   */
  private async tryWatchCadence(
    callback: (data: SensorDataResult<number>) => void
  ): Promise<void> {
    let dataReceived = false;

    await this.watchService.startCadenceMonitoring((data) => {
      if (data && data.stepsPerMinute !== undefined) {
        dataReceived = true;
        this.activeCadenceSource = data.source;
        callback({ value: data.stepsPerMinute, source: data.source });
      } else if (!dataReceived) {
        console.log('[DataSourcePriority] Watch no data, fallback to Phone');
        this.tryPhoneCadence(callback);
      }
    });
  }

  /**
   * Phone 센서 케이던스 시도
   */
  private async tryPhoneCadence(
    callback: (data: SensorDataResult<number>) => void
  ): Promise<void> {
    const phoneSensor = this.getPhoneSensorService();
    if (!phoneSensor) {
      callback({ value: undefined, source: 'none' });
      return;
    }

    await phoneSensor.startCadenceMonitoring((data) => {
      if (data && data.stepsPerMinute !== undefined) {
        this.activeCadenceSource = data.source;
        callback({ value: data.stepsPerMinute, source: data.source });
      } else {
        // 모든 소스에서 데이터 없음 (정책: null)
        callback({ value: undefined, source: 'none' });
      }
    });
  }

  /**
   * 케이던스 모니터링 중지
   */
  async stopCadenceMonitoring(): Promise<void> {
    // 모든 센서 중지
    await this.garminService.stopCadenceMonitoring();
    await this.watchService.stopCadenceMonitoring();

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
