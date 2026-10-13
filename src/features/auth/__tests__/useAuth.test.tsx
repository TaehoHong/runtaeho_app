import { act, renderHook } from '@testing-library/react-native';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { AuthProviderType } from '~/features/auth/models/AuthType';
import { userService } from '~/features/user/services/userService';
import { useUserStore } from '~/stores/user/userStore';
import { resetAllStores } from '~/test-utils/resetState';
import { tokenStorage } from '~/utils/storage';
import { setUserContext } from '~/config/sentry';

jest.mock('~/utils/storage', () => ({
  tokenStorage: {
    saveTokens: jest.fn(),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    loadTokens: jest.fn(),
  },
}));

jest.mock('~/features/user/services/userService', () => ({
  userService: {
    getUserData: jest.fn(),
  },
}));

jest.mock('~/config/sentry', () => ({
  setUserContext: jest.fn(),
}));

jest.mock('~/shared/services/AppResetService', () => ({
  resetAllAppData: jest.fn(),
  waitForLogout: jest.fn().mockResolvedValue(undefined),
}));

const mockTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;
const mockGetUserData = userService.getUserData as jest.Mock;
const mockSetUserContext = setUserContext as jest.Mock;

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllStores();
    useAuthStore.setState({ tokensRevoked: false });
    mockTokenStorage.getAccessToken.mockResolvedValue(null);
    mockTokenStorage.saveTokens.mockImplementation(async (_access, _refresh, options) => { options?.onCommit?.(); });
  });

  it('AUTH-HOOK-001 returns false when there is no access token', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const isValid = await result.current.verifyAndRefreshToken();
      expect(isValid).toBe(false);
    });

    expect(mockTokenStorage.getAccessToken).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(mockGetUserData).not.toHaveBeenCalled();
    expect(mockSetUserContext).not.toHaveBeenCalled();
  });

  it('AUTH-HOOK-002 completes login by fetching user data and storing auth/user state', async () => {
    mockGetUserData.mockResolvedValue({
      id: 10,
      name: 'Runner',
      authorityType: 'ROLE_USER',
      totalPoint: 1200,
      avatarId: 2,
      haveRunningRecord: true,
      userAccounts: [
        {
          id: 100,
          email: 'runner@test.com',
          accountType: AuthProviderType.GOOGLE,
        },
      ],
      equippedItems: [],
      hairColor: '#000000',
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.completeLogin('access-token', 'refresh-token');
    });

    expect(mockTokenStorage.saveTokens).toHaveBeenCalledWith('access-token', 'refresh-token', { isCurrent: expect.any(Function), onCommit: expect.any(Function) });
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(useUserStore.getState().currentUser?.nickname).toBe('Runner');
    expect(useUserStore.getState().hairColor).toBe('#000000');
    expect(mockSetUserContext).toHaveBeenCalledWith('10', 'runner@test.com', 'Runner');
  });

  it('AUTH-HOOK-003 does not trigger login side-effects when token verification fails', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.verifyAndRefreshToken();
    });

    expect(mockTokenStorage.saveTokens).not.toHaveBeenCalled();
    expect(mockGetUserData).not.toHaveBeenCalled();
    expect(mockSetUserContext).not.toHaveBeenCalled();
    expect(useUserStore.getState().currentUser).toBeNull();
  });
});


it('does not replace user state when login storage fails', async () => {
  resetAllStores();
  mockGetUserData.mockResolvedValue({ id: 22, name: 'New Runner', totalPoint: 20,
    avatarId: 1, haveRunningRecord: false, equippedItems: [], userAccounts: [], hairColor: '#000000' });
  mockTokenStorage.saveTokens.mockRejectedValueOnce(new Error('Secure storage save failed'));
  const { result } = renderHook(() => useAuth());
  await act(async () => {
    await expect(result.current.completeLogin('new-token', 'new-refresh')).rejects.toThrow('Secure storage save failed');
  });
  expect(useUserStore.getState().currentUser).toBeNull();
  expect(useAuthStore.getState().isLoggedIn).toBe(false);
});

it('ignores a delayed profile response after the session changes', async () => {
  resetAllStores();
  let resolve!: (value: unknown) => void;
  mockGetUserData.mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  const { result } = renderHook(() => useAuth());
  let pending!: Promise<void>;
  act(() => { pending = result.current.refreshUserData(); });
  act(() => {
    useAuthStore.getState().logout();
    useUserStore.getState().setTotalPoint(900);
  });
  await act(async () => {
    resolve({ id: 1, name: 'Old Runner', totalPoint: 1, avatarId: 0,
      haveRunningRecord: false, equippedItems: [], userAccounts: [], hairColor: '#000000' });
    await pending;
  });
  expect(useUserStore.getState().totalPoint).toBe(900);
  expect(useUserStore.getState().currentUser).toBeNull();
});
