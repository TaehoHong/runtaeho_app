import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { apiClient } from '~/services/api/client';
import { notificationService } from '../services/notificationService';
import { detachPushRegistration, requestPushPermission, syncPushRegistration } from '../services/pushRegistration';

const mockState = { generation: 1, userId: 7, isLoggedIn: true, accessToken: 'old-account-token' };
const disk = new Map<string, string>();
jest.mock('~/features/auth/stores/authStore', () => ({
  getSessionSnapshot: () => ({ generation: mockState.generation, userId: mockState.userId }),
  isSessionCurrent: (snapshot: { generation: number; userId: number }) => snapshot.generation === mockState.generation && snapshot.userId === mockState.userId,
  useAuthStore: { getState: () => mockState },
}));
jest.mock('axios', () => ({ post: jest.fn(), isAxiosError: (error: { isAxiosError?: boolean }) => error?.isAxiosError === true }));
jest.mock('~/services/api/client', () => ({ apiClient: { put: jest.fn() } }));
jest.mock('~/services/api/config', () => ({ API_CONFIG: { BASE_URL: 'https://test.invalid/api/v1' } }));
jest.mock('../services/notificationService', () => ({ notificationService: { configuration: jest.fn(), configure: jest.fn() } }));
jest.mock('expo-crypto', () => ({ randomUUID: () => '12345678-1234-1234-1234-123456789abc' }));
jest.mock('expo-constants', () => ({ easConfig: { projectId: 'test-project' } }));
jest.mock('expo-localization', () => ({ getCalendars: () => [{ timeZone: 'Asia/Seoul' }] }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(), getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(), unregisterForNotificationsAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(), clearLastNotificationResponseAsync: jest.fn(),
  IosAuthorizationStatus: { PROVISIONAL: 3 }, AndroidImportance: { DEFAULT: 3 },
}));

beforeEach(() => {
  disk.clear();
  mockState.generation = 1; mockState.userId = 7; mockState.isLoggedIn = true;
  mockState.accessToken = 'old-account-token';
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => disk.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { disk.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { disk.delete(key); });
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as Notifications.NotificationPermissionsStatus);
  jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ type: 'expo', data: 'ExpoPushToken[test]' });
  jest.mocked(notificationService.configuration).mockResolvedValue({ pushEnabled: true, leaguePushEnabled: true, reminderPushEnabled: true, noticePushEnabled: true, timezone: 'Asia/Seoul' });
  jest.mocked(apiClient.put).mockResolvedValue({ data: { id: 3, version: 4 } });
});

afterEach(async () => { await detachPushRegistration(); });

it('passive login sync never requests permission and sends no token when push is disabled', async () => {
  jest.mocked(notificationService.configuration).mockResolvedValue({ pushEnabled: false, leaguePushEnabled: true, reminderPushEnabled: true, noticePushEnabled: true, timezone: 'Asia/Seoul' });
  expect(await syncPushRegistration()).toBe(false);
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  expect(apiClient.put).toHaveBeenCalledWith('/notifications/device', expect.objectContaining({ pushToken: null }), expect.anything());
});

it('logout waits for in flight binding and detaches the returned binding version with captured credentials', async () => {
  let finish!: (value: { data: { id: number; version: number } }) => void;
  jest.mocked(apiClient.put).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const sync = syncPushRegistration();
  for (let turn = 0; turn < 30 && jest.mocked(apiClient.put).mock.calls.length === 0; turn++) await Promise.resolve();
  expect(apiClient.put).toHaveBeenCalledTimes(1);
  const logout = detachPushRegistration();
  mockState.generation++;
  mockState.isLoggedIn = false;
  finish({ data: { id: 3, version: 8 } });
  expect(await sync).toBe(false);
  await logout;
  expect(axios.post).toHaveBeenCalledWith('https://test.invalid/api/v1/notifications/device/unbind',
    { installationId: '12345678-1234-1234-1234-123456789abc', version: 8 },
    expect.objectContaining({ headers: { Authorization: 'Bearer old-account-token' } }));
  expect(disk.has('notification-installation-id')).toBe(true);
  expect(disk.has('notification-device-binding')).toBe(false);
});

it('a session change while obtaining the token prevents stale binding', async () => {
  jest.mocked(Notifications.getExpoPushTokenAsync).mockImplementation(async () => {
    mockState.generation++;
    return { type: 'expo', data: 'ExpoPushToken[old]' };
  });
  expect(await syncPushRegistration()).toBe(false);
  expect(apiClient.put).not.toHaveBeenCalled();
});

it('logout revokes a successful server binding even when persisting it fails', async () => {
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    if (key === 'notification-device-binding') throw new Error('storage unavailable');
    disk.set(key, value);
  });
  jest.mocked(apiClient.put).mockResolvedValue({ data: { id: 3, version: 9 } });

  await expect(syncPushRegistration()).rejects.toThrow('storage unavailable');
  await detachPushRegistration();

  expect(axios.post).toHaveBeenCalledWith('https://test.invalid/api/v1/notifications/device/unbind',
    { installationId: '12345678-1234-1234-1234-123456789abc', version: 9 },
    expect.objectContaining({ headers: { Authorization: 'Bearer old-account-token' } }));
});

