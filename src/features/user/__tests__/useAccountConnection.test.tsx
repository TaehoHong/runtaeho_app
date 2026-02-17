import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AuthError } from '~/features/auth/models/AuthError';
import { AuthProviderType } from '~/features/auth/models';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { useAccountConnection } from '~/features/user/hooks/useAccountConnection';
import { createUser } from '~/features/user/models/User';
import { createUserAccount } from '~/features/user/models/UserAccount';

const mockUseAuth = jest.fn();
const mockGoogleConfigure = jest.fn();
const mockGoogleGetAuthorizationCode = jest.fn();
const mockConnectAccountApi = jest.fn();
const mockDisconnectAccountApi = jest.fn();

jest.mock('~/features/auth/strategies/GoogleAuthStrategy', () => ({
  GoogleAuthStrategy: jest.fn().mockImplementation(() => ({
    configure: (...args: unknown[]) => mockGoogleConfigure(...args),
    getAuthorizationCode: (...args: unknown[]) => mockGoogleGetAuthorizationCode(...args),
  })),
}));

jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    Operation: { LOGIN: 'LOGIN' },
    Scope: { EMAIL: 'EMAIL', FULL_NAME: 'FULL_NAME' },
    Error: { CANCELED: 'ERR_CANCELED' },
    performRequest: jest.fn(),
  },
}));

jest.mock('~/features/user/services/userService', () => ({
  userService: {
    connectAccount: (...args: unknown[]) => mockConnectAccountApi(...args),
    disconnectAccount: (...args: unknown[]) => mockDisconnectAccountApi(...args),
  },
}));

