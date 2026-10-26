import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as providers from '~/features/activity-connection/providers';
import { ActivityConnectionView } from '~/features/activity-connection/views/ActivityConnectionView';
import { garminService, type GarminConnection } from '../services/garminService';

const mockCurrent = jest.fn(() => true);
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('~/shared/components', () => ({ TopScreenSafeAreaView: require('react-native').View }));
jest.mock('~/features/auth/stores/authStore', () => ({
  useAuthStore: (select: (state: { sessionGeneration: number }) => unknown) => select({ sessionGeneration: 2 }),
  getSessionSnapshot: () => ({ generation: 2, userId: 7 }),
  isSessionCurrent: () => mockCurrent(),
}));
jest.mock('~/stores/user/userStore', () => ({
  useUserStore: (select: (state: { currentUser: { id: number } }) => unknown) => select({ currentUser: { id: 7 } }),
}));
jest.mock('../services/garminService', () => ({ garminService: { connection: jest.fn(), connect: jest.fn(), disconnect: jest.fn() } }));
const disconnected: GarminConnection = {
  available: true, status: 'DISCONNECTED', connectedAt: null, lastReceivedAt: null,
  lastImportedAt: null, lastImportedCount: 0, permissionGranted: false,
};
const connected: GarminConnection = { ...disconnected, status: 'CONNECTED', permissionGranted: true };

const clients: QueryClient[] = [];

function screen(value: GarminConnection = disconnected) {
  jest.mocked(garminService.connection).mockResolvedValue(value);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><ActivityConnectionView /></QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(garminService.connection).mockReset();
  jest.mocked(garminService.connect).mockReset();
  jest.mocked(garminService.disconnect).mockReset();
  mockCurrent.mockReturnValue(true);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  clients.splice(0).forEach(client => client.clear());
  jest.restoreAllMocks();
});

it('starts the official browser flow directly from the app row and stays on the list after cancellation', async () => {
  jest.mocked(garminService.connect).mockResolvedValue('cancelled');
  const view = screen();
  await waitFor(() => expect(view.getByRole('button', { name: 'Garmin Connect' })).toBeEnabled());
  fireEvent.press(view.getByRole('button', { name: 'Garmin Connect' }));
  await waitFor(() => expect(garminService.connect).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(view.getByRole('button', { name: 'Garmin Connect' })).toBeEnabled());
  expect(view.queryByText('Garmin Connect 연결')).toBeNull();
  expect(view.queryByText('연결됨')).toBeNull();
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('refreshes the same list after authorization and prevents duplicate taps while connecting', async () => {
  let finish: (value: 'connected') => void = () => {};
  jest.mocked(garminService.connect).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = screen();
  await waitFor(() => expect(view.getByRole('button', { name: 'Garmin Connect' })).toBeEnabled());
  const row = view.getByRole('button', { name: 'Garmin Connect' });
  fireEvent.press(row);
  expect(view.getByRole('button', { name: 'Garmin Connect' })).toBeDisabled();
  fireEvent.press(view.getByRole('button', { name: 'Garmin Connect' }));
  expect(garminService.connect).toHaveBeenCalledTimes(1);
  jest.mocked(garminService.connection).mockResolvedValue(connected);
  await act(async () => finish('connected'));
  expect(await view.findByText('연결됨')).toBeTruthy();
});

it('shows connection status in the app row and asks before disconnecting', async () => {
  const view = screen(connected);
  expect(await view.findByText('연결됨')).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'Garmin Connect' }));
  expect(Alert.alert).toHaveBeenCalledWith('Garmin 연결을 해제할까요?', expect.any(String), [
    { text: '취소', style: 'cancel' },
    { text: '연결 해제', style: 'destructive', onPress: expect.any(Function) },
  ]);
  expect(garminService.disconnect).not.toHaveBeenCalled();
  expect(garminService.connect).not.toHaveBeenCalled();
});

it('stops imports after confirmation and disables the row while revocation is pending', async () => {
  jest.mocked(garminService.disconnect).mockResolvedValue({ ...disconnected, status: 'DISCONNECTING' });
  const view = screen(connected);
  await view.findByText('연결됨');
  fireEvent.press(view.getByRole('button', { name: 'Garmin Connect' }));
  await act(async () => jest.mocked(Alert.alert).mock.calls.at(-1)?.[2]?.find(button => button.text === '연결 해제')?.onPress?.());
  expect(await view.findByText('연결 해제 중')).toBeTruthy();
  expect(view.getByRole('button', { name: 'Garmin Connect' })).toBeDisabled();
});

it('allows a new connection after the server finishes local disconnection', async () => {
  jest.mocked(garminService.disconnect).mockResolvedValue(disconnected);
  jest.mocked(garminService.connect).mockResolvedValue('cancelled');
  const view = screen(connected);
  await view.findByText('연결됨');
  fireEvent.press(view.getByRole('button', { name: 'Garmin Connect' }));
  await act(async () => jest.mocked(Alert.alert).mock.calls.at(-1)?.[2]?.find(button => button.text === '연결 해제')?.onPress?.());
  await waitFor(() => {
    const row = view.getByRole('button', { name: 'Garmin Connect' });
    expect(row).toBeEnabled();
    expect(row.props.accessibilityValue.text).toBe('연결 안 됨');
  });
  expect(garminService.connect).not.toHaveBeenCalled();
  fireEvent.press(view.getByRole('button', { name: 'Garmin Connect' }));
  await waitFor(() => expect(garminService.connect).toHaveBeenCalledTimes(1));
});

