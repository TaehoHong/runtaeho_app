import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '~/services/queryClient';
import { router } from 'expo-router';
import { NotificationDetailView, NotificationInboxView, NotificationSettingsView } from '../views/NotificationViews';
import { notificationService } from '../services/notificationService';
import { leagueService } from '~/features/league/services/leagueService';
import { syncPushRegistration } from '../services/pushRegistration';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn() }, useLocalSearchParams: () => ({ id: '42' }), useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]) }));
jest.mock('~/shared/components', () => ({ TopScreenSafeAreaView: require('react-native').View }));
jest.mock('~/shared/components/typography', () => ({ Text: require('react-native').Text }));
jest.mock('~/stores/user/userStore', () => ({ useUserStore: (select: (state: unknown) => unknown) => select({ currentUser: { id: 7 } }) }));
jest.mock('~/features/auth/stores/authStore', () => ({ getSessionSnapshot: () => ({ generation: 1, userId: 7 }), isSessionCurrent: () => true }));
jest.mock('~/features/league/services/leagueService', () => ({ leagueService: { getResult: jest.fn() } }));
jest.mock('../services/notificationService', () => ({ notificationService: { list: jest.fn(), open: jest.fn(), configuration: jest.fn(), configure: jest.fn() } }));
jest.mock('../services/pushRegistration', () => ({ syncPushRegistration: jest.fn(), getPushPermission: jest.fn(async () => true), currentTimezone: () => 'Asia/Seoul' }));

const item = { id: 42, title: '공지 제목', body: '공지 본문', type: 'NOTICE' as const, leagueParticipantId: null, readDatetime: null, createdDatetime: '2026-10-13T00:00:00Z' };
function view(element: React.ReactElement, client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) {
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

it('listing unread notifications does not mark them read; tapping selects the exact notification', async () => {
  jest.mocked(notificationService.list).mockResolvedValue({ content: [item], cursor: 42, hasNext: false });
  const screen = view(<NotificationInboxView />);
  await waitFor(() => expect(screen.getByText('공지 제목')).toBeTruthy());
  expect(notificationService.open).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('공지 제목'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/user/notification', params: { id: '42' } });
});

it('returns to the existing running screen instead of pushing a second tab instance', async () => {
  jest.mocked(notificationService.open).mockResolvedValue({ ...item, type: 'RUNNING_REMINDER' });
  const screen = view(<NotificationDetailView />);
  fireEvent.press(await screen.findByText('러닝하러 가기'));
  expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/running');
  expect(router.push).not.toHaveBeenCalled();
});

it('offers retry for a temporary detail failure without claiming that the notification expired', async () => {
  jest.mocked(notificationService.open).mockRejectedValue(new Error('offline'));
  const screen = view(<NotificationDetailView />);
  await screen.findByText('다시 시도');
  expect(screen.queryByText('알림을 찾을 수 없거나 보관 기간이 지났어요.')).toBeNull();
});

it('offers an inbox return instead of retrying a notification that no longer exists', async () => {
  jest.mocked(notificationService.open).mockRejectedValue(Object.assign(new Error('not found'), { isAxiosError: true, response: { status: 404 } }));
  const screen = view(<NotificationDetailView />);
  await screen.findByText('알림을 찾을 수 없거나 보관 기간이 지났어요.');
  expect(screen.queryByText('다시 시도')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: '알림함' }));
  expect(router.dismissTo).toHaveBeenCalledWith('/user/notifications');
});

it('keeps existing notifications and reports a failed refresh', async () => {
  jest.useFakeTimers();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.mocked(notificationService.list).mockResolvedValue({ content: [item], cursor: 42, hasNext: false });
  const screen = view(<NotificationInboxView />, client);
  try {
    await screen.findByText('공지 제목');
    jest.mocked(notificationService.list).mockRejectedValue(new Error('offline'));
    await act(async () => { await client.invalidateQueries({ queryKey: queryKeys.notifications.inbox(7, 'ko') }); });
    await screen.findByRole('button', { name: '다시 시도' });
    expect(screen.getByText('공지 제목')).toBeTruthy();
  } finally {
    screen.unmount();
    jest.useRealTimers();
  }
});

it('keeps a successful read in the inbox cache when the following refresh fails', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const key = queryKeys.notifications.inbox(7, 'ko');
  client.setQueryData(key, { pages: [{ content: [item], cursor: 42, hasNext: false }], pageParams: [undefined] });
  jest.mocked(notificationService.open).mockResolvedValue({ ...item, readDatetime: '2026-10-13T01:00:00Z' });
  const screen = view(<NotificationDetailView />, client);
  await screen.findByText('공지 본문');
  await waitFor(() => expect(client.getQueryData(key)).toEqual(expect.objectContaining({
    pages: [expect.objectContaining({ content: [expect.objectContaining({ id: 42, readDatetime: '2026-10-13T01:00:00Z' })] })],
  })));
  jest.mocked(notificationService.list).mockRejectedValue(new Error('offline'));
  screen.rerender(<QueryClientProvider client={client}><NotificationInboxView /></QueryClientProvider>);
  await waitFor(() => expect(notificationService.list).toHaveBeenCalled());
  expect(screen.queryByText('읽지 않음')).toBeNull();
});

it('opening an item uses the server ownership-checked read endpoint', async () => {
  jest.mocked(notificationService.open).mockResolvedValue({ ...item, readDatetime: '2026-10-13T01:00:00Z' });
  const screen = view(<NotificationDetailView />);
  await waitFor(() => expect(screen.getByText('공지 본문')).toBeTruthy());
  expect(notificationService.open).toHaveBeenCalledWith(42, 'ko');
});

it('permission rejection leaves the opt-in setting disabled', async () => {
  jest.mocked(notificationService.configuration).mockResolvedValue({ pushEnabled: false, leaguePushEnabled: true, reminderPushEnabled: true, noticePushEnabled: true, timezone: 'Asia/Seoul' });
  jest.mocked(syncPushRegistration).mockResolvedValue(false);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const screen = view(<NotificationSettingsView />);
  await waitFor(() => expect(screen.getByLabelText('푸시 알림')).toBeTruthy());
  fireEvent(screen.getByLabelText('푸시 알림'), 'valueChange', true);
  await waitFor(() => expect(alert).toHaveBeenCalled());
  expect(notificationService.configure).not.toHaveBeenCalled();
  expect(screen.getByLabelText('푸시 알림').props.value).toBe(false);
  alert.mockRestore();
});

it('an inbox fetch failure offers retry rather than an empty inbox', async () => {
  jest.mocked(notificationService.list).mockRejectedValue(new Error('offline'));
  const screen = view(<NotificationInboxView />);
  await waitFor(() => expect(screen.getByText('다시 시도')).toBeTruthy());
  expect(screen.queryByText('아직 받은 알림이 없어요.')).toBeNull();
});


it('leaving detail while league result loads does not navigate on its late response', async () => {
  let finish!: (value: any) => void;
  jest.mocked(notificationService.open).mockResolvedValue({ ...item, type: 'LEAGUE_RESULT', leagueParticipantId: 12 });
  jest.mocked(leagueService.getResult).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const detail = view(<NotificationDetailView />);
  fireEvent.press(await detail.findByText('결과 확인'));
  detail.unmount();
  await act(async () => { finish({ id: 12 }); });
  expect(router.push).not.toHaveBeenCalled();
});
