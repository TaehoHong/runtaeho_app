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
}));

const mockTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;
const mockGetUserData = userService.getUserData as jest.Mock;
const mockSetUserContext = setUserContext as jest.Mock;

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllStores();
    mockTokenStorage.getAccessToken.mockResolvedValue(null);
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
      hairColor: '#123456',
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.completeLogin('access-token', 'refresh-token');
    });

    expect(mockTokenStorage.saveTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(useUserStore.getState().currentUser?.nickname).toBe('Runner');
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
