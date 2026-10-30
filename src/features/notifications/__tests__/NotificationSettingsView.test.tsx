import React from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '~/services/api/client';
import { queryKeys } from '~/services/queryClient';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { createUser } from '~/features/user/models/User';
import { NotificationSettingsView } from '../views/NotificationViews';
import type { NotificationConfiguration } from '../services/notificationService';
import { requestPushPermission, syncPushRegistration } from '../services/pushRegistration';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useFocusEffect: (effect: () => void) => require('react').useEffect(effect, []) }));
jest.mock('~/shared/components', () => ({ TopScreenSafeAreaView: require('react-native').View }));
jest.mock('~/shared/components/typography', () => ({ Text: require('react-native').Text }));
jest.mock('../services/pushRegistration', () => ({ requestPushPermission: jest.fn(), syncPushRegistration: jest.fn(), currentTimezone: () => 'Asia/Seoul' }));
jest.mock('~/shared/services/TokenRefreshInterceptor', () => ({
  tokenRefreshInterceptor: {
    validateAndRefreshIfNeeded: jest.fn().mockResolvedValue(undefined),
    handleResponseError: (error: unknown) => Promise.reject(error),
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => { resolve = complete; });
  return { promise, resolve };
}
const initial: NotificationConfiguration = {
  pushEnabled: true, leaguePushEnabled: true, reminderPushEnabled: true,
  noticePushEnabled: true, timezone: 'Asia/Seoul',
};
const requests: InternalAxiosRequestConfig[] = [];
const writes: NotificationConfiguration[] = [];
const originalAdapter = apiClient.defaults.adapter;
let read: ReturnType<typeof deferred<NotificationConfiguration>> | undefined;
let write: ReturnType<typeof deferred<NotificationConfiguration>> | undefined;
let failWrite = false;
let appStateChanged: (state: AppStateStatus) => void;
let appStateSpy: jest.SpyInstance;
let alert: jest.SpyInstance;

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return { ...render(<QueryClientProvider client={client}><NotificationSettingsView /></QueryClientProvider>), client };
}

beforeEach(() => {
  jest.useFakeTimers();
  requests.length = 0;
  writes.length = 0;
  read = undefined;
  write = undefined;
  failWrite = false;
  useAuthStore.setState({ isLoggedIn: true, tokensRevoked: false, accessToken: 'test-token', sessionGeneration: 1 });
  useUserStore.setState({ currentUser: createUser({ id: 7, nickname: 'Runner' }) });
  jest.mocked(syncPushRegistration).mockResolvedValue(true);
  jest.mocked(requestPushPermission).mockResolvedValue(true);
  appStateSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appStateChanged = listener;
    return { remove: jest.fn() };
  });
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  apiClient.defaults.adapter = async config => {
    requests.push(config);
    let data: NotificationConfiguration;
    if (config.method === 'put') {
      const value = JSON.parse(config.data) as NotificationConfiguration;
      writes.push(value);
      if (failWrite) throw new Error('offline');
      data = write ? await write.promise : value;
    } else {
      data = read ? await read.promise : initial;
    }
    return { config, data, status: 200, statusText: 'OK', headers: {} };
  };
});

afterEach(() => {
  if (originalAdapter) apiClient.defaults.adapter = originalAdapter;
  else delete apiClient.defaults.adapter;
  appStateSpy.mockRestore();
  alert.mockRestore();
  jest.useRealTimers();
});

