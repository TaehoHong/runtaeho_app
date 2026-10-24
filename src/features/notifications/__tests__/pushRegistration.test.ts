import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { apiClient } from '~/services/api/client';
import { notificationService } from '../services/notificationService';
import { detachPushRegistration, syncPushRegistration } from '../services/pushRegistration';

const mockState = { generation: 1, userId: 7, isLoggedIn: true, accessToken: 'old-account-token' };
const disk = new Map<string, string>();
jest.mock('~/features/auth/stores/authStore', () => ({
  getSessionSnapshot: () => ({ generation: mockState.generation, userId: mockState.userId }),
  isSessionCurrent: (snapshot: { generation: number; userId: number }) => snapshot.generation === mockState.generation && snapshot.userId === mockState.userId,
  useAuthStore: { getState: () => mockState },
}));
jest.mock('axios', () => ({ post: jest.fn() }));
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
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => disk.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { disk.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { disk.delete(key); });
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as Notifications.NotificationPermissionsStatus);
  jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ type: 'expo', data: 'ExpoPushToken[test]' });
  jest.mocked(notificationService.configuration).mockResolvedValue({ pushEnabled: true, leaguePushEnabled: true, reminderPushEnabled: true, noticePushEnabled: true, timezone: 'Asia/Seoul' });
  jest.mocked(apiClient.put).mockResolvedValue({ data: { id: 3, version: 4 } });
});

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
