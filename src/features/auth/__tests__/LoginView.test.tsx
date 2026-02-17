import React from 'react';
import { screen } from '@testing-library/react-native';
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
});