it('keeps the saved choice and next payload when foreground reads finish after the save', async () => {
  const screen = setup();
  await waitFor(() => expect(screen.getByLabelText('리그 결과').props.value).toBe(true));
  const beforeSave = deferred<NotificationConfiguration>();
  read = beforeSave;
  act(() => appStateChanged('active'));
  await waitFor(() => expect(requests).toHaveLength(2));

  write = deferred<NotificationConfiguration>();
  fireEvent(screen.getByLabelText('리그 결과'), 'valueChange', false);
  await waitFor(() => expect(writes).toHaveLength(1));
  await act(async () => { write!.resolve({ ...initial, leaguePushEnabled: false }); });
  await waitFor(() => expect(screen.getByLabelText('리그 결과').props.disabled).toBe(false));
  expect(screen.getByLabelText('리그 결과').props.value).toBe(false);

  // The transport completes even if QueryClient has cancelled its query.
  await act(async () => { beforeSave.resolve(initial); });
  await act(async () => { await jest.runOnlyPendingTimersAsync(); });
  write = deferred<NotificationConfiguration>();
  fireEvent(screen.getByLabelText('러닝 리마인더'), 'valueChange', false);
  await waitFor(() => expect(writes).toHaveLength(2));
  expect(writes[1]).toEqual({ ...initial, leaguePushEnabled: false, reminderPushEnabled: false });

  // NotificationProvider can also invalidate configuration while the PUT is pending.
  const duringSave = deferred<NotificationConfiguration>();
  read = duringSave;
  act(() => { void screen.client.invalidateQueries({ queryKey: queryKeys.notifications.all }); });
  await waitFor(() => expect(requests).toHaveLength(5));
  await act(async () => { write!.resolve({ ...initial, leaguePushEnabled: false, reminderPushEnabled: false }); });
  await waitFor(() => expect(screen.getByLabelText('러닝 리마인더').props.disabled).toBe(false));
  await act(async () => { duringSave.resolve({ ...initial, leaguePushEnabled: false }); });
  await act(async () => { await jest.runOnlyPendingTimersAsync(); });
  write = undefined;
  fireEvent(screen.getByLabelText('운영 공지'), 'valueChange', false);
  await waitFor(() => expect(writes).toHaveLength(3));
  expect(writes[2]).toEqual({ ...initial, leaguePushEnabled: false, reminderPushEnabled: false, noticePushEnabled: false });
  await waitFor(() => expect(screen.getByLabelText('리그 결과').props.value).toBe(false));
  expect(screen.getByLabelText('러닝 리마인더').props.value).toBe(false);
  expect(syncPushRegistration).toHaveBeenCalled();
});

it('keeps the previous choice after a failed save and allows saving it again', async () => {
  const screen = setup();
  await waitFor(() => expect(screen.getByLabelText('리그 결과').props.value).toBe(true));
  failWrite = true;
  fireEvent(screen.getByLabelText('리그 결과'), 'valueChange', false);
  await waitFor(() => expect(alert).toHaveBeenCalledWith('설정 변경 실패', expect.any(String)));
  expect(screen.getByLabelText('리그 결과').props.value).toBe(true);
  expect(screen.getByLabelText('리그 결과').props.disabled).toBe(false);
  failWrite = false;
  fireEvent(screen.getByLabelText('리그 결과'), 'valueChange', false);
  await waitFor(() => expect(screen.getByLabelText('리그 결과').props.value).toBe(false));
  expect(writes[1]).toEqual({ ...initial, leaguePushEnabled: false });
});

it('does not apply a pending save after the same user starts a new session', async () => {
  const screen = setup();
  await waitFor(() => expect(screen.getByLabelText('리그 결과').props.value).toBe(true));
  write = deferred<NotificationConfiguration>();
  fireEvent(screen.getByLabelText('리그 결과'), 'valueChange', false);
  await waitFor(() => expect(writes).toHaveLength(1));
  act(() => {
    useAuthStore.getState().invalidateSession();
    screen.client.setQueryData(queryKeys.notifications.configuration(7), { ...initial, noticePushEnabled: false });
  });
  await act(async () => { write!.resolve({ ...initial, leaguePushEnabled: false }); });
  await waitFor(() => expect(screen.getByLabelText('리그 결과').props.disabled).toBe(false));
  expect(screen.getByLabelText('리그 결과').props.value).toBe(true);
  expect(screen.getByLabelText('운영 공지').props.value).toBe(false);
  expect(syncPushRegistration).not.toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalled();
});

