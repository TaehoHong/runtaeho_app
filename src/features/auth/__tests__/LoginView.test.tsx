import React from 'react';
import { screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { AuthProviderType } from '~/features/auth/models/AuthType';
import { Login } from '~/features/auth/views/login';
import { renderWithProviders } from '~/test-utils/renderWithProviders';
import { resetAllStores } from '~/test-utils/resetState';

const mockUseAuthSignIn = jest.fn();
const mockUseAutoUpdate = jest.fn();

jest.mock('~/features/auth/hooks/useAuthSignIn', () => ({
  useAuthSignIn: () => mockUseAuthSignIn(),
}));

jest.mock('~/features/updates', () => ({
  useAutoUpdate: (options: unknown) => mockUseAutoUpdate(options),
  UpdateOverlay: () => null,
}));

describe('Login view', () => {
  beforeEach(() => {
    resetAllStores();

    mockUseAuthSignIn.mockReturnValue({
      isLoading: false,
      signInWithGoogle: jest.fn(),
      signInWithApple: jest.fn(),
    });

    mockUseAutoUpdate.mockReturnValue({
      status: 'done',
      progress: 100,
      error: null,
      retryCount: 0,
      maxRetries: 3,
      retry: jest.fn(),
      skip: jest.fn(),
    });
  });

  it('renders Google login button when update state is done', () => {
    renderWithProviders(<Login />);

    expect(screen.getByTestId('login-screen')).toBeTruthy();
    expect(screen.getByTestId('login-google-button')).toBeTruthy();
    expect(mockUseAutoUpdate).toHaveBeenCalledWith({ autoStart: true });
  });

  it.each([AuthProviderType.APPLE, AuthProviderType.GOOGLE])(
    'shows pending state only on the selected %s button', pendingProvider => {
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
      try {
        mockUseAuthSignIn.mockReturnValue({
          isLoading: true,
          pendingProvider,
          signInWithGoogle: jest.fn(),
          signInWithApple: jest.fn(),
        });
        renderWithProviders(<Login />);
        const selected = pendingProvider === AuthProviderType.APPLE ? 'apple' : 'google';
        const otherLabel = pendingProvider === AuthProviderType.APPLE
          ? 'Google로 시작하기' : 'Apple로 시작하기';
        expect(screen.getByTestId(`login-${selected}-button`)).toHaveTextContent('로그인 중...');
        expect(screen.getByText(otherLabel)).toBeTruthy();
        expect(screen.getByTestId('login-google-button')).toBeDisabled();
        expect(screen.getByTestId('login-apple-button')).toBeDisabled();
      } finally {
        Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
      }
    }
  );
});
