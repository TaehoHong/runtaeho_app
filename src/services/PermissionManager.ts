/**
 * Permission Manager (v3.0)
 *
 * 단순하고 명확한 권한 관리
 * - 위치 권한 (Foreground + Background)
 * - 동작/피트니스 권한 (iOS: Core Motion, Android: ACTIVITY_RECOGNITION)
 */

import * as Location from 'expo-location';
import { Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pedometer } from 'expo-sensors';

const PERMISSION_REQUESTED_KEY = '@permission_initial_request_completed';

export type PermissionCheckResult = {
  canStartRunning: boolean;
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
   * 러닝 시작에 필요한 필수 권한 확인
   *
   * 정책:
   * - 위치(사용 중)
   * - 위치(항상)
   * - 동작 및 피트니스
   */
  async checkRequiredPermissions(): Promise<PermissionCheckResult> {
    const foreground = await Location.getForegroundPermissionsAsync();
    const background = await Location.getBackgroundPermissionsAsync();
    const locationForeground = foreground.granted;
    const locationBackground = background.granted;
    const motion = (await Pedometer.getPermissionsAsync()).granted;
    const canStartRunning = locationForeground && locationBackground && motion;

    return {
      canStartRunning,
      hasAllPermissions: canStartRunning,
      location: locationForeground,
      locationBackground,
      motion,
    };
  }

  /**
   * 모든 필수 권한 요청
   *
   * 순서: 위치(Foreground) → 위치(Background) → 모션/피트니스
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

      console.log('[PermissionManager] Requesting foreground location...');
      const foreground = await Location.requestForegroundPermissionsAsync();
      granted.location = foreground.granted;

      if (!foreground.granted) {
        console.warn('[PermissionManager] Foreground location denied');
        return { success: false, granted };
      }

      console.log('[PermissionManager] Requesting background location...');
      const background = await Location.requestBackgroundPermissionsAsync();
      granted.locationBackground = background.granted;

      if (!background.granted) {
        console.warn('[PermissionManager] Background location denied');
      }

      console.log('[PermissionManager] Requesting motion permission...');
      try {
        const motionPermission = await Pedometer.requestPermissionsAsync();
        granted.motion = motionPermission.granted;
        console.log('[PermissionManager] Motion permission result:', motionPermission.status);
      } catch (error) {
        console.warn('[PermissionManager] Motion permission failed:', error);
        granted.motion = false;
      }

      const success = granted.location && granted.locationBackground && granted.motion;

      if (success) {
        console.log('[PermissionManager] All permissions granted');
        await this.markInitialRequestComplete();
      } else {
        console.warn('[PermissionManager] Some permissions denied:', granted);
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
    if (!result.motion) missing.push('동작 및 피트니스');

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
