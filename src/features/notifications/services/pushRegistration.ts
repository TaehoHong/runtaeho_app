import axios, { isAxiosError } from 'axios';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getCalendars } from 'expo-localization';
import { apiClient } from '~/services/api/client';
import { API_CONFIG } from '~/services/api/config';
import { getSessionSnapshot, isSessionCurrent, useAuthStore } from '~/features/auth/stores/authStore';
import { i18n, t } from '~/i18n';
import { notificationService } from './notificationService';

const installationKey = 'notification-installation-id';
const bindingKey = 'notification-device-binding';
interface Binding { installationId: string; version: number; userId: number }
let pending: Promise<unknown> = Promise.resolve();
let activeBinding: Binding | null = null;
let syncRevision = 0;
let latestDevicePushToken: Notifications.DevicePushToken | undefined;
let revocationCredentials: { accessToken: string | null; userId: number | null } | null = null;

export const currentTimezone = () => getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
export const notificationsGranted = (permission: Notifications.NotificationPermissionsStatus) =>
  permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

async function installationId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(installationKey);
  if (existing) return existing;
  const value = Crypto.randomUUID();
  await SecureStore.setItemAsync(installationKey, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return value;
}

async function notificationPermission(requestPermission = false): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('activity', { name: t('활동 알림'), importance: Notifications.AndroidImportance.DEFAULT });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (requestPermission && !notificationsGranted(permission)) permission = await Notifications.requestPermissionsAsync();
  return notificationsGranted(permission);
}

/** OS authorization is independent of Expo token acquisition and server binding. */
export function requestPushPermission(): Promise<boolean> {
  return notificationPermission(true);
}

export async function syncPushRegistration(devicePushToken?: Notifications.DevicePushToken): Promise<boolean> {
  const snapshot = getSessionSnapshot();
  const userId = snapshot.userId;
  const revision = ++syncRevision;
  const isCurrent = () => revision === syncRevision && isSessionCurrent(snapshot) && useAuthStore.getState().isLoggedIn;
  if (!userId || !isCurrent() || Platform.OS === 'web') return false;
  if (devicePushToken) latestDevicePushToken = devicePushToken;
  try {
    // Native/Expo work must not hold the lane needed to revoke an existing binding.
    const granted = await notificationPermission();
    if (!isCurrent()) return false;
    const configuration = await notificationService.configuration();
    if (!isCurrent()) return false;
    const timezone = currentTimezone();
    if (timezone && configuration.timezone !== timezone) {
      await notificationService.updateTimezone(timezone);
    }
    if (!isCurrent()) return false;
    const enabled = granted && configuration.pushEnabled;
    let token: string | null = null;
    if (enabled) {
      const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) throw new Error('Push project is not configured');
      token = (await Notifications.getExpoPushTokenAsync({ projectId,
        ...(latestDevicePushToken ? { devicePushToken: latestDevicePushToken } : {}),
      })).data;
    }
    if (!isCurrent()) return false;
    const task = pending.then(async () => {
      if (!isCurrent()) return false;
      const installation = await installationId();
      if (!isCurrent()) return false;
      const { data } = await apiClient.put<{ id: number; version: number }>('/notifications/device', {
        installationId: installation, pushToken: token, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
        language: i18n.resolvedLanguage === 'ja' ? 'ja' : 'ko',
      }, { sessionSnapshot: snapshot });
      // An in-flight PUT may finish during logout; retain its exact version for revocation.
      activeBinding = { installationId: installation, version: data.version, userId };
      await SecureStore.setItemAsync(bindingKey, JSON.stringify(activeBinding), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
      return isCurrent() && enabled;
    });
    pending = task.catch(() => { /* Keep the binding lane usable after a failed write. */ });
    return await task;
  } catch (error) {
    if (!isCurrent()) return false;
    throw error;
  }
}

/** Capture credentials synchronously, before resetAllAppData revokes the app session. */
export function detachPushRegistration(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  const credentials = revocationCredentials ?? {
    accessToken: useAuthStore.getState().accessToken, userId: getSessionSnapshot().userId,
  };
  revocationCredentials = credentials;
  ++syncRevision;
  latestDevicePushToken = undefined;
  const task = pending.then(async () => {
    const nativeResults = await Promise.allSettled([
      Notifications.unregisterForNotificationsAsync(), Notifications.dismissAllNotificationsAsync(), Notifications.clearLastNotificationResponseAsync(),
    ]);
    if (nativeResults.some(result => result.status === 'rejected')) console.warn('[Notifications] Native notification cleanup failed');
    const saved = activeBinding ? null : await SecureStore.getItemAsync(bindingKey);
    const binding: Binding | null = activeBinding ?? (saved ? JSON.parse(saved) : null);
    if (binding && credentials.accessToken) {
      if (binding.userId === credentials.userId) {
        // This one revocation request deliberately uses the captured old credentials; it must not refresh into another account.
        try {
          await axios.post(`${API_CONFIG.BASE_URL}/notifications/device/unbind`, {
            installationId: binding.installationId, version: binding.version,
          }, { headers: { Authorization: `Bearer ${credentials.accessToken}` }, timeout: 10000 });
        } catch (error) {
          // Expired/revoked credentials cannot recover by retrying the same request.
          if (!isAxiosError(error) || ![401, 403].includes(error.response?.status ?? 0)) throw error;
        }
      }
    }
    await SecureStore.deleteItemAsync(bindingKey);
    activeBinding = null;
    revocationCredentials = null;
  });
  pending = task.catch(() => { console.warn('[Notifications] Device unbind failed; logout cleanup must be retried.'); });
  return task.then(() => undefined);
}
