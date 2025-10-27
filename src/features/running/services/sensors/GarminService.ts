/**
 * Garmin Service
 * Garmin 디바이스를 통한 심박수, 케이던스, 칼로리 데이터 수집
 *
 * 정책: Priority 1 - 최우선 센서 데이터 소스
 * - Garmin Health SDK / Connect API 사용
 * - 실시간 데이터 스트리밍
 * - 데이터 없으면 undefined 반환 → 다음 우선순위로 fallback
 */

import { Platform } from 'react-native';
import type {
  ISensorService,
  HeartRateData,
  CadenceData,
  PermissionResult,
} from './SensorTypes';

/**
 * Garmin Service
 * Priority 1 센서 데이터 제공자
 *
 * TODO: Garmin Health SDK 설치
 * - React Native용 Garmin Connect IQ SDK 래퍼 설치
 * - 또는 네이티브 모듈 브리지 구현 (iOS/Android)
 *
 * TODO: Garmin Device Manager 통합
 * - 페어링된 Garmin 디바이스 검색
 * - 디바이스 연결 상태 모니터링
 * - 자동 재연결 로직
 */
export class GarminService implements ISensorService {
  private static instance: GarminService;
  private heartRateCallback: ((data: HeartRateData | undefined) => void) | null = null;
  private cadenceCallback: ((data: CadenceData | undefined) => void) | null = null;
  private isConnected = false;
  private deviceId: string | null = null;

  private constructor() {
    this.initializeGarminSDK();
  }

  static getInstance(): GarminService {
    if (!GarminService.instance) {
      GarminService.instance = new GarminService();
    }
    return GarminService.instance;
  }

