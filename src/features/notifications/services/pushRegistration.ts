import axios from 'axios';
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

export function syncPushRegistration(requestPermission = false): Promise<boolean> {
  const snapshot = getSessionSnapshot();
  const task = pending.then(async () => {
    if (!snapshot.userId || !isSessionCurrent(snapshot) || !useAuthStore.getState().isLoggedIn || Platform.OS === 'web') return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('activity', { name: t('활동 알림'), importance: Notifications.AndroidImportance.DEFAULT });
    }
    let permission = await Notifications.getPermissionsAsync();
    if (requestPermission && !notificationsGranted(permission)) permission = await Notifications.requestPermissionsAsync();
    if (!isSessionCurrent(snapshot)) return false;
    const configuration = await notificationService.configuration();
    if (!isSessionCurrent(snapshot)) return false;
    const timezone = currentTimezone();
    if (timezone && configuration.timezone !== timezone) {
      await notificationService.updateTimezone(timezone);
    }
    const enabled = notificationsGranted(permission) && (configuration.pushEnabled || requestPermission);
    let token: string | null = null;
    if (enabled) {
      const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) throw new Error('Push project is not configured');
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    }
    if (!isSessionCurrent(snapshot)) return false;
    const installation = await installationId();
    if (!isSessionCurrent(snapshot)) return false;
    const { data } = await apiClient.put<{ id: number; version: number }>('/notifications/device', {
      installationId: installation, pushToken: token, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
      language: i18n.resolvedLanguage === 'ja' ? 'ja' : 'ko',
    }, { sessionSnapshot: snapshot });
    // Save even if logout started during HTTP: logout waits for this lane before unbinding this exact version.
    activeBinding = { installationId: installation, version: data.version, userId: snapshot.userId };
    await SecureStore.setItemAsync(bindingKey, JSON.stringify(activeBinding), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    return isSessionCurrent(snapshot) && enabled;
  });
  pending = task.catch(() => { /* Caller handles and reports the failure; keep the registration lane usable. */ });
  return task;
}

/** Capture credentials synchronously, before resetAllAppData revokes the app session. */
export function detachPushRegistration(): Promise<void> {
  const accessToken = useAuthStore.getState().accessToken;
  const snapshot = getSessionSnapshot();
  const task = pending.then(async () => {
    if (Platform.OS === 'web') return;
    const nativeResults = await Promise.allSettled([
      Notifications.unregisterForNotificationsAsync(), Notifications.dismissAllNotificationsAsync(), Notifications.clearLastNotificationResponseAsync(),
    ]);
    if (nativeResults.some(result => result.status === 'rejected')) console.warn('[Notifications] Native notification cleanup failed');
    const saved = activeBinding ? null : await SecureStore.getItemAsync(bindingKey);
    const binding: Binding | null = activeBinding ?? (saved ? JSON.parse(saved) : null);
    if (binding && accessToken) {
      if (binding.userId === snapshot.userId) {
        // This one revocation request deliberately uses the captured old credentials; it must not refresh into another account.
        await axios.post(`${API_CONFIG.BASE_URL}/notifications/device/unbind`, {
          installationId: binding.installationId, version: binding.version,
        }, { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 });
      }
    }
    await SecureStore.deleteItemAsync(bindingKey);
    activeBinding = null;
  });
  pending = task.catch(() => { console.warn('[Notifications] Device detach failed; native push registration may need retry.'); });
  return pending.then(() => undefined);
}
