import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SettingsView } from '~/features/user/views/SettingsView';
import { renderWithProviders } from '~/test-utils/renderWithProviders';
import { routerMock } from '~/test-utils/mocks/native';

const mockLogout = jest.fn();
const mockWithdraw = jest.fn();
const mockSnapshot = { generation: 1, userId: 7 };
jest.mock('expo-router', () => ({
  useRouter: () => require('~/test-utils/mocks/native').routerMock,
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('~/features/auth/stores/authStore', () => ({
  getSessionSnapshot: () => ({ ...mockSnapshot }),
  isSessionCurrent: (snapshot: typeof mockSnapshot) => snapshot.generation === mockSnapshot.generation && snapshot.userId === mockSnapshot.userId,
}));

jest.mock('~/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    logout: () => mockLogout(),
  }),
}));

jest.mock('~/features/user/services/userService', () => ({
  userService: {
    withdraw: (...args: unknown[]) => mockWithdraw(...args),
  },
}));

describe('SettingsView', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSnapshot.generation = 1;
    mockSnapshot.userId = 7;
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockLogout.mockResolvedValue(undefined);
    mockWithdraw.mockResolvedValue(undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('USER-SET-001 opens logout modal and performs logout flow', async () => {
    renderWithProviders(<SettingsView />);

    fireEvent.press(screen.getByTestId('settings-logout-menu'));
    fireEvent.press(screen.getByTestId('settings-logout-confirm'));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('navigates to customer service and permission settings menus', () => {
    renderWithProviders(<SettingsView />);

    fireEvent.press(screen.getByText('고객센터'));
    fireEvent.press(screen.getByText('권한 설정'));

    expect(routerMock.push).toHaveBeenCalledWith('/user/customer-service');
    expect(routerMock.push).toHaveBeenCalledWith('/user/permission-settings');
  });

  it('closes logout modal when cancel is pressed', async () => {
    renderWithProviders(<SettingsView />);

    fireEvent.press(screen.getByTestId('settings-logout-menu'));
    fireEvent.press(screen.getByText('취소'));

    await waitFor(() => {
      expect(screen.queryByTestId('settings-logout-confirm')).toBeNull();
    });
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('USER-SET-002 shows alert when logout fails', async () => {
    mockLogout.mockRejectedValue(new Error('logout-failed'));
    renderWithProviders(<SettingsView />);

    fireEvent.press(screen.getByTestId('settings-logout-menu'));
    fireEvent.press(screen.getByTestId('settings-logout-confirm'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        '로그아웃 실패',
        expect.any(String),
        [{ text: '확인', style: 'default' }]
      );
    });
    expect(routerMock.replace).not.toHaveBeenCalledWith('/auth/login');
  });

  it('USER-SET-003 performs withdraw flow and delegates logout routing to AuthProvider', async () => {
    renderWithProviders(<SettingsView />);

    fireEvent.press(screen.getByText('회원 탈퇴'));
    fireEvent.press(screen.getByText('탈퇴하기'));

    await waitFor(() => {
      expect(mockWithdraw).toHaveBeenCalledTimes(1);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  it('shows alert when withdraw fails', async () => {
    mockWithdraw.mockRejectedValue(new Error('withdraw-failed'));
    renderWithProviders(<SettingsView />);

    fireEvent.press(screen.getByText('회원 탈퇴'));
    fireEvent.press(screen.getByText('탈퇴하기'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        '회원 탈퇴 실패',
        expect.any(String),
        [{ text: '확인', style: 'default' }]
      );
    });
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('closes withdraw modal on cancel without API calls', async () => {
    renderWithProviders(<SettingsView />);

    fireEvent.press(screen.getByText('회원 탈퇴'));
    fireEvent.press(screen.getByText('취소'));

    await waitFor(() => {
      expect(screen.queryByText('탈퇴하기')).toBeNull();
    });
    expect(mockWithdraw).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });
});


it('a late withdrawal response cannot log out a replacement session', async () => {
  let finish!: () => void;
  mockWithdraw.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
  renderWithProviders(<SettingsView />);
  fireEvent.press(screen.getByText('회원 탈퇴'));
  fireEvent.press(screen.getByText('탈퇴하기'));
  fireEvent.press(screen.getByText('취소'));
  // A logs out and B signs in while the DELETE response is pending.
  mockSnapshot.generation = 3;
  mockSnapshot.userId = 8;
  await act(async () => { finish(); });
  expect(mockLogout).not.toHaveBeenCalled();
  expect(routerMock.replace).not.toHaveBeenCalled();
});