it('reopens official authorization from a row requiring reconnection', async () => {
  jest.mocked(garminService.connect).mockResolvedValue('cancelled');
  const view = screen({ ...disconnected, status: 'RECONNECT_REQUIRED' });
  expect(await view.findByText('재연결이 필요해요')).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'Garmin Connect' }));
  await waitFor(() => expect(garminService.connect).toHaveBeenCalledTimes(1));
  expect(view.getByRole('button', { name: '연결 해제' })).toBeTruthy();
});

it('allows disconnecting a connection that needs authorization again', async () => {
  const view = screen({ ...disconnected, status: 'RECONNECT_REQUIRED' });
  fireEvent.press(await view.findByRole('button', { name: '연결 해제' }));
  expect(Alert.alert).toHaveBeenCalledWith('Garmin 연결을 해제할까요?', expect.any(String), expect.any(Array));
  expect(garminService.connect).not.toHaveBeenCalled();
});

it('keeps an unavailable provider visible and explains its disabled state', async () => {
  const view = screen({ ...disconnected, available: false });
  expect(await view.findByText('준비 중')).toBeTruthy();
  const row = view.getByRole('button', { name: 'Garmin Connect' });
  expect(row).toBeDisabled();
  fireEvent.press(row);
  expect(garminService.connect).not.toHaveBeenCalled();
});

it('disables the app row until its connection status is known', () => {
  jest.mocked(garminService.connection).mockImplementationOnce(() => new Promise(() => {}));
  const view = screen();
  const row = view.getByRole('button', { name: 'Garmin Connect' });
  expect(row).toBeDisabled();
  expect(row.props.accessibilityState.busy).toBe(true);
  fireEvent.press(row);
  expect(garminService.connect).not.toHaveBeenCalled();
});

it('offers retry after a status fetch fails and restores the row when retry succeeds', async () => {
  jest.mocked(garminService.connection).mockRejectedValueOnce(new Error('network unavailable'));
  const view = screen();
  expect(await view.findByText('연결 상태를 불러오지 못했어요.')).toBeTruthy();
  expect(view.getByRole('button', { name: 'Garmin Connect' })).toBeDisabled();
  fireEvent.press(view.getByRole('button', { name: '다시 시도' }));
  await waitFor(() => expect(view.getByRole('button', { name: 'Garmin Connect' })).toBeEnabled());
  expect(view.queryByText('연결 상태를 불러오지 못했어요.')).toBeNull();
});

it('does not show stale account errors after the session changes', async () => {
  let fail: (error: Error) => void = () => {};
  jest.mocked(garminService.connect).mockImplementation(() => new Promise((_, reject) => { fail = reject; }));
  const view = screen();
  await waitFor(() => expect(view.getByRole('button', { name: 'Garmin Connect' })).toBeEnabled());
  fireEvent.press(view.getByRole('button', { name: 'Garmin Connect' }));
  mockCurrent.mockReturnValue(false);
  await act(async () => fail(new Error('private provider response')));
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('ignores an old native confirmation dialog after the account changes', async () => {
  const view = screen(connected);
  await view.findByText('연결됨');
  fireEvent.press(view.getByRole('button', { name: 'Garmin Connect' }));
  mockCurrent.mockReturnValue(false);
  await act(async () => jest.mocked(Alert.alert).mock.calls.at(-1)?.[2]?.find(button => button.text === '연결 해제')?.onPress?.());
  expect(garminService.disconnect).not.toHaveBeenCalled();
});

it('keeps each provider status and authorization scoped to its own row', async () => {
  const garminProvider = providers.activityConnectionProviders[0];
  if (!garminProvider) throw new Error('Garmin provider fixture is required');
  const otherConnect = jest.fn().mockResolvedValue('cancelled');
  jest.replaceProperty(providers, 'activityConnectionProviders', [
    ...providers.activityConnectionProviders,
    {
      ...garminProvider,
      id: 'test-provider',
      name: 'Test Provider',
      connection: jest.fn().mockResolvedValue(disconnected),
      connect: otherConnect,
    },
  ]);
  const view = screen(connected);
  await view.findByText('연결됨');
  await waitFor(() => expect(view.getByRole('button', { name: 'Test Provider' })).toBeEnabled());
  expect(view.getByRole('button', { name: 'Test Provider' }).props.accessibilityValue.text).toBe('연결 안 됨');
  fireEvent.press(view.getByRole('button', { name: 'Test Provider' }));
  await waitFor(() => expect(otherConnect).toHaveBeenCalledTimes(1));
  expect(garminService.connect).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(view.getByRole('button', { name: 'Garmin Connect' }).props.accessibilityValue.text).toBe('연결됨');
});

it('does not display a provider response completed after the session changes', async () => {
  let finish: (value: GarminConnection) => void = () => {};
  jest.mocked(garminService.connection).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = screen();
  mockCurrent.mockReturnValue(false);
  await act(async () => finish(connected));
  await view.findByText('연결 상태를 불러오지 못했어요.');
  expect(view.getByRole('button', { name: 'Garmin Connect' })).toBeDisabled();
  expect(view.queryByText('연결됨')).toBeNull();
});
