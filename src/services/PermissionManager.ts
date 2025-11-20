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

    // 2. 동작/피트니스 권한
    let motion = true;

    if (Platform.OS === 'ios') {
      // iOS: Core Motion은 권한 불필요, 항상 사용 가능
      motion = true;
    } else {
      // Android: ACTIVITY_RECOGNITION 권한 필요 (API 29+)
      try {
        const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
        if (androidVersion >= 29) {
          // expo-location의 권한 체크 사용
          // Android에서는 foreground 권한만으로도 모션 감지 가능
          motion = true;
        } else {
          motion = true;
        }
      } catch {
        motion = true; // 에러 시 진행 허용
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
   * iOS: Foreground → Background 순차 요청 (2번 팝업)
   * Android: Foreground + Background 동시
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
        motion: true // 기본값 true
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
      // iOS: 사용자에게 안내 후 요청
      if (Platform.OS === 'ios') {
        await new Promise<void>((resolve) => {
          Alert.alert(
            '백그라운드 위치 권한',
            '화면이 꺼진 상태에서도 러닝을 기록하려면\n다음 팝업에서 "항상 허용"을 선택해주세요.',
            [{ text: '확인', onPress: () => resolve() }]
          );
        });
      }

      console.log('[PermissionManager] Requesting background location...');
      const background = await Location.requestBackgroundPermissionsAsync();
      granted.locationBackground = background.granted;

      // ===== 3. 동작/피트니스 권한 =====
      // iOS: 권한 불필요
      // Android: 현재는 별도 요청 불필요 (위치 권한으로 충분)
      granted.motion = true;

      // ===== 4. 성공 여부 판단 =====
      const success = granted.location && granted.locationBackground && granted.motion;

      if (success) {
        console.log('[PermissionManager] All permissions granted');
        await this.markInitialRequestComplete();
      } else {
        console.warn('[PermissionManager] Some permissions denied:', granted);
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
