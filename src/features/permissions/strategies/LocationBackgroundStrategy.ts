/**
 * Location Background Permission Strategy
 *
 * Background 위치 권한 요청 전략
 *
 * 중요:
 * - iOS: Foreground 권한이 먼저 승인되어야 함
 * - Android 10+: Foreground 권한과 별도로 요청 필요
 * - Android <10: Foreground 권한과 동일
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { PermissionType, PermissionResult, PermissionStatus } from '../models/PermissionTypes';
import { BasePermissionStrategy } from './PermissionStrategy';

export class LocationBackgroundStrategy extends BasePermissionStrategy {
  readonly type = PermissionType.LOCATION_BACKGROUND;

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
      // 1. Foreground 권한 먼저 확인
      const foregroundPermission = await Location.getForegroundPermissionsAsync();

      if (foregroundPermission.status !== 'granted') {
        console.warn(
          '[LocationBackground] Foreground permission not granted, background will be denied'
        );
        return {
          type: this.type,
          status: PermissionStatus.DENIED,
          canAskAgain: foregroundPermission.canAskAgain,
          timestamp: Date.now(),
        };
      }

      // 2. Background 권한 확인
      const { status, canAskAgain } =
        await Location.getBackgroundPermissionsAsync();

      console.log(
        `[LocationBackground] Check permission - Status: ${status}, CanAskAgain: ${canAskAgain}`
      );

      return this.convertStatus(status, canAskAgain);
    } catch (error) {
      console.error('[LocationBackground] Check permission failed:', error);
      throw error;
    }
  }

  /**
   * 권한 요청
   *
   * 전제조건: Foreground 권한이 먼저 승인되어 있어야 함
   */
  async requestPermission(): Promise<PermissionResult> {
    try {
      // 1. Foreground 권한 체크
      const foregroundPermission = await Location.getForegroundPermissionsAsync();

      if (foregroundPermission.status !== 'granted') {
        console.error(
          '[LocationBackground] Cannot request background permission: Foreground not granted'
        );
        return {
          type: this.type,
          status: PermissionStatus.DENIED,
          canAskAgain: false,
          timestamp: Date.now(),
        };
      }

      // 2. Background 권한 요청
      console.log('[LocationBackground] Requesting permission...');

      const { status, canAskAgain } =
        await Location.requestBackgroundPermissionsAsync();

      console.log(
        `[LocationBackground] Request result - Status: ${status}, CanAskAgain: ${canAskAgain}`
      );

      return this.convertStatus(status, canAskAgain);
    } catch (error) {
      console.error('[LocationBackground] Request permission failed:', error);
      throw error;
    }
  }

  /**
   * Rationale 표시 필요 여부
   *
   * Background 권한은 특히 사용자에게 명확한 설명이 필요함
   */
  async shouldShowRationale(): Promise<boolean> {
    try {
      const { status, canAskAgain } =
        await Location.getBackgroundPermissionsAsync();

      // iOS: Always show rationale for background (더 엄격한 정책)
      if (Platform.OS === 'ios') {
        return status !== 'granted';
      }

      // Android: 거부되었지만 다시 물어볼 수 있는 경우
      return status === 'denied' && canAskAgain;
    } catch {
      return true; // 에러 시 rationale 표시
    }
  }
}
