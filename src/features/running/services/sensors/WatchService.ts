/**
 * Watch Service (WatchOS / WearOS)
 * Apple Watch 및 WearOS 디바이스를 통한 심박수, 케이던스, 칼로리 데이터 수집
 *
 * 정책: Priority 2 - 전용 앱이 설치된 경우에만 사용
 * - WatchOS: WatchConnectivity API 사용
 * - WearOS: Data Layer API 사용
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
 * Watch Service
 * Priority 2 센서 데이터 제공자
 *
 * TODO: WatchConnectivity (iOS) / Data Layer API (Android) 통합
 * - iOS: react-native-watch-connectivity 설치
 * - Android: @react-native-google-wearos/data-layer 설치
 * - 또는 네이티브 모듈 브리지 직접 구현
 *
 * TODO: 전용 Watch 앱 설치 확인
 * - iOS: Watch 앱 번들 확인
 * - Android: WearOS 앱 패키지 확인
 * - 앱 설치 안 되어 있으면 이 서비스 사용 불가
 */
export class WatchService implements ISensorService {
  private static instance: WatchService;
  private heartRateCallback: ((data: HeartRateData | undefined) => void) | null = null;
  private cadenceCallback: ((data: CadenceData | undefined) => void) | null = null;
  private isWatchConnected = false;
  private isWatchAppInstalled = false;
  private watchSessionActive = false;

  private constructor() {
    this.initializeWatchConnectivity();
  }

  static getInstance(): WatchService {
    if (!WatchService.instance) {
      WatchService.instance = new WatchService();
    }
    return WatchService.instance;
  }

  /**
   * Watch Connectivity 초기화
   *
   * TODO: WatchConnectivity (iOS) 초기화
   * - WCSession 활성화
   * - Reachability 모니터링 시작
   * - 메시지 수신 리스너 등록
   *
   * TODO: Data Layer API (Android) 초기화
   * - Wearable.DataClient 초기화
   * - Node 연결 상태 모니터링
   * - 데이터 이벤트 리스너 등록
   */
  private async initializeWatchConnectivity(): Promise<void> {
    if (Platform.OS === 'ios') {
      try {
        // TODO: iOS WatchConnectivity 초기화
        // const WatchConnectivity = require('react-native-watch-connectivity');
        //
        // WatchConnectivity.getIsWatchAppInstalled((error, isInstalled) => {
        //   if (!error && isInstalled) {
        //     this.isWatchAppInstalled = true;
        //     console.log('[WatchService] Watch app is installed');
        //
        //     // WCSession 활성화
        //     WatchConnectivity.startSession();
        //
        //     // Reachability 모니터링
        //     WatchConnectivity.subscribeToReachability((reachable) => {
        //       this.isWatchConnected = reachable;
        //       console.log('[WatchService] Watch reachable:', reachable);
        //     });
        //   } else {
        //     console.log('[WatchService] Watch app not installed');
        //   }
        // });

        console.log('[WatchService] iOS WatchConnectivity initialization skipped (TODO)');
      } catch (error) {
        console.error('[WatchService] iOS initialization failed:', error);
      }
    } else if (Platform.OS === 'android') {
      try {
        // TODO: Android Data Layer API 초기화
        // const { DataClient } = require('@react-native-google-wearos/data-layer');
        //
        // // 연결된 노드(워치) 확인
        // const nodes = await DataClient.getConnectedNodes();
        // if (nodes.length > 0) {
        //   this.isWatchConnected = true;
        //
        //   // WearOS 앱 설치 확인
        //   const capability = await DataClient.getCapability('running_app', 'all');
        //   this.isWatchAppInstalled = capability.nodes.length > 0;
        //
        //   console.log('[WatchService] WearOS connected:', this.isWatchConnected);
        //   console.log('[WatchService] WearOS app installed:', this.isWatchAppInstalled);
        // }

        console.log('[WatchService] Android Data Layer initialization skipped (TODO)');
      } catch (error) {
        console.error('[WatchService] Android initialization failed:', error);
      }
    }
  }

