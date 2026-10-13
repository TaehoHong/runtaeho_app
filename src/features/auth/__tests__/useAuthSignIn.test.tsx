import { useAuthStore } from '~/features/auth/stores/authStore';
import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useAuthSignIn } from '~/features/auth/hooks/useAuthSignIn';
import { AuthError } from '~/features/auth/models/AuthError';
import { AuthProviderType } from '~/features/auth/models/AuthType';
import { AuthenticationService } from '~/features/auth/services/AuthenticationService';

const mockCompleteLogin = jest.fn();
const mockGetStrategy = jest.fn();

jest.mock('~/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    completeLogin: mockCompleteLogin,
  }),
}));

jest.mock('~/features/auth/strategies/AuthStrategyFactory', () => ({
  AuthStrategyFactory: {
    getStrategy: (...args: unknown[]) => mockGetStrategy(...args),
  },
}));

describe('useAuthSignIn', () => {
  const getTokenMock = jest.fn();
  const getAuthorizationCodeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    jest.spyOn(AuthenticationService, 'shared', 'get').mockReturnValue({
      getToken: getTokenMock,
    } as unknown as AuthenticationService);

    mockGetStrategy.mockReturnValue({
      configure: jest.fn(),
      isAvailable: () => true,
      getAuthorizationCode: getAuthorizationCodeMock,
    });

    getAuthorizationCodeMock.mockResolvedValue({
      authorizationCode: 'oauth-code',
      email: 'runner@test.com',
    });
    getTokenMock.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('AUTH-SIGNIN-001 completes Google sign-in and clears loading state', async () => {
    const { result } = renderHook(() => useAuthSignIn());

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockGetStrategy).toHaveBeenCalledWith(AuthProviderType.GOOGLE);
    expect(getTokenMock).toHaveBeenCalledWith(AuthProviderType.GOOGLE, 'oauth-code');
    expect(mockCompleteLogin).toHaveBeenCalledWith('access-token', 'refresh-token', { attempt: expect.any(Number), generation: expect.any(Number) });
    expect(result.current.isLoading).toBe(false);
  });

  it('AUTH-SIGNIN-002 shows no alert when login is cancelled', async () => {
    useAuthStore.setState({ isLoggedIn: true, accessToken: 'existing-a', refreshToken: 'refresh-a' });
    const generation = useAuthStore.getState().sessionGeneration;
    getAuthorizationCodeMock.mockRejectedValue(AuthError.cancelled());
    const { result } = renderHook(() => useAuthSignIn());

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockCompleteLogin).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(useAuthStore.getState().accessToken).toBe('existing-a');
    expect(useAuthStore.getState().sessionGeneration).toBe(generation);
    expect(result.current.isLoading).toBe(false);
  });

  it('AUTH-SIGNIN-003 shows alert when auth provider is unavailable', async () => {
    mockGetStrategy.mockReturnValue({
      configure: jest.fn(),
      isAvailable: () => false,
      getAuthorizationCode: getAuthorizationCodeMock,
    });

    const { result } = renderHook(() => useAuthSignIn());

    await act(async () => {
      await result.current.signInWithApple();
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(mockCompleteLogin).not.toHaveBeenCalled();
  });

  it('ignores an older OAuth completion when a newer attempt has started', async () => {
    let releaseOld!: (value: { authorizationCode: string }) => void;
    getAuthorizationCodeMock.mockReturnValueOnce(new Promise(resolve => { releaseOld = resolve; }));
    const first = renderHook(() => useAuthSignIn());
    const second = renderHook(() => useAuthSignIn());
    let oldLogin!: Promise<void>;
    await act(async () => {
      oldLogin = first.result.current.signInWithGoogle();
      await Promise.resolve();
    });
    await act(async () => { await second.result.current.signInWithGoogle(); });
    await act(async () => { releaseOld({ authorizationCode: 'old-code' }); await oldLogin; });
    expect(getTokenMock).toHaveBeenCalledTimes(1);
    expect(getTokenMock).toHaveBeenCalledWith(AuthProviderType.GOOGLE, 'oauth-code');
    expect(mockCompleteLogin).toHaveBeenCalledTimes(1);
  });

});
