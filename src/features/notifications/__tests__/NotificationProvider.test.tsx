import React from 'react';
import { render } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { NotificationProvider } from '../NotificationProvider';
import { syncPushRegistration } from '../services/pushRegistration';

const mockAuth = { isLoggedIn: false, sessionGeneration: 1 };
const mockUser: { currentUser: { id: number } | null } = { currentUser: null };
const mockApp = { viewState: 'Loading' };
let mockResponse: { actionIdentifier: string; notification: { request: { identifier: string; content: { data: Record<string, unknown> } } } } | null = null;

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('~/i18n', () => ({ useAppLanguage: () => 'ko' }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('~/features/auth/stores/authStore', () => {
  const store = (select: (state: typeof mockAuth) => unknown) => select(mockAuth);
  store.getState = () => mockAuth;
  return { useAuthStore: store, getSessionSnapshot: jest.fn(), isSessionCurrent: jest.fn() };
});
jest.mock('~/stores/user/userStore', () => ({ useUserStore: (select: (state: typeof mockUser) => unknown) => select(mockUser) }));
jest.mock('~/stores/app/appStore', () => ({ ViewState: { Loaded: 'Loaded' }, useAppStore: (select: (state: typeof mockApp) => unknown) => select(mockApp) }));
jest.mock('~/services/api/client', () => ({ apiClient: {} }));
jest.mock('../services/pushRegistration', () => ({ syncPushRegistration: jest.fn(async () => false) }));
jest.mock('expo-notifications', () => ({
  useLastNotificationResponse: () => mockResponse, DEFAULT_ACTION_IDENTIFIER: 'default',
  setNotificationHandler: jest.fn(), clearLastNotificationResponseAsync: jest.fn(async () => undefined),
  addNotificationReceivedListener: () => ({ remove: jest.fn() }), addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
}));

beforeEach(() => {
  mockAuth.isLoggedIn = false; mockUser.currentUser = null; mockApp.viewState = 'Loading';
  mockResponse = { actionIdentifier: 'default', notification: { request: { identifier: 'push-1', content: { data: { notificationId: '42' } } } } };
});

it('a cold-start tap waits for authenticated navigation and is routed only once', () => {
  const screen = render(<NotificationProvider />);
  expect(router.push).not.toHaveBeenCalled();
  mockAuth.isLoggedIn = true; mockUser.currentUser = { id: 7 }; mockApp.viewState = 'Loaded';
  screen.rerender(<NotificationProvider />);
  expect(router.push).toHaveBeenCalledWith({ pathname: '/user/notification', params: { id: '42' } });
  screen.rerender(<NotificationProvider />);
  expect(router.push).toHaveBeenCalledTimes(1);
});

it('an arbitrary URL in push data cannot drive navigation', () => {
  mockAuth.isLoggedIn = true; mockUser.currentUser = { id: 7 }; mockApp.viewState = 'Loaded';
  mockResponse!.notification.request.content.data = { url: 'https://untrusted.invalid', notificationId: '../admin' };
  render(<NotificationProvider />);
  expect(router.push).not.toHaveBeenCalled();
});

it('passes token events to registration so they do not require another native token request', () => {
  mockAuth.isLoggedIn = true; mockUser.currentUser = { id: 7 }; mockApp.viewState = 'Loaded';
  render(<NotificationProvider />);
  const token: Notifications.DevicePushToken = { type: 'ios', data: 'rolled-native-token' };

  jest.mocked(Notifications.addPushTokenListener).mock.calls[0]![0](token);

  expect(syncPushRegistration).toHaveBeenLastCalledWith(token);
});
