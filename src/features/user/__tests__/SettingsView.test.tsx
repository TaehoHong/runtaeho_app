import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SettingsView } from '~/features/user/views/SettingsView';
import { renderWithProviders } from '~/test-utils/renderWithProviders';
import { routerMock } from '~/test-utils/mocks/native';

const mockLogout = jest.fn();
const mockWithdraw = jest.fn();

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

  it('navigates to customer service and app version menus', () => {
    renderWithProviders(<SettingsView />);

    fireEvent.press(screen.getByText('고객센터'));
    fireEvent.press(screen.getByText('앱 버전'));

    expect(routerMock.push).toHaveBeenCalledWith('/user/customer-service');
    expect(routerMock.push).toHaveBeenCalledWith('/user/app-version');
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

  it('USER-SET-003 performs withdraw flow and redirects to login on success', async () => {
    renderWithProviders(<SettingsView />);

    fireEvent.press(screen.getByText('회원 탈퇴'));
    fireEvent.press(screen.getByText('탈퇴하기'));

    await waitFor(() => {
      expect(mockWithdraw).toHaveBeenCalledTimes(1);
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login');
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
