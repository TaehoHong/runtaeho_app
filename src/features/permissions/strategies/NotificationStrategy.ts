/**
 * Notification Permission Strategy
 *
 * 푸시 알림 권한 요청 전략
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { PermissionType, PermissionResult } from '../models/PermissionTypes';
import { BasePermissionStrategy } from './PermissionStrategy';

export class NotificationStrategy extends BasePermissionStrategy {
  readonly type = PermissionType.NOTIFICATION;

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
        await Notifications.getPermissionsAsync();

      console.log(
        `[Notification] Check permission - Status: ${status}, CanAskAgain: ${canAskAgain}`
      );

      return this.convertStatus(status, canAskAgain);
    } catch (error) {
      console.error('[Notification] Check permission failed:', error);
      throw error;
    }
  }

  /**
   * 권한 요청
   */
  async requestPermission(): Promise<PermissionResult> {
    try {
      console.log('[Notification] Requesting permission...');

      const { status, canAskAgain } =
        await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });

      console.log(
        `[Notification] Request result - Status: ${status}, CanAskAgain: ${canAskAgain}`
      );

      return this.convertStatus(status, canAskAgain);
    } catch (error) {
      console.error('[Notification] Request permission failed:', error);
      throw error;
    }
  }
}