jest.mock('~/features/auth/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('useAccountConnection', () => {
  const mockRefreshUserData = jest.fn();
  let alertSpy: jest.SpyInstance;

  const buildUser = (accounts: ReturnType<typeof createUserAccount>[]) =>
    createUser({
      id: 1,
      nickname: 'Runner',
      userAccounts: accounts,
    });

  const createConnectedAccount = (params: {
    id: number;
    provider: AuthProviderType;
    email: string;
  }) =>
    createUserAccount({
      id: params.id,
      provider: params.provider,
      isConnected: true,
      email: params.email,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    mockUseAuth.mockReturnValue({
      user: buildUser([
        createConnectedAccount({
          id: 11,
          provider: AuthProviderType.APPLE,
          email: 'runner@apple.com',
        }),
      ]),
      refreshUserData: mockRefreshUserData,
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('prevents disconnect when only one connected account exists', () => {
    mockUseAuth.mockReturnValue({
      user: buildUser([
        createConnectedAccount({
          id: 11,
          provider: AuthProviderType.GOOGLE,
          email: 'runner@test.com',
        }),
      ]),
      refreshUserData: mockRefreshUserData,
    });

    const { result } = renderHook(() => useAccountConnection());

    expect(result.current.canDisconnect(11)).toBe(false);
  });

  it('allows disconnect when at least two accounts are connected', () => {
    mockUseAuth.mockReturnValue({
      user: buildUser([
        createConnectedAccount({
          id: 11,
          provider: AuthProviderType.GOOGLE,
          email: 'runner@test.com',
        }),
        createConnectedAccount({
          id: 12,
          provider: AuthProviderType.APPLE,
          email: 'runner@apple.com',
        }),
      ]),
      refreshUserData: mockRefreshUserData,
    });

    const { result } = renderHook(() => useAccountConnection());

    expect(result.current.canDisconnect(11)).toBe(true);
  });

  it('USER-CONN-001 connects Google account successfully and refreshes user data', async () => {
    mockGoogleGetAuthorizationCode.mockResolvedValue({
      authorizationCode: 'google-auth-code',
    });
    mockConnectAccountApi.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAccountConnection());

    await act(async () => {
      await result.current.connectAccount(AuthProviderType.GOOGLE);
    });

    expect(mockGoogleConfigure).toHaveBeenCalledTimes(1);
    expect(mockGoogleGetAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(mockConnectAccountApi).toHaveBeenCalledWith(1, 'GOOGLE', 'google-auth-code');
    expect(mockRefreshUserData).toHaveBeenCalledTimes(1);
  });

  it('USER-CONN-002 shows alert and skips API when Google provider is already connected', async () => {
    mockUseAuth.mockReturnValue({
      user: buildUser([
        createConnectedAccount({
          id: 11,
          provider: AuthProviderType.GOOGLE,
          email: 'runner@test.com',
        }),
        createConnectedAccount({
          id: 12,
          provider: AuthProviderType.APPLE,
          email: 'runner@apple.com',
        }),
      ]),
      refreshUserData: mockRefreshUserData,
    });

    const { result } = renderHook(() => useAccountConnection());

    await act(async () => {
      await result.current.connectAccount(AuthProviderType.GOOGLE);
    });

    expect(alertSpy).toHaveBeenCalledWith('알림', '이미 Google 계정이 연결되어 있습니다.');
    expect(mockGoogleConfigure).not.toHaveBeenCalled();
    expect(mockGoogleGetAuthorizationCode).not.toHaveBeenCalled();
    expect(mockConnectAccountApi).not.toHaveBeenCalled();
  });

  it('USER-CONN-002 silently exits when Google auth is cancelled', async () => {
    mockGoogleGetAuthorizationCode.mockRejectedValue(AuthError.cancelled());

    const { result } = renderHook(() => useAccountConnection());

    await act(async () => {
      await result.current.connectAccount(AuthProviderType.GOOGLE);
    });

    expect(mockConnectAccountApi).not.toHaveBeenCalled();
    expect(mockRefreshUserData).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('USER-CONN-003 blocks disconnect when only one account is connected', async () => {
    mockUseAuth.mockReturnValue({
      user: buildUser([
        createConnectedAccount({
          id: 11,
          provider: AuthProviderType.GOOGLE,
          email: 'runner@test.com',
        }),
      ]),
      refreshUserData: mockRefreshUserData,
    });

    const account = createConnectedAccount({
      id: 11,
      provider: AuthProviderType.GOOGLE,
      email: 'runner@test.com',
    });

    const { result } = renderHook(() => useAccountConnection());

    await act(async () => {
      await result.current.disconnectAccount(account);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      '연결 해제 불가',
      expect.stringContaining('최소 1개의 계정 연결을 유지해야 합니다.'),
      [{ text: '확인' }]
    );
    expect(mockDisconnectAccountApi).not.toHaveBeenCalled();
  });

  it('USER-CONN-003 disconnects account after confirmation when multiple accounts are connected', async () => {
    mockUseAuth.mockReturnValue({
      user: buildUser([
        createConnectedAccount({
          id: 11,
          provider: AuthProviderType.GOOGLE,
          email: 'runner@test.com',
        }),
        createConnectedAccount({
          id: 12,
          provider: AuthProviderType.APPLE,
          email: 'runner@apple.com',
        }),
      ]),
      refreshUserData: mockRefreshUserData,
    });
    mockDisconnectAccountApi.mockResolvedValue(undefined);

    const account = createConnectedAccount({
      id: 11,
      provider: AuthProviderType.GOOGLE,
      email: 'runner@test.com',
    });

    const { result } = renderHook(() => useAccountConnection());

    await act(async () => {
      await result.current.disconnectAccount(account);
    });

    const actions = alertSpy.mock.calls[0][2] as
      | { text: string; onPress?: () => Promise<void> | void }[]
      | undefined;
    const disconnectAction = actions?.find((action) => action.text === '해제');

    expect(disconnectAction).toBeDefined();

    await act(async () => {
      await disconnectAction?.onPress?.();
    });

    expect(mockDisconnectAccountApi).toHaveBeenCalledWith(11);
    expect(mockRefreshUserData).toHaveBeenCalled();
  });

  it('shows error alert when user context is missing during connect and disconnect', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      refreshUserData: mockRefreshUserData,
    });

    const { result } = renderHook(() => useAccountConnection());

    await act(async () => {
      await result.current.connectAccount(AuthProviderType.GOOGLE);
      await result.current.disconnectAccount(
        createConnectedAccount({
          id: 11,
          provider: AuthProviderType.GOOGLE,
          email: 'runner@test.com',
        })
      );
    });

    expect(alertSpy).toHaveBeenCalledWith('오류', '사용자 정보를 찾을 수 없습니다.');
    expect(mockConnectAccountApi).not.toHaveBeenCalled();
    expect(mockDisconnectAccountApi).not.toHaveBeenCalled();
  });

  it('handles google API conflict errors with dedicated alerts', async () => {
    mockGoogleGetAuthorizationCode.mockResolvedValue({
      authorizationCode: 'google-auth-code',
    });
    mockConnectAccountApi.mockRejectedValueOnce({ code: 'ACCOUNT_ALREADY_CONNECTED' });

    const { result } = renderHook(() => useAccountConnection());

    await act(async () => {
      await result.current.connectAccount(AuthProviderType.GOOGLE);
    });

    expect(alertSpy).toHaveBeenCalledWith('알림', '이미 연결된 계정입니다.');
    mockConnectAccountApi.mockRejectedValueOnce({ code: 'ACCOUNT_ALREADY_IN_USE' });

    await act(async () => {
      await result.current.connectAccount(AuthProviderType.GOOGLE);
    });

    expect(alertSpy).toHaveBeenCalledWith('오류', '다른 사용자가 이미 사용 중인 계정입니다.');
  });

  it('connects Apple account successfully', async () => {
    mockUseAuth.mockReturnValue({
      user: buildUser([
        createConnectedAccount({
          id: 11,
          provider: AuthProviderType.GOOGLE,
          email: 'runner@test.com',
        }),
      ]),
      refreshUserData: mockRefreshUserData,
    });
    (appleAuth.performRequest as jest.Mock).mockResolvedValue({
      authorizationCode: 'apple-auth-code',
    });
    mockConnectAccountApi.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAccountConnection());

    await act(async () => {
      await result.current.connectAccount(AuthProviderType.APPLE);
    });

    expect(mockConnectAccountApi).toHaveBeenCalledWith(1, 'APPLE', 'apple-auth-code');
    expect(mockRefreshUserData).toHaveBeenCalled();
  });

  it('skips Apple connect flow when provider already connected', async () => {
    const { result } = renderHook(() => useAccountConnection());

    await act(async () => {
      await result.current.connectAccount(AuthProviderType.APPLE);
    });

    expect(alertSpy).toHaveBeenCalledWith('알림', '이미 Apple 계정이 연결되어 있습니다.');
    expect(appleAuth.performRequest).not.toHaveBeenCalled();
  });

  it('USER-CONN-002 silently exits when Apple connect is cancelled', async () => {
    mockUseAuth.mockReturnValue({
      user: buildUser([
        createConnectedAccount({
          id: 11,
          provider: AuthProviderType.GOOGLE,
          email: 'runner@test.com',
        }),
      ]),
      refreshUserData: mockRefreshUserData,
    });
    (appleAuth.performRequest as jest.Mock).mockRejectedValue({ code: 'ERR_CANCELED' });

    const { result } = renderHook(() => useAccountConnection());

    await act(async () => {
      await result.current.connectAccount(AuthProviderType.APPLE);
    });

    expect(mockConnectAccountApi).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('shows unsupported provider alert for unknown provider values', async () => {
    const { result } = renderHook(() => useAccountConnection());

    await act(async () => {
      await result.current.connectAccount('UNKNOWN' as AuthProviderType);
    });

    expect(alertSpy).toHaveBeenCalledWith('오류', '지원하지 않는 계정 유형입니다.');
  });

  it('shows account-not-found alert when disconnect API returns account missing code', async () => {
    mockUseAuth.mockReturnValue({
      user: buildUser([
        createConnectedAccount({
          id: 11,
          provider: AuthProviderType.GOOGLE,
          email: 'runner@test.com',
        }),
        createConnectedAccount({
          id: 12,
          provider: AuthProviderType.APPLE,
          email: 'runner@apple.com',
        }),
      ]),
      refreshUserData: mockRefreshUserData,
    });
    mockDisconnectAccountApi.mockRejectedValue({
      response: { data: { code: 'ACCOUNT_NOT_FOUND' } },
    });

    const account = createConnectedAccount({
      id: 11,
      provider: AuthProviderType.GOOGLE,
      email: 'runner@test.com',
    });
    const { result } = renderHook(() => useAccountConnection());

    await act(async () => {
      await result.current.disconnectAccount(account);
    });

    const actions = alertSpy.mock.calls[0]?.[2] as
      | { text: string; onPress?: () => Promise<void> | void }[]
      | undefined;
    const disconnectAction = actions?.find((action) => action.text === '해제');

    await act(async () => {
      await disconnectAction?.onPress?.();
    });

    expect(alertSpy).toHaveBeenCalledWith('오류', '연결된 계정을 찾을 수 없습니다.');
  });
});