  /**
   * Garmin SDK 초기화
   *
   * TODO: Garmin Health SDK 초기화
   * - iOS: Garmin Connect Mobile SDK
   * - Android: Garmin Health SDK
   * - API Key 및 Consumer Secret 설정
   * - SDK 인증 및 세션 관리
   */
  private async initializeGarminSDK(): Promise<void> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return;
    }

    try {
      // TODO: Garmin SDK 초기화 코드
      // const GarminSDK = require('react-native-garmin-health');
      // await GarminSDK.initialize({
      //   apiKey: GARMIN_API_KEY,
      //   consumerSecret: GARMIN_CONSUMER_SECRET,
      // });
      //
      // console.log('[GarminService] SDK initialized');

      console.log('[GarminService] SDK initialization skipped (TODO)');
    } catch (error) {
      console.error('[GarminService] SDK initialization failed:', error);
    }
  }

  /**
   * Garmin 디바이스 사용 가능 여부
   *
   * TODO: 페어링된 Garmin 디바이스 검색
   * - Garmin Connect Mobile 앱과 연동 확인
   * - 페어링된 디바이스 목록 조회
   * - 활성 디바이스 선택
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return false;
    }

    try {
      // TODO: Garmin 디바이스 검색
      // const GarminSDK = require('react-native-garmin-health');
      // const devices = await GarminSDK.getConnectedDevices();
      //
      // if (devices && devices.length > 0) {
      //   this.deviceId = devices[0].id;
      //   this.isConnected = true;
      //   console.log('[GarminService] Device found:', devices[0].name);
      //   return true;
      // }

      console.log('[GarminService] Device check skipped (TODO)');
      return false; // 구현 전까지는 false 반환
    } catch (error) {
      console.error('[GarminService] Device check failed:', error);
      return false;
    }
  }

  /**
   * Garmin 권한 확인
   *
   * TODO: Garmin Health 데이터 접근 권한 확인
   * - Garmin Connect 앱 인증 상태 확인
   * - Health 데이터 읽기 권한 확인
   */
  async checkPermissions(): Promise<PermissionResult> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return { status: 'denied' };
    }

    try {
      // TODO: Garmin 권한 확인
      // const GarminSDK = require('react-native-garmin-health');
      // const authStatus = await GarminSDK.getAuthorizationStatus();
      //
      // if (authStatus === 'authorized') {
      //   return { status: 'granted' };
      // } else if (authStatus === 'not_determined') {
      //   return { status: 'undetermined' };
      // }

      console.log('[GarminService] Permission check skipped (TODO)');
      return { status: 'undetermined' };
    } catch (error) {
      console.error('[GarminService] Permission check failed:', error);
      return { status: 'denied' };
    }
  }

  /**
   * Garmin 권한 요청
   *
   * TODO: Garmin Connect 앱 인증 및 권한 요청
   * - OAuth 2.0 인증 플로우
   * - Health 데이터 읽기 권한 요청
   * - 사용자 동의 화면 표시
   */
  async requestPermissions(): Promise<PermissionResult> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return { status: 'denied' };
    }

    try {
      // TODO: Garmin 권한 요청
      // const GarminSDK = require('react-native-garmin-health');
      // const result = await GarminSDK.requestAuthorization({
      //   scopes: ['HEART_RATE', 'STEPS', 'CALORIES'],
      // });
      //
      // if (result.success) {
      //   console.log('[GarminService] Permissions granted');
      //   return { status: 'granted' };
      // }

      console.log('[GarminService] Permission request skipped (TODO)');
      return { status: 'undetermined' };
    } catch (error) {
      console.error('[GarminService] Permission request failed:', error);
      return { status: 'denied' };
    }
  }

  /**
   * 심박수 모니터링 시작
   * 정책: 1초 간격 실시간 스트리밍
   *
   * TODO: Garmin 실시간 심박수 스트림 구독
   * - Garmin Health SDK의 실시간 데이터 리스너 등록
   * - WebSocket 또는 BLE 연결을 통한 실시간 수신
   * - 연결 끊김 시 자동 재연결
   * - 데이터 없으면 undefined 반환
   */
  async startHeartRateMonitoring(
    callback: (data: HeartRateData | undefined) => void
  ): Promise<void> {
    if (!this.isConnected) {
      console.warn('[GarminService] Device not connected');
      callback(undefined);
      return;
    }

    this.heartRateCallback = callback;

    try {
      // TODO: Garmin 심박수 스트림 구독
      // const GarminSDK = require('react-native-garmin-health');
      //
      // GarminSDK.subscribeToHeartRate(this.deviceId, (data) => {
      //   if (data && data.bpm) {
      //     const heartRateData: HeartRateData = {
      //       bpm: Math.round(data.bpm),
      //       timestamp: Date.now(),
      //       source: 'wearable_garmin',
      //     };
      //     this.heartRateCallback?.(heartRateData);
      //   } else {
      //     // 데이터 없음 (정책: undefined 반환)
      //     this.heartRateCallback?.(undefined);
      //   }
      // });
      //
      // console.log('[GarminService] Heart rate monitoring started');

      console.log('[GarminService] Heart rate monitoring skipped (TODO)');
      callback(undefined);
    } catch (error) {
      console.error('[GarminService] Heart rate monitoring failed:', error);
      callback(undefined);
    }
  }

  /**
   * 심박수 모니터링 중지
   *
   * TODO: Garmin 심박수 스트림 구독 해제
   */
  async stopHeartRateMonitoring(): Promise<void> {
    try {
      // TODO: Garmin 심박수 구독 해제
      // const GarminSDK = require('react-native-garmin-health');
      // GarminSDK.unsubscribeFromHeartRate(this.deviceId);

      this.heartRateCallback = null;
      console.log('[GarminService] Heart rate monitoring stopped');
    } catch (error) {
      console.error('[GarminService] Stop heart rate monitoring failed:', error);
    }
  }

  /**
   * 케이던스 모니터링 시작
   * 정책: 1초 간격 실시간 스트리밍
   *
   * TODO: Garmin 실시간 케이던스 스트림 구독
   * - Running Dynamics 데이터 구독
   * - 케이던스 = 분당 걸음 수 (SPM)
   */
  async startCadenceMonitoring(
    callback: (data: CadenceData | undefined) => void
  ): Promise<void> {
    if (!this.isConnected) {
      console.warn('[GarminService] Device not connected');
      callback(undefined);
      return;
    }

    this.cadenceCallback = callback;

    try {
      // TODO: Garmin 케이던스 스트림 구독
      // const GarminSDK = require('react-native-garmin-health');
      //
      // GarminSDK.subscribeToRunningDynamics(this.deviceId, (data) => {
      //   if (data && data.cadence) {
      //     const cadenceData: CadenceData = {
      //       stepsPerMinute: Math.round(data.cadence),
      //       timestamp: Date.now(),
      //       source: 'wearable_garmin',
      //     };
      //     this.cadenceCallback?.(cadenceData);
      //   } else {
      //     // 데이터 없음 (정책: undefined 반환)
      //     this.cadenceCallback?.(undefined);
      //   }
      // });
      //
      // console.log('[GarminService] Cadence monitoring started');

      console.log('[GarminService] Cadence monitoring skipped (TODO)');
      callback(undefined);
    } catch (error) {
      console.error('[GarminService] Cadence monitoring failed:', error);
      callback(undefined);
    }
  }

  /**
   * 케이던스 모니터링 중지
   *
   * TODO: Garmin 케이던스 스트림 구독 해제
   */
  async stopCadenceMonitoring(): Promise<void> {
    try {
      // TODO: Garmin 케이던스 구독 해제
      // const GarminSDK = require('react-native-garmin-health');
      // GarminSDK.unsubscribeFromRunningDynamics(this.deviceId);

      this.cadenceCallback = null;
      console.log('[GarminService] Cadence monitoring stopped');
    } catch (error) {
      console.error('[GarminService] Stop cadence monitoring failed:', error);
    }
  }

  /**
   * 현재 심박수 조회 (최신 1개)
   *
   * TODO: Garmin에서 최신 심박수 조회
   */
  async getCurrentHeartRate(): Promise<number | undefined> {
    if (!this.isConnected) {
      return undefined;
    }

    try {
      // TODO: Garmin 최신 심박수 조회
      // const GarminSDK = require('react-native-garmin-health');
      // const data = await GarminSDK.getLatestHeartRate(this.deviceId);
      //
      // if (data && data.bpm) {
      //   return Math.round(data.bpm);
      // }

      return undefined;
    } catch (error) {
      console.error('[GarminService] Get current heart rate failed:', error);
      return undefined;
    }
  }

  /**
   * 현재 케이던스 조회
   *
   * TODO: Garmin에서 최신 케이던스 조회
   */
  async getCurrentCadence(): Promise<number | undefined> {
    if (!this.isConnected) {
      return undefined;
    }

    try {
      // TODO: Garmin 최신 케이던스 조회
      // const GarminSDK = require('react-native-garmin-health');
      // const data = await GarminSDK.getLatestCadence(this.deviceId);
      //
      // if (data && data.cadence) {
      //   return Math.round(data.cadence);
      // }

      return undefined;
    } catch (error) {
      console.error('[GarminService] Get current cadence failed:', error);
      return undefined;
    }
  }

  /**
   * 칼로리 계산
   * Garmin의 자체 칼로리 계산 사용
   *
   * TODO: Garmin ActiveCalories 조회
   * - Garmin은 자체 알고리즘으로 칼로리 계산
   * - 더 정확한 칼로리 데이터 제공
   */
  async calculateCalories(params: {
    distance: number;
    duration: number;
    weight?: number;
    heartRate?: number;
  }): Promise<number | undefined> {
    if (!this.isConnected) {
      return undefined;
    }

    try {
      // TODO: Garmin 칼로리 조회
      // const GarminSDK = require('react-native-garmin-health');
      // const data = await GarminSDK.getActiveCalories({
      //   startTime: Date.now() - params.duration * 1000,
      //   endTime: Date.now(),
      // });
      //
      // if (data && data.calories) {
      //   return Math.round(data.calories);
      // }

      // Fallback: MET 공식
      const weight = params.weight || 70;
      const hours = params.duration / 3600;
      const met = 9.8;
      return met * weight * hours;
    } catch (error) {
      console.error('[GarminService] Calculate calories failed:', error);
      return undefined;
    }
  }

  /**
   * Garmin 디바이스 연결 상태 확인
   *
   * TODO: 주기적으로 연결 상태 체크
   * - 5초마다 연결 상태 확인
   * - 연결 끊김 시 재연결 시도
   */
  async checkConnectionStatus(): Promise<boolean> {
    try {
      // TODO: Garmin 연결 상태 확인
      // const GarminSDK = require('react-native-garmin-health');
      // const isConnected = await GarminSDK.isDeviceConnected(this.deviceId);
      //
      // this.isConnected = isConnected;
      // return isConnected;

      return this.isConnected;
    } catch (error) {
      console.error('[GarminService] Connection status check failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Garmin 디바이스 연결 시도
   *
   * TODO: 디바이스 재연결 로직
   * - BLE 스캔 및 페어링
   * - 이전에 페어링된 디바이스 자동 연결
   */
  async reconnectDevice(): Promise<boolean> {
    try {
      // TODO: Garmin 디바이스 재연결
      // const GarminSDK = require('react-native-garmin-health');
      // const success = await GarminSDK.reconnect(this.deviceId);
      //
      // if (success) {
      //   this.isConnected = true;
      //   console.log('[GarminService] Device reconnected');
      //   return true;
      // }

      console.log('[GarminService] Reconnect skipped (TODO)');
      return false;
    } catch (error) {
      console.error('[GarminService] Reconnect failed:', error);
      return false;
    }
  }
}

// Singleton export
export const garminService = GarminService.getInstance();
