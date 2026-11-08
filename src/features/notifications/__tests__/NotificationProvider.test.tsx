import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { NotificationProvider } from '../NotificationProvider';
import { syncPushRegistration } from '../services/pushRegistration';
import { notificationService, type NotificationItem } from '../services/notificationService';

const agreedToken = `header.${Buffer.from(JSON.stringify({ isAgreedOnTerms: true })).toString('base64url')}.signature`;
const mockAuth = { isLoggedIn: false, sessionGeneration: 1, accessToken: agreedToken };
const mockUser: { currentUser: { id: number } | null } = { currentUser: null };
const mockApp: { viewState: string; authenticatedNavigationSession: { generation: number; userId: number | null } | null } = {
  viewState: 'Loading', authenticatedNavigationSession: null,
};
const mockUpdate = { isAutoUpdateCompleted: true };
const legacyItem: NotificationItem = {
  id: 42, type: 'NOTICE', title: 'Notice', body: 'Notice body', leagueParticipantId: null,
  createdDatetime: '2026-11-07T00:00:00Z', readDatetime: '2026-11-07T01:00:00Z',
};
let mockResponse: { actionIdentifier: string; notification: { request: { identifier: string; content: { data: Record<string, unknown> } } } } | null = null;

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('~/i18n', () => ({ useAppLanguage: () => 'ko', t: (value: string) => value }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('~/features/auth/stores/authStore', () => {
  const store = (select: (state: typeof mockAuth) => unknown) => select(mockAuth);
  store.getState = () => mockAuth;
  return { useAuthStore: store,
    getSessionSnapshot: () => ({ generation: mockAuth.sessionGeneration, userId: mockUser.currentUser?.id ?? null }),
    isSessionCurrent: (snapshot: { generation: number; userId: number | null }) =>
      snapshot.generation === mockAuth.sessionGeneration && snapshot.userId === (mockUser.currentUser?.id ?? null),
  };
});
jest.mock('~/stores/user/userStore', () => {
  const store = (select: (state: typeof mockUser) => unknown) => select(mockUser);
  store.getState = () => mockUser;
  return { useUserStore: store };
});
jest.mock('~/stores/app/appStore', () => ({ ViewState: { Loaded: 'Loaded' }, useAppStore: (select: (state: typeof mockApp) => unknown) => select(mockApp) }));
jest.mock('~/features/updates/stores/updateStore', () => ({ useUpdateStore: (select: (state: typeof mockUpdate) => unknown) => select(mockUpdate) }));
jest.mock('~/services/api/client', () => ({ apiClient: {} }));
jest.mock('../services/notificationService', () => ({
  ...jest.requireActual('../services/notificationService'),
  notificationService: { open: jest.fn() },
}));
jest.mock('../services/pushRegistration', () => ({ syncPushRegistration: jest.fn(async () => false) }));
jest.mock('expo-notifications', () => ({
  useLastNotificationResponse: () => mockResponse, DEFAULT_ACTION_IDENTIFIER: 'default',
  setNotificationHandler: jest.fn(), clearLastNotificationResponseAsync: jest.fn(async () => undefined),
  addNotificationReceivedListener: () => ({ remove: jest.fn() }), addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
}));

beforeEach(() => {
  mockAuth.isLoggedIn = false; mockAuth.sessionGeneration = 1; mockAuth.accessToken = agreedToken;
  mockUser.currentUser = null; mockApp.viewState = 'Loading'; mockApp.authenticatedNavigationSession = null;
  mockUpdate.isAutoUpdateCompleted = true;
  mockResponse = { actionIdentifier: 'default', notification: { request: { identifier: 'push-1', content: { data: { notificationId: '42', recipientUserId: '7' } } } } };
});

function readySession() {
  mockAuth.isLoggedIn = true; mockUser.currentUser = { id: 7 }; mockApp.viewState = 'Loaded';
  mockApp.authenticatedNavigationSession = { generation: mockAuth.sessionGeneration, userId: 7 };
}

it('a cold-start tap waits for authenticated navigation and is routed only once', () => {
  const screen = render(<NotificationProvider />);
  expect(router.push).not.toHaveBeenCalled();
  readySession();
  screen.rerender(<NotificationProvider />);
  expect(router.push).toHaveBeenCalledWith({ pathname: '/user/notification', params: { id: '42' } });
  screen.rerender(<NotificationProvider />);
  expect(router.push).toHaveBeenCalledTimes(1);
});

it('an arbitrary URL in push data cannot drive navigation', () => {
  readySession();
  mockResponse!.notification.request.content.data = { url: 'https://untrusted.invalid', notificationId: '../admin' };
  render(<NotificationProvider />);
  expect(router.push).not.toHaveBeenCalled();
});

it('passes token events to registration so they do not require another native token request', () => {
  readySession();
  render(<NotificationProvider />);
  const token: Notifications.DevicePushToken = { type: 'ios', data: 'rolled-native-token' };

  jest.mocked(Notifications.addPushTokenListener).mock.calls[0]![0](token);

  expect(syncPushRegistration).toHaveBeenLastCalledWith(token);
});

it('does not consume a tap using the guest loaded state or an earlier session readiness', () => {
  readySession();
  mockApp.authenticatedNavigationSession = null;
  const screen = render(<NotificationProvider />);
  expect(router.push).not.toHaveBeenCalled();
  expect(Notifications.clearLastNotificationResponseAsync).not.toHaveBeenCalled();

  mockApp.authenticatedNavigationSession = { generation: 0, userId: 7 };
  screen.rerender(<NotificationProvider />);
  expect(router.push).not.toHaveBeenCalled();

  mockApp.authenticatedNavigationSession = { generation: 1, userId: 7 };
  screen.rerender(<NotificationProvider />);
  expect(router.push).toHaveBeenCalledTimes(1);
});

it('waits for terms and OTA even when the session previously navigated', () => {
  readySession();
  mockAuth.accessToken = `header.${Buffer.from(JSON.stringify({ isAgreedOnTerms: false })).toString('base64url')}.signature`;
  const screen = render(<NotificationProvider />);
  expect(router.push).not.toHaveBeenCalled();

  mockAuth.accessToken = agreedToken; mockUpdate.isAutoUpdateCompleted = false;
  screen.rerender(<NotificationProvider />);
  expect(router.push).not.toHaveBeenCalled();

  mockUpdate.isAutoUpdateCompleted = true;
  screen.rerender(<NotificationProvider />);
  expect(router.push).toHaveBeenCalledTimes(1);
});

it.each(['8', undefined])('hides foreground text and sound without a matching recipient (%s)', async (recipientUserId) => {
  readySession();
  render(<NotificationProvider />);
  const handler = jest.mocked(Notifications.setNotificationHandler).mock.calls[0]![0]!;
  const notification = { request: { content: { data: { notificationId: '42', recipientUserId } } } } as unknown as Notifications.Notification;
  const behavior = await handler.handleNotification(notification);
  expect(behavior).toMatchObject({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false });
});

it.each(['7', 7])('shows a foreground notification for the current recipient (%s)', async recipientUserId => {
  readySession();
  mockResponse!.notification.request.content.data.recipientUserId = recipientUserId;
  render(<NotificationProvider />);
  const handler = jest.mocked(Notifications.setNotificationHandler).mock.calls[0]![0]!;
  const behavior = await handler.handleNotification(mockResponse!.notification as Notifications.Notification);
  expect(behavior).toMatchObject({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true });
});

it('rechecks the current account when a delayed foreground notification arrives', async () => {
  readySession();
  render(<NotificationProvider />);
  const handler = jest.mocked(Notifications.setNotificationHandler).mock.calls[0]![0]!;
  mockUser.currentUser = { id: 8 };
  const behavior = await handler.handleNotification(mockResponse!.notification as Notifications.Notification);
  expect(behavior).toMatchObject({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false });
});

it('does not open a notification addressed to a different account', () => {
  readySession();
  mockResponse!.notification.request.content.data.recipientUserId = '8';
  render(<NotificationProvider />);
  expect(router.push).not.toHaveBeenCalled();
  expect(notificationService.open).not.toHaveBeenCalled();
});

it('checks ownership before opening a legacy tap and routes it only once', async () => {
  readySession();
  delete mockResponse!.notification.request.content.data.recipientUserId;
  let allow: (value: NotificationItem) => void = () => {};
  jest.mocked(notificationService.open).mockReturnValue(new Promise(resolve => { allow = resolve; }));
  const screen = render(<NotificationProvider />);
  expect(notificationService.open).toHaveBeenCalledWith(42, 'ko');
  expect(router.push).not.toHaveBeenCalled();
  await act(async () => { allow(legacyItem); });
  await waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));
  screen.rerender(<NotificationProvider />);
  expect(router.push).toHaveBeenCalledTimes(1);
});

it('does not open legacy content when ownership verification fails', async () => {
  readySession();
  delete mockResponse!.notification.request.content.data.recipientUserId;
  jest.mocked(notificationService.open).mockRejectedValue(new Error('not owned'));
  render(<NotificationProvider />);
  await waitFor(() => expect(notificationService.open).toHaveBeenCalled());
  expect(router.push).not.toHaveBeenCalled();
});

it('ignores a legacy ownership response after the session changes', async () => {
  readySession();
  delete mockResponse!.notification.request.content.data.recipientUserId;
  let allow: (value: NotificationItem) => void = () => {};
  jest.mocked(notificationService.open).mockReturnValue(new Promise(resolve => { allow = resolve; }));
  const screen = render(<NotificationProvider />);
  mockAuth.sessionGeneration = 2; mockUser.currentUser = { id: 8 };
  screen.rerender(<NotificationProvider />);
  await act(async () => { allow(legacyItem); });
  expect(router.push).not.toHaveBeenCalled();
});
