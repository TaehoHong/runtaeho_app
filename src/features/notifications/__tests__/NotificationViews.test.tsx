import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import { NotificationDetailView, NotificationInboxView, NotificationSettingsView } from '../views/NotificationViews';
import { notificationService } from '../services/notificationService';
import { leagueService } from '~/features/league/services/leagueService';
import { syncPushRegistration } from '../services/pushRegistration';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: '42' }), useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]) }));
jest.mock('~/shared/components', () => ({ TopScreenSafeAreaView: require('react-native').View }));
jest.mock('~/shared/components/typography', () => ({ Text: require('react-native').Text }));
jest.mock('~/stores/user/userStore', () => ({ useUserStore: (select: (state: unknown) => unknown) => select({ currentUser: { id: 7 } }) }));
jest.mock('~/features/auth/stores/authStore', () => ({ getSessionSnapshot: () => ({ generation: 1, userId: 7 }), isSessionCurrent: () => true }));
jest.mock('~/features/league/services/leagueService', () => ({ leagueService: { getResult: jest.fn() } }));
jest.mock('../services/notificationService', () => ({ notificationService: { list: jest.fn(), open: jest.fn(), configuration: jest.fn(), configure: jest.fn() } }));
jest.mock('../services/pushRegistration', () => ({ syncPushRegistration: jest.fn(), currentTimezone: () => 'Asia/Seoul' }));

const item = { id: 42, title: '공지 제목', body: '공지 본문', type: 'NOTICE' as const, leagueParticipantId: null, readDatetime: null, createdDatetime: '2026-10-13T00:00:00Z' };
function view(element: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
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
