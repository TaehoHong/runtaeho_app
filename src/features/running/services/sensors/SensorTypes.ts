/**
 * Sensor Types & Interfaces
 * 웨어러블 및 핸드폰 센서 데이터 타입 정의
 */

/**
 * 센서 데이터 소스
 */
export enum DataSource {
  WEARABLE_WATCH_OS = 'wearable_watch_os',      // Apple Watch
  WEARABLE_WEAR_OS = 'wearable_wear_os',        // Wear OS
  WEARABLE_GARMIN = 'wearable_garmin',          // Garmin
  PHONE_HEALTH_KIT = 'phone_health_kit',        // iOS HealthKit
  PHONE_GOOGLE_FIT = 'phone_google_fit',        // Android Google Fit
  PHONE_SENSORS = 'phone_sensors',              // 핸드폰 내장 센서 (가속도계 등)
  FALLBACK = 'fallback',                        // 계산값
}

/**
 * 센서 데이터 타입
 */
export interface SensorData {
  heartRate?: number;         // BPM (beats per minute)
  cadence?: number;           // 케이던스 (steps per minute)
  calories?: number;          // 칼로리 (kcal)
  speed?: number;             // 속도 (km/h)
  distance?: number;          // 거리 (meters)
  timestamp: number;          // 측정 시간 (Unix timestamp)
  source: DataSource;         // 데이터 소스
}

/**
 * 심박수 데이터
 */
export interface HeartRateData {
  bpm: number;
  timestamp: number;
  source: DataSource;
}

/**
 * 케이던스 데이터
 */
export interface CadenceData {
  stepsPerMinute: number;
  timestamp: number;
  source: DataSource;
}

/**
 * 칼로리 데이터
 */
export interface CalorieData {
  calories: number;
  timestamp: number;
  source: DataSource;
}

/**
 * 센서 권한 상태
 */
export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';

/**
 * 센서 권한 결과
 */
export interface PermissionResult {
  status: PermissionStatus;
  canAskAgain?: boolean;
  expires?: 'never' | number;
}

/**
 * 센서 서비스 인터페이스
 */
export interface ISensorService {
  /**
   * 센서 사용 가능 여부 확인
   */
  isAvailable(): Promise<boolean>;

  /**
   * 권한 확인
   */
  checkPermissions(): Promise<PermissionResult>;

  /**
   * 권한 요청
   */
  requestPermissions(): Promise<PermissionResult>;

  /**
   * 심박수 측정 시작
   */
  startHeartRateMonitoring(callback: (data: HeartRateData | undefined) => void): Promise<void>;

  /**
   * 심박수 측정 중지
   */
  stopHeartRateMonitoring(): Promise<void>;

  /**
   * 케이던스 측정 시작
   */
  startCadenceMonitoring(callback: (data: CadenceData | undefined) => void): Promise<void>;

  /**
   * 케이던스 측정 중지
   */
  stopCadenceMonitoring(): Promise<void>;

  /**
   * 현재 심박수 조회
   */
  getCurrentHeartRate(): Promise<number | undefined>;

  /**
   * 현재 케이던스 조회
   */
  getCurrentCadence(): Promise<number | undefined>;

  /**
   * 칼로리 계산 (소모 칼로리)
   */
  calculateCalories(params: {
    distance: number;       // meters
    duration: number;       // seconds
    weight?: number;        // kg
    heartRate?: number;     // BPM
  }): Promise<number | undefined>;
}
