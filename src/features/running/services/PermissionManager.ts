/**
 * Permission Manager
 * 앱 시작 시 모든 필요한 권한을 요청하고 관리
 */

import { Platform } from 'react-native';
import { LocationService } from './LocationService';
import { HealthKitService } from './sensors/HealthKitService';
import { GoogleFitService } from './sensors/GoogleFitService';
import type { PermissionResult } from './sensors/SensorTypes';

/**
 * 권한 타입
 */
export enum PermissionType {
  LOCATION = 'location',
  LOCATION_BACKGROUND = 'location_background',
  HEALTH_KIT = 'health_kit',           // iOS only
  GOOGLE_FIT = 'google_fit',           // Android only
  MOTION = 'motion',                   // 가속도계 (케이던스)
  BLUETOOTH = 'bluetooth',             // 웨어러블 연결
}

/**
 * 권한 요청 결과
 */
export interface PermissionRequestResult {
  type: PermissionType;
  granted: boolean;
  status: PermissionResult['status'];
  error?: string;
}

/**
 * 전체 권한 요청 결과
 */
export interface AllPermissionsResult {
  allGranted: boolean;
  results: PermissionRequestResult[];
  missingPermissions: PermissionType[];
}

/**
 * Permission Manager
 */
export class PermissionManager {
  private static instance: PermissionManager;

  private locationService: LocationService;
  private healthKitService: HealthKitService;
  private googleFitService: GoogleFitService;

  private permissionStatus: Map<PermissionType, PermissionResult> = new Map();

  private constructor() {
    this.locationService = LocationService.getInstance();
    this.healthKitService = HealthKitService.getInstance();
    this.googleFitService = GoogleFitService.getInstance();
  }

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * 위치 권한 요청 (Foreground)
   */
  private async requestLocationPermission(): Promise<PermissionRequestResult> {
    try {
      const result = await this.locationService.requestPermissions();
      this.permissionStatus.set(PermissionType.LOCATION, result);

      return {
        type: PermissionType.LOCATION,
        granted: result.status === 'granted',
        status: result.status,
      };
    } catch (error: any) {
      return {
        type: PermissionType.LOCATION,
        granted: false,
        status: 'denied',
        error: error.message,
      };
    }
  }

  /**
   * 백그라운드 위치 권한 요청
   */
  private async requestBackgroundLocationPermission(): Promise<PermissionRequestResult> {
    try {
      // 먼저 foreground 권한이 있어야 함
      const foregroundGranted = this.permissionStatus.get(PermissionType.LOCATION);
      if (!foregroundGranted || foregroundGranted.status !== 'granted') {
        return {
          type: PermissionType.LOCATION_BACKGROUND,
          granted: false,
          status: 'denied',
          error: 'Foreground location permission required first',
        };
      }

      // TODO: 백그라운드 위치 권한 별도 요청
      // iOS: requestBackgroundPermissionsAsync()
      // Android: ACCESS_BACKGROUND_LOCATION 권한

      // 현재는 foreground 권한과 동일하게 처리
      this.permissionStatus.set(PermissionType.LOCATION_BACKGROUND, foregroundGranted);

      return {
        type: PermissionType.LOCATION_BACKGROUND,
        granted: true,
        status: 'granted',
      };
    } catch (error: any) {
      return {
        type: PermissionType.LOCATION_BACKGROUND,
        granted: false,
        status: 'denied',
        error: error.message,
      };
    }
  }

  /**
   * HealthKit 권한 요청 (iOS)
   */
  private async requestHealthKitPermission(): Promise<PermissionRequestResult> {
    if (Platform.OS !== 'ios') {
      return {
        type: PermissionType.HEALTH_KIT,
        granted: false,
        status: 'denied',
        error: 'Not available on this platform',
      };
    }

    try {
      const result = await this.healthKitService.requestPermissions();
      this.permissionStatus.set(PermissionType.HEALTH_KIT, result);

      return {
        type: PermissionType.HEALTH_KIT,
        granted: result.status === 'granted',
        status: result.status,
      };
    } catch (error: any) {
      return {
        type: PermissionType.HEALTH_KIT,
        granted: false,
        status: 'denied',
        error: error.message,
      };
    }
  }

  /**
   * Google Fit 권한 요청 (Android)
   */
  private async requestGoogleFitPermission(): Promise<PermissionRequestResult> {
    if (Platform.OS !== 'android') {
      return {
        type: PermissionType.GOOGLE_FIT,
        granted: false,
        status: 'denied',
        error: 'Not available on this platform',
      };
    }

    try {
      const result = await this.googleFitService.requestPermissions();
      this.permissionStatus.set(PermissionType.GOOGLE_FIT, result);

      return {
        type: PermissionType.GOOGLE_FIT,
        granted: result.status === 'granted',
        status: result.status,
      };
    } catch (error: any) {
      return {
        type: PermissionType.GOOGLE_FIT,
        granted: false,
        status: 'denied',
        error: error.message,
      };
    }
  }

  /**
   * Motion 권한 요청 (가속도계 - 케이던스)
   */
  private async requestMotionPermission(): Promise<PermissionRequestResult> {
    // TODO: 가속도계 권한 요청
    // iOS: Core Motion (권한 요청 불필요, 직접 사용 가능)
    // Android: ACTIVITY_RECOGNITION 권한

    // 현재는 자동 승인으로 처리
    return {
      type: PermissionType.MOTION,
      granted: true,
      status: 'granted',
    };
  }