it('saves an enabled preference and releases the switches while push registration is pending', async () => {
  const screen = setup();
  await waitFor(() => expect(screen.getByLabelText('푸시 알림').props.value).toBe(true));
  act(() => screen.client.setQueryData(queryKeys.notifications.configuration(7), { ...initial, pushEnabled: false }));
  const registration = deferred<boolean>();
  jest.mocked(syncPushRegistration).mockReturnValue(registration.promise);

  fireEvent(screen.getByLabelText('푸시 알림'), 'valueChange', true);

  await waitFor(() => expect(writes).toEqual([{ ...initial, pushEnabled: true }]));
  await waitFor(() => expect(screen.getByLabelText('푸시 알림').props.disabled).toBe(false));
  expect(screen.getByLabelText('푸시 알림').props.value).toBe(true);
  expect(alert).not.toHaveBeenCalled();
  await act(async () => { registration.resolve(true); });
});

it('keeps a successful save and reports registration failure separately', async () => {
  const screen = setup();
  await waitFor(() => expect(screen.getByLabelText('푸시 알림').props.value).toBe(true));
  act(() => screen.client.setQueryData(queryKeys.notifications.configuration(7), { ...initial, pushEnabled: false }));
  jest.mocked(syncPushRegistration).mockRejectedValue(new Error('FCM unavailable'));

  fireEvent(screen.getByLabelText('푸시 알림'), 'valueChange', true);

  await waitFor(() => expect(writes).toEqual([{ ...initial, pushEnabled: true }]));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('푸시 알림 등록 실패', expect.any(String)));
  expect(screen.getByLabelText('푸시 알림').props.value).toBe(true);
  expect(screen.getByLabelText('푸시 알림').props.disabled).toBe(false);
  expect(alert).not.toHaveBeenCalledWith('설정 변경 실패', expect.anything());
});

it('does not save or register when OS notification permission is denied', async () => {
  const screen = setup();
  await waitFor(() => expect(screen.getByLabelText('푸시 알림').props.value).toBe(true));
  act(() => screen.client.setQueryData(queryKeys.notifications.configuration(7), { ...initial, pushEnabled: false }));
  jest.mocked(requestPushPermission).mockResolvedValue(false);

  fireEvent(screen.getByLabelText('푸시 알림'), 'valueChange', true);

  await waitFor(() => expect(alert).toHaveBeenCalledWith('알림 권한이 필요해요', expect.any(String), expect.any(Array)));
  expect(writes).toEqual([]);
  expect(syncPushRegistration).not.toHaveBeenCalled();
  expect(screen.getByLabelText('푸시 알림').props.value).toBe(false);
});

it('does not send the preference after the session changes during the permission prompt', async () => {
  const screen = setup();
  await waitFor(() => expect(screen.getByLabelText('푸시 알림').props.value).toBe(true));
  act(() => screen.client.setQueryData(queryKeys.notifications.configuration(7), { ...initial, pushEnabled: false }));
  const permission = deferred<boolean>();
  jest.mocked(requestPushPermission).mockReturnValue(permission.promise);
  fireEvent(screen.getByLabelText('푸시 알림'), 'valueChange', true);
  act(() => { useAuthStore.getState().invalidateSession(); });

  await act(async () => { permission.resolve(true); });

  expect(writes).toEqual([]);
  expect(syncPushRegistration).not.toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalled();
});

it('keeps the committed preference without showing a late registration alert after leaving', async () => {
  const screen = setup();
  await waitFor(() => expect(screen.getByLabelText('리그 결과').props.value).toBe(true));
  let failRegistration!: (error: Error) => void;
  jest.mocked(syncPushRegistration).mockReturnValue(new Promise((_resolve, reject) => { failRegistration = reject; }));
  fireEvent(screen.getByLabelText('리그 결과'), 'valueChange', false);
  await waitFor(() => expect(screen.getByLabelText('리그 결과').props.disabled).toBe(false));
  expect(writes).toEqual([{ ...initial, leaguePushEnabled: false }]);
  screen.unmount();

  await act(async () => { failRegistration(new Error('registration unavailable')); });

  expect(screen.client.getQueryData(queryKeys.notifications.configuration(7))).toEqual({ ...initial, leaguePushEnabled: false });
  expect(alert).not.toHaveBeenCalled();
});