it.each(['android', 'ios'] as const)('exchanges a %s token event without requesting another native token', async type => {
  const devicePushToken: Notifications.DevicePushToken = { type, data: 'native-token' };
  await syncPushRegistration(devicePushToken);
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'test-project', devicePushToken });
  expect(apiClient.put).toHaveBeenCalledWith('/notifications/device', expect.objectContaining({ pushToken: 'ExpoPushToken[test]' }), expect.anything());
});

it('logout does not wait for token acquisition and a late token cannot rebind', async () => {
  let finish!: (value: Notifications.ExpoPushToken) => void;
  jest.mocked(Notifications.getExpoPushTokenAsync).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const sync = syncPushRegistration();
  await waitFor(() => expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(1));
  const logout = detachPushRegistration();
  mockState.generation++;
  mockState.isLoggedIn = false;

  try {
    await waitFor(() => expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalled());
    await logout;
  } finally {
    finish({ type: 'expo', data: 'ExpoPushToken[late]' });
    await logout;
  }
  expect(await sync).toBe(false);
  expect(apiClient.put).not.toHaveBeenCalled();
});

it('a newer disabled sync supersedes a pending token without restoring it later', async () => {
  let finish!: (value: Notifications.ExpoPushToken) => void;
  jest.mocked(Notifications.getExpoPushTokenAsync).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const older = syncPushRegistration();
  await waitFor(() => expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(1));
  jest.mocked(notificationService.configuration).mockResolvedValue({ pushEnabled: false, leaguePushEnabled: true, reminderPushEnabled: true, noticePushEnabled: true, timezone: 'Asia/Seoul' });
  const newer = syncPushRegistration();

  try {
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/notifications/device', expect.objectContaining({ pushToken: null }), expect.anything()));
    expect(await newer).toBe(false);
  } finally {
    finish({ type: 'expo', data: 'ExpoPushToken[obsolete]' });
    await older;
    await newer;
  }
  expect(await older).toBe(false);
  expect(apiClient.put).toHaveBeenCalledTimes(1);
});

it('native token events do not create a self-sustaining registration loop', async () => {
  const nativeToken: Notifications.DevicePushToken = { type: 'ios', data: 'native-token' };
  let eventRegistration: Promise<boolean> | undefined;
  let nativeRequests = 0;
  jest.mocked(Notifications.getExpoPushTokenAsync).mockImplementation(async options => {
    if (!options?.devicePushToken) {
      nativeRequests++;
      // Native token lookup emits a token event. Cap the test's emitter on broken code.
      if (nativeRequests < 4) eventRegistration = syncPushRegistration(nativeToken);
    }
    return { type: 'expo', data: 'ExpoPushToken[test]' };
  });

  await syncPushRegistration();
  await waitFor(() => expect(apiClient.put).toHaveBeenCalled());
  await eventRegistration;

  expect(nativeRequests).toBe(1);
  expect(apiClient.put).toHaveBeenCalledTimes(1);
});

it('requests OS authorization without waiting for any server or push token request', async () => {
  const os = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false } as Notifications.NotificationPermissionsStatus);
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: true } as Notifications.NotificationPermissionsStatus);
  try {
    expect(await requestPushPermission()).toBe(true);
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('activity', expect.anything());
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(notificationService.configuration).not.toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(apiClient.put).not.toHaveBeenCalled();
  } finally {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
  }
});

it('retains revocation credentials when logout cleanup fails and retries after session reset', async () => {
  await syncPushRegistration();
  jest.mocked(axios.post).mockRejectedValueOnce(new Error('unbind unavailable'));
  try {
    await expect(detachPushRegistration()).rejects.toThrow('unbind unavailable');
    mockState.generation++;
    mockState.isLoggedIn = false;
    mockState.accessToken = '';
    await detachPushRegistration();
    expect(axios.post).toHaveBeenLastCalledWith('https://test.invalid/api/v1/notifications/device/unbind',
      { installationId: '12345678-1234-1234-1234-123456789abc', version: 4 },
      expect.objectContaining({ headers: { Authorization: 'Bearer old-account-token' } }));
    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(disk.has('notification-device-binding')).toBe(false);
  } finally {
    await detachPushRegistration();
  }
});

it.each([401, 403])('finishes native cleanup when captured credentials are permanently rejected with %i', async status => {
  await syncPushRegistration();
  jest.mocked(axios.post).mockRejectedValueOnce(Object.assign(new Error('expired authorization'), { isAxiosError: true, response: { status } }));

  await expect(detachPushRegistration()).resolves.toBeUndefined();

  expect(Notifications.unregisterForNotificationsAsync).toHaveBeenCalled();
  expect(disk.has('notification-device-binding')).toBe(false);
});
