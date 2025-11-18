/**
 * Location Foreground Permission Strategy
 *
 * Foreground 위치 권한 요청 전략
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { PermissionType, PermissionResult } from '../models/PermissionTypes';
import { BasePermissionStrategy } from './PermissionStrategy';

export class LocationForegroundStrategy extends BasePermissionStrategy {
  readonly type = PermissionType.LOCATION_FOREGROUND;

  /**
   * 플랫폼 지원 여부 (iOS, Android 모두 지원)
   */
  isSupported(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * 현재 권한 상태 확인
   */
  async checkPermission(): Promise<PermissionResult> {
    try {
      const { status, canAskAgain } =
        await Location.getForegroundPermissionsAsync();

      console.log(
        `[LocationForeground] Check permission - Status: ${status}, CanAskAgain: ${canAskAgain}`
      );

      return this.convertStatus(status, canAskAgain);
    } catch (error) {
      console.error('[LocationForeground] Check permission failed:', error);
      throw error;
    }
  }

  /**
   * 권한 요청
   */
  async requestPermission(): Promise<PermissionResult> {
    try {
      console.log('[LocationForeground] Requesting permission...');

      const { status, canAskAgain } =
        await Location.requestForegroundPermissionsAsync();

      console.log(
        `[LocationForeground] Request result - Status: ${status}, CanAskAgain: ${canAskAgain}`
      );

      return this.convertStatus(status, canAskAgain);
    } catch (error) {
      console.error('[LocationForeground] Request permission failed:', error);
      throw error;
    }
  }

  /**
   * Rationale 표시 필요 여부
   * Android: 사용자가 이전에 거부한 경우 true
   */
  async shouldShowRationale(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const { status, canAskAgain } =
        await Location.getForegroundPermissionsAsync();

      // 거부되었지만 다시 물어볼 수 있는 경우 = rationale 표시 필요
      return status === 'denied' && canAskAgain;
    } catch {
      return false;
    }
  }
}