  /**
   * Bluetooth 권한 요청 (웨어러블 연결)
   */
  private async requestBluetoothPermission(): Promise<PermissionRequestResult> {
    // TODO: Bluetooth 권한 요청
    // iOS: Core Bluetooth (Info.plist 설정)
    // Android: BLUETOOTH_CONNECT, BLUETOOTH_SCAN

    // 현재는 자동 승인으로 처리 (웨어러블 연동 시 구현)
    return {
      type: PermissionType.BLUETOOTH,
      granted: true,
      status: 'granted',
    };
  }

  /**
   * 모든 필요한 권한 요청
   * 앱 시작 시 호출
   */
  async requestAllPermissions(): Promise<AllPermissionsResult> {
    console.log('[PermissionManager] Requesting all permissions...');

    const results: PermissionRequestResult[] = [];

    // 1. 위치 권한 (필수)
    const locationResult = await this.requestLocationPermission();
    results.push(locationResult);

    // 2. 백그라운드 위치 권한
    if (locationResult.granted) {
      const backgroundLocationResult = await this.requestBackgroundLocationPermission();
      results.push(backgroundLocationResult);
    }

    // 3. 헬스 데이터 권한 (플랫폼별)
    if (Platform.OS === 'ios') {
      const healthKitResult = await this.requestHealthKitPermission();
      results.push(healthKitResult);
    } else if (Platform.OS === 'android') {
      const googleFitResult = await this.requestGoogleFitPermission();
      results.push(googleFitResult);
    }

    // 4. Motion 권한 (케이던스)
    const motionResult = await this.requestMotionPermission();
    results.push(motionResult);

    // 5. Bluetooth 권한 (웨어러블)
    const bluetoothResult = await this.requestBluetoothPermission();
    results.push(bluetoothResult);

    // 결과 분석
    const allGranted = results.every((r) => r.granted);
    const missingPermissions = results
      .filter((r) => !r.granted)
      .map((r) => r.type);

    console.log('[PermissionManager] Permission results:', {
      allGranted,
      granted: results.filter((r) => r.granted).length,
      total: results.length,
      missing: missingPermissions,
    });

    return {
      allGranted,
      results,
      missingPermissions,
    };
  }

  /**
   * 특정 권한 상태 확인
   */
  async checkPermission(type: PermissionType): Promise<PermissionResult> {
    const cached = this.permissionStatus.get(type);
    if (cached) {
      return cached;
    }

    // 캐시에 없으면 실제 확인
    switch (type) {
      case PermissionType.LOCATION:
      case PermissionType.LOCATION_BACKGROUND:
        return await this.locationService.checkPermissions();
      case PermissionType.HEALTH_KIT:
        return await this.healthKitService.checkPermissions();
      case PermissionType.GOOGLE_FIT:
        return await this.googleFitService.checkPermissions();
      default:
        return { status: 'undetermined' };
    }
  }

  /**
   * 모든 권한 상태 확인 (요청 없이)
   */
  async checkAllPermissions(): Promise<Map<PermissionType, PermissionResult>> {
    const permissions = new Map<PermissionType, PermissionResult>();

    permissions.set(PermissionType.LOCATION, await this.locationService.checkPermissions());

    if (Platform.OS === 'ios') {
      permissions.set(PermissionType.HEALTH_KIT, await this.healthKitService.checkPermissions());
    } else if (Platform.OS === 'android') {
      permissions.set(PermissionType.GOOGLE_FIT, await this.googleFitService.checkPermissions());
    }

    return permissions;
  }

  /**
   * 권한 상태 캐시 초기화
   */
  clearCache(): void {
    this.permissionStatus.clear();
  }

  /**
   * 필수 권한이 모두 승인되었는지 확인
   * 필수: 위치 권한
   */
  async hasRequiredPermissions(): Promise<boolean> {
    const locationPermission = await this.checkPermission(PermissionType.LOCATION);
    return locationPermission.status === 'granted';
  }

  /**
   * 권한 거부 시 설정 화면으로 이동하는 메시지
   */
  getPermissionDeniedMessage(type: PermissionType): string {
    const messages: Record<PermissionType, string> = {
      [PermissionType.LOCATION]: '위치 권한이 필요합니다. 설정에서 위치 권한을 허용해주세요.',
      [PermissionType.LOCATION_BACKGROUND]: '백그라운드 위치 권한이 필요합니다. 설정에서 "항상 허용"을 선택해주세요.',
      [PermissionType.HEALTH_KIT]: '건강 데이터 접근 권한이 필요합니다. 설정에서 HealthKit 권한을 허용해주세요.',
      [PermissionType.GOOGLE_FIT]: '건강 데이터 접근 권한이 필요합니다. 설정에서 Google Fit 권한을 허용해주세요.',
      [PermissionType.MOTION]: '활동 인식 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
      [PermissionType.BLUETOOTH]: '블루투스 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
    };

    return messages[type] || '권한이 필요합니다. 설정에서 권한을 허용해주세요.';
  }
}

// Singleton export
export const permissionManager = PermissionManager.getInstance();