  /**
   * Watch 사용 가능 여부
   * 정책: 워치가 연결되어 있고, 전용 앱이 설치되어 있어야 함
   *
   * TODO: 워치 연결 및 앱 설치 확인
   * - iOS: WCSession.default.isReachable && Watch 앱 설치됨
   * - Android: 연결된 노드 존재 && Capability 확인
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return false;
    }

    try {
      // TODO: 워치 연결 및 앱 설치 상태 확인
      // if (Platform.OS === 'ios') {
      //   const WatchConnectivity = require('react-native-watch-connectivity');
      //   const isReachable = await WatchConnectivity.getIsReachable();
      //   const isInstalled = await WatchConnectivity.getIsWatchAppInstalled();
      //
      //   this.isWatchConnected = isReachable;
      //   this.isWatchAppInstalled = isInstalled;
      //
      //   return isReachable && isInstalled;
      // } else if (Platform.OS === 'android') {
      //   const { DataClient } = require('@react-native-google-wearos/data-layer');
      //   const nodes = await DataClient.getConnectedNodes();
      //   const capability = await DataClient.getCapability('running_app', 'all');
      //
      //   this.isWatchConnected = nodes.length > 0;
      //   this.isWatchAppInstalled = capability.nodes.length > 0;
      //
      //   return this.isWatchConnected && this.isWatchAppInstalled;
      // }

      console.log('[WatchService] Availability check skipped (TODO)');
      return false; // 구현 전까지는 false 반환
    } catch (error) {
      console.error('[WatchService] Availability check failed:', error);
      return false;
    }
  }

  /**
   * Watch 권한 확인
   *
   * TODO: Watch 앱 권한 확인
   * - iOS: HealthKit 권한 (Watch 앱에서 요청)
   * - Android: BODY_SENSORS 권한
   */
  async checkPermissions(): Promise<PermissionResult> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return { status: 'denied' };
    }

    try {
      // TODO: Watch 권한 확인
      // Watch 앱에서 이미 권한을 요청했는지 확인
      // 권한이 없으면 Watch 앱에서 요청하도록 메시지 전송

      console.log('[WatchService] Permission check skipped (TODO)');
      return { status: 'undetermined' };
    } catch (error) {
      console.error('[WatchService] Permission check failed:', error);
      return { status: 'denied' };
    }
  }

  /**
   * Watch 권한 요청
   *
   * TODO: Watch 앱에 권한 요청 메시지 전송
   * - Watch 앱이 권한 요청을 처리
   * - 결과를 폰으로 전송
   */
  async requestPermissions(): Promise<PermissionResult> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return { status: 'denied' };
    }

    try {
      // TODO: Watch 앱에 권한 요청 메시지 전송
      // if (Platform.OS === 'ios') {
      //   const WatchConnectivity = require('react-native-watch-connectivity');
      //   await WatchConnectivity.sendMessage({ action: 'requestPermissions' });
      // } else if (Platform.OS === 'android') {
      //   const { MessageClient } = require('@react-native-google-wearos/data-layer');
      //   await MessageClient.sendMessage('/request_permissions', '');
      // }

      console.log('[WatchService] Permission request skipped (TODO)');
      return { status: 'undetermined' };
    } catch (error) {
      console.error('[WatchService] Permission request failed:', error);
      return { status: 'denied' };
    }
  }

  /**
   * 심박수 모니터링 시작
   * 정책: 워치에서 실시간 심박수 데이터 수신
   *
   * TODO: Watch에서 심박수 스트림 구독
   * - iOS: WCSession 메시지 수신 리스너
   * - Android: DataItem 변경 리스너
   * - 1초 간격으로 데이터 수신
   */
  async startHeartRateMonitoring(
    callback: (data: HeartRateData | undefined) => void
  ): Promise<void> {
    if (!this.isWatchConnected || !this.isWatchAppInstalled) {
      console.warn('[WatchService] Watch not available');
      callback(undefined);
      return;
    }

    this.heartRateCallback = callback;

    try {
      // TODO: Watch 심박수 스트림 구독
      // if (Platform.OS === 'ios') {
      //   const WatchConnectivity = require('react-native-watch-connectivity');
      //
      //   // Watch 앱에 모니터링 시작 요청
      //   await WatchConnectivity.sendMessage({ action: 'startHeartRate' });
      //
      //   // 메시지 수신 리스너
      //   WatchConnectivity.addListener('message', (message) => {
      //     if (message.type === 'heartRate' && message.bpm) {
      //       const data: HeartRateData = {
      //         bpm: Math.round(message.bpm),
      //         timestamp: message.timestamp || Date.now(),
      //         source: Platform.OS === 'ios' ? 'wearable_watch_os' : 'wearable_wear_os',
      //       };
      //       this.heartRateCallback?.(data);
      //     } else if (message.type === 'heartRate') {
      //       // 데이터 없음
      //       this.heartRateCallback?.(undefined);
      //     }
      //   });
      //
      //   this.watchSessionActive = true;
      //   console.log('[WatchService] Heart rate monitoring started (iOS)');
      // } else if (Platform.OS === 'android') {
      //   const { DataClient } = require('@react-native-google-wearos/data-layer');
      //
      //   // WearOS 앱에 모니터링 시작 요청
      //   await DataClient.putDataItem('/start_heart_rate', '');
      //
      //   // DataItem 변경 리스너
      //   DataClient.addListener('dataChanged', (event) => {
      //     const item = event.dataItems.find((item) => item.uri.path === '/heart_rate');
      //     if (item && item.data.bpm) {
      //       const data: HeartRateData = {
      //         bpm: Math.round(item.data.bpm),
      //         timestamp: item.data.timestamp || Date.now(),
      //         source: 'wearable_wear_os',
      //       };
      //       this.heartRateCallback?.(data);
      //     } else if (item) {
      //       // 데이터 없음
      //       this.heartRateCallback?.(undefined);
      //     }
      //   });
      //
      //   this.watchSessionActive = true;
      //   console.log('[WatchService] Heart rate monitoring started (Android)');
      // }

      console.log('[WatchService] Heart rate monitoring skipped (TODO)');
      callback(undefined);
    } catch (error) {
      console.error('[WatchService] Heart rate monitoring failed:', error);
      callback(undefined);
    }
  }

  /**
   * 심박수 모니터링 중지
   *
   * TODO: Watch 심박수 스트림 구독 해제
   */
  async stopHeartRateMonitoring(): Promise<void> {
    try {
      // TODO: Watch 모니터링 중지 요청
      // if (Platform.OS === 'ios') {
      //   const WatchConnectivity = require('react-native-watch-connectivity');
      //   await WatchConnectivity.sendMessage({ action: 'stopHeartRate' });
      //   WatchConnectivity.removeAllListeners('message');
      // } else if (Platform.OS === 'android') {
      //   const { DataClient } = require('@react-native-google-wearos/data-layer');
      //   await DataClient.putDataItem('/stop_heart_rate', '');
      //   DataClient.removeAllListeners('dataChanged');
      // }

      this.heartRateCallback = null;
      this.watchSessionActive = false;
      console.log('[WatchService] Heart rate monitoring stopped');
    } catch (error) {
      console.error('[WatchService] Stop heart rate monitoring failed:', error);
    }
  }

  /**
   * 케이던스 모니터링 시작
   * 정책: 워치에서 실시간 케이던스 데이터 수신
   *
   * TODO: Watch에서 케이던스 스트림 구독
   * - Watch 앱에서 걸음 수 측정
   * - 1분 단위로 케이던스 계산
   */
  async startCadenceMonitoring(
    callback: (data: CadenceData | undefined) => void
  ): Promise<void> {
    if (!this.isWatchConnected || !this.isWatchAppInstalled) {
      console.warn('[WatchService] Watch not available');
      callback(undefined);
      return;
    }

    this.cadenceCallback = callback;

    try {
      // TODO: Watch 케이던스 스트림 구독
      // 로직은 심박수와 유사하지만 케이던스 데이터 처리
      // if (Platform.OS === 'ios') {
      //   const WatchConnectivity = require('react-native-watch-connectivity');
      //   await WatchConnectivity.sendMessage({ action: 'startCadence' });
      //
      //   WatchConnectivity.addListener('message', (message) => {
      //     if (message.type === 'cadence' && message.stepsPerMinute) {
      //       const data: CadenceData = {
      //         stepsPerMinute: Math.round(message.stepsPerMinute),
      //         timestamp: message.timestamp || Date.now(),
      //         source: 'wearable_watch_os',
      //       };
      //       this.cadenceCallback?.(data);
      //     } else if (message.type === 'cadence') {
      //       this.cadenceCallback?.(undefined);
      //     }
      //   });
      //
      //   console.log('[WatchService] Cadence monitoring started (iOS)');
      // } else if (Platform.OS === 'android') {
      //   const { DataClient } = require('@react-native-google-wearos/data-layer');
      //   await DataClient.putDataItem('/start_cadence', '');
      //
      //   DataClient.addListener('dataChanged', (event) => {
      //     const item = event.dataItems.find((item) => item.uri.path === '/cadence');
      //     if (item && item.data.stepsPerMinute) {
      //       const data: CadenceData = {
      //         stepsPerMinute: Math.round(item.data.stepsPerMinute),
      //         timestamp: item.data.timestamp || Date.now(),
      //         source: 'wearable_wear_os',
      //       };
      //       this.cadenceCallback?.(data);
      //     } else if (item) {
      //       this.cadenceCallback?.(undefined);
      //     }
      //   });
      //
      //   console.log('[WatchService] Cadence monitoring started (Android)');
      // }

      console.log('[WatchService] Cadence monitoring skipped (TODO)');
      callback(undefined);
    } catch (error) {
      console.error('[WatchService] Cadence monitoring failed:', error);
      callback(undefined);
    }
  }

  /**
   * 케이던스 모니터링 중지
   *
   * TODO: Watch 케이던스 스트림 구독 해제
   */
  async stopCadenceMonitoring(): Promise<void> {
    try {
      // TODO: Watch 케이던스 모니터링 중지
      // (심박수 중지와 유사한 로직)

      this.cadenceCallback = null;
      console.log('[WatchService] Cadence monitoring stopped');
    } catch (error) {
      console.error('[WatchService] Stop cadence monitoring failed:', error);
    }
  }

  /**
   * 현재 심박수 조회 (최신 1개)
   *
   * TODO: Watch에서 최신 심박수 조회
   */
  async getCurrentHeartRate(): Promise<number | undefined> {
    if (!this.isWatchConnected || !this.isWatchAppInstalled) {
      return undefined;
    }

    try {
      // TODO: Watch에서 최신 심박수 요청
      // if (Platform.OS === 'ios') {
      //   const WatchConnectivity = require('react-native-watch-connectivity');
      //   const response = await WatchConnectivity.sendMessage({ action: 'getCurrentHeartRate' });
      //   if (response && response.bpm) {
      //     return Math.round(response.bpm);
      //   }
      // } else if (Platform.OS === 'android') {
      //   const { DataClient } = require('@react-native-google-wearos/data-layer');
      //   const items = await DataClient.getDataItems('/heart_rate');
      //   if (items.length > 0 && items[0].data.bpm) {
      //     return Math.round(items[0].data.bpm);
      //   }
      // }

      return undefined;
    } catch (error) {
      console.error('[WatchService] Get current heart rate failed:', error);
      return undefined;
    }
  }

  /**
   * 현재 케이던스 조회
   *
   * TODO: Watch에서 최신 케이던스 조회
   */
  async getCurrentCadence(): Promise<number | undefined> {
    if (!this.isWatchConnected || !this.isWatchAppInstalled) {
      return undefined;
    }

    try {
      // TODO: Watch에서 최신 케이던스 요청
      // (심박수 조회와 유사한 로직)

      return undefined;
    } catch (error) {
      console.error('[WatchService] Get current cadence failed:', error);
      return undefined;
    }
  }

  /**
   * 칼로리 계산
   * Watch의 자체 칼로리 계산 사용
   *
   * TODO: Watch ActiveCalories 조회
   * - Watch가 자체적으로 계산한 칼로리 사용
   */
  async calculateCalories(params: {
    distance: number;
    duration: number;
    weight?: number;
    heartRate?: number;
  }): Promise<number | undefined> {
    if (!this.isWatchConnected || !this.isWatchAppInstalled) {
      return undefined;
    }

    try {
      // TODO: Watch 칼로리 조회
      // if (Platform.OS === 'ios') {
      //   const WatchConnectivity = require('react-native-watch-connectivity');
      //   const response = await WatchConnectivity.sendMessage({
      //     action: 'getCalories',
      //     duration: params.duration,
      //   });
      //   if (response && response.calories) {
      //     return Math.round(response.calories);
      //   }
      // } else if (Platform.OS === 'android') {
      //   const { DataClient } = require('@react-native-google-wearos/data-layer');
      //   const items = await DataClient.getDataItems('/calories');
      //   if (items.length > 0 && items[0].data.calories) {
      //     return Math.round(items[0].data.calories);
      //   }
      // }

      // Fallback: MET 공식
      const weight = params.weight || 70;
      const hours = params.duration / 3600;
      const met = 9.8;
      return met * weight * hours;
    } catch (error) {
      console.error('[WatchService] Calculate calories failed:', error);
      return undefined;
    }
  }

  /**
   * Watch 연결 상태 확인
   *
   * TODO: 주기적으로 Watch 연결 상태 체크
   * - iOS: WCSession.default.isReachable
   * - Android: getConnectedNodes()
   */
  async checkConnectionStatus(): Promise<boolean> {
    try {
      // TODO: Watch 연결 상태 확인
      // if (Platform.OS === 'ios') {
      //   const WatchConnectivity = require('react-native-watch-connectivity');
      //   this.isWatchConnected = await WatchConnectivity.getIsReachable();
      // } else if (Platform.OS === 'android') {
      //   const { DataClient } = require('@react-native-google-wearos/data-layer');
      //   const nodes = await DataClient.getConnectedNodes();
      //   this.isWatchConnected = nodes.length > 0;
      // }

      return this.isWatchConnected;
    } catch (error) {
      console.error('[WatchService] Connection status check failed:', error);
      this.isWatchConnected = false;
      return false;
    }
  }

  /**
   * Watch 앱 설치 확인
   *
   * TODO: Watch 앱이 설치되어 있는지 확인
   * - 설치 안 되어 있으면 이 서비스 사용 불가 (정책)
   */
  async checkWatchAppInstalled(): Promise<boolean> {
    try {
      // TODO: Watch 앱 설치 확인
      // if (Platform.OS === 'ios') {
      //   const WatchConnectivity = require('react-native-watch-connectivity');
      //   this.isWatchAppInstalled = await WatchConnectivity.getIsWatchAppInstalled();
      // } else if (Platform.OS === 'android') {
      //   const { DataClient } = require('@react-native-google-wearos/data-layer');
      //   const capability = await DataClient.getCapability('running_app', 'all');
      //   this.isWatchAppInstalled = capability.nodes.length > 0;
      // }

      return this.isWatchAppInstalled;
    } catch (error) {
      console.error('[WatchService] Check watch app installed failed:', error);
      this.isWatchAppInstalled = false;
      return false;
    }
  }
}

// Singleton export
export const watchService = WatchService.getInstance();
