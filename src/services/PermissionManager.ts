/**
 * Permission Manager (v3.0)
 *
 * 단순하고 명확한 권한 관리
 * - 위치 권한 (Foreground + Background)
 * - 동작/피트니스 권한 (iOS: Core Motion, Android: ACTIVITY_RECOGNITION)
 */

import * as Location from 'expo-location';
import { Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pedometer } from 'expo-sensors';

const PERMISSION_REQUESTED_KEY = '@permission_initial_request_completed';

export type PermissionCheckResult = {
  hasAllPermissions: boolean;
  location: boolean;
  locationBackground: boolean;
  motion: boolean;
};

export class PermissionManager {
  private static instance: PermissionManager;

  private constructor() {}

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * 최초 권한 요청 완료 여부 확인
   */
  async hasCompletedInitialRequest(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(PERMISSION_REQUESTED_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  }

  /**
   * 최초 권한 요청 완료 표시 (외부에서도 호출 가능)
   */
  async markInitialRequestComplete(): Promise<void> {
    await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');
  }

  /**
   * 필수 권한 확인 (위치 + 동작/피트니스)
   */
  async checkRequiredPermissions(): Promise<PermissionCheckResult> {
    // 1. 위치 권한 (Foreground + Background)
    const foreground = await Location.getForegroundPermissionsAsync();
    const background = await Location.getBackgroundPermissionsAsync();

    const locationForeground = foreground.granted;
    const locationBackground = background.granted;

    // 2. 동작/피트니스 권한 (실제 체크)
    let motion = false;

    if (Platform.OS === 'ios') {
      // iOS: Pedometer 사용 가능 여부 확인
      try {
        const available = await Pedometer.isAvailableAsync();
        motion = available;
      } catch {
        motion = false;
      }
    } else {
      // Android: ACTIVITY_RECOGNITION 권한 필요 (API 29+)
      try {
        const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
        if (androidVersion >= 29) {
          // Android에서는 Pedometer 사용 가능 여부로 판단
          const available = await Pedometer.isAvailableAsync();
          motion = available;
        } else {
          motion = true; // 구버전은 권한 불필요
        }
      } catch {
        motion = false;
      }
    }

    return {
      hasAllPermissions: locationForeground && locationBackground && motion,
      location: locationForeground,
      locationBackground,
      motion
    };
  }

  /**
   * 모든 필수 권한 요청
   *
   * 순서: 위치(Foreground) → 위치(Background) → 모션/피트니스
   * iOS Alert 제거, 시스템 팝업만 사용
   */
  async requestAllPermissions(): Promise<{
    success: boolean;
    granted: {
      location: boolean;
      locationBackground: boolean;
      motion: boolean;
    };
  }> {
    try {
      const granted = {
        location: false,
        locationBackground: false,
        motion: false
      };

      // ===== 1. 위치 권한 (Foreground) =====
      console.log('[PermissionManager] Requesting foreground location...');
      const foreground = await Location.requestForegroundPermissionsAsync();
      granted.location = foreground.granted;

      if (!foreground.granted) {
        console.warn('[PermissionManager] Foreground location denied');
        return { success: false, granted };
      }

      // ===== 2. 위치 권한 (Background) =====
      // iOS Alert 제거 - 바로 시스템 팝업 요청
      console.log('[PermissionManager] Requesting background location...');
      const background = await Location.requestBackgroundPermissionsAsync();
      granted.locationBackground = background.granted;

      if (!background.granted) {
        console.warn('[PermissionManager] Background location denied');
        // Background 거부되어도 계속 진행
      }

      // ===== 3. 동작/피트니스 권한 =====
      console.log('[PermissionManager] Requesting motion permission...');
      try {
        if (Platform.OS === 'ios') {
          // iOS: Pedometer.watchStepCount()를 호출하면 자동으로 권한 팝업이 뜸
          // Info.plist의 NSMotionUsageDescription이 필수
          console.log('[PermissionManager] Starting Pedometer to trigger permission...');

          // watchStepCount를 시작하면 권한이 없을 경우 자동으로 팝업이 뜸
          const subscription = Pedometer.watchStepCount((result) => {
            console.log('[PermissionManager] Pedometer started, steps:', result.steps);
          });

          // 2초 대기 (사용자가 권한 팝업에 응답할 시간)
          await new Promise(resolve => setTimeout(resolve, 2000));

          // 구독 해제
          subscription.remove();

          // 권한 확인
          const available = await Pedometer.isAvailableAsync();
          granted.motion = available;

          console.log('[PermissionManager] Motion permission result:', available);
        } else {
          // Android: Pedometer 사용 가능 여부 확인
          const available = await Pedometer.isAvailableAsync();
          granted.motion = available;
        }
      } catch (error) {
        console.warn('[PermissionManager] Motion permission failed:', error);
        granted.motion = false;
      }

      // ===== 4. 성공 여부 판단 =====
      const success = granted.location && granted.locationBackground && granted.motion;

      if (success) {
        console.log('[PermissionManager] All permissions granted');
        await this.markInitialRequestComplete();
      } else {
        console.warn('[PermissionManager] Some permissions denied:', granted);
        // 일부만 허용되어도 완료로 표시 (나중에 설정에서 변경 가능)
        await this.markInitialRequestComplete();
      }

      return { success, granted };

    } catch (error) {
      console.error('[PermissionManager] Request failed:', error);
      return {
        success: false,
        granted: { location: false, locationBackground: false, motion: false }
      };
    }
  }

  /**
   * 앱 설정 화면으로 이동
   */
  async openAppSettings(): Promise<void> {
    try {
      console.log('[PermissionManager] Opening app settings...');
      await Linking.openSettings();
    } catch (error) {
      console.error('[PermissionManager] Failed to open settings:', error);
      Alert.alert(
        '설정 열기 실패',
        '설정 앱을 직접 열어 RunTaeho 권한을 변경해주세요.'
      );
    }
  }

  /**
   * 권한 거부 시 안내 메시지 생성
   */
  getMissingPermissionsMessage(result: PermissionCheckResult): string {
    const missing: string[] = [];

    if (!result.location) missing.push('위치 (사용 중)');
    if (!result.locationBackground) missing.push('위치 (항상)');
    if (!result.motion) missing.push('활동 및 피트니스');

    return missing.length > 0
      ? `다음 권한이 필요합니다:\n• ${missing.join('\n• ')}`
      : '';
  }

  /**
   * 디버깅: 권한 상태 초기화
   */
  async resetPermissionState(): Promise<void> {
    await AsyncStorage.removeItem(PERMISSION_REQUESTED_KEY);
    console.log('[PermissionManager] Permission state reset');
  }
}

// Singleton export
export const permissionManager = PermissionManager.getInstance();
