import React from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { View } from 'react-native';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { useAuthSignIn } from '~/features/auth/hooks/useAuthSignIn';
import { AuthenticationService } from '~/features/auth/services/AuthenticationService';
import { AuthStrategyFactory } from '~/features/auth/strategies/AuthStrategyFactory';
import { useUpdateStore } from '~/features/updates/stores/updateStore';
import { userService } from '~/features/user/services/userService';
import { AuthProvider } from '~/providers/AuthProvider';
import { useUserStore } from '~/stores/user/userStore';
import { routerMock } from '~/test-utils/mocks/native';
import { secureStorage } from '~/utils/storage/SecureStorage';

jest.mock('~/utils/storage/SecureStorage', () => ({
  secureStorage: { load: jest.fn(), save: jest.fn(), remove: jest.fn() },
}));
jest.mock('~/features/user/services/userService', () => ({ userService: { getUserData: jest.fn() } }));
jest.mock('~/features/auth/services/AuthenticationService', () => ({
  AuthenticationService: { shared: { getToken: jest.fn() } },
}));
jest.mock('~/features/auth/strategies/AuthStrategyFactory', () => ({
  AuthStrategyFactory: { getStrategy: jest.fn() },
}));
jest.mock('~/config/sentry', () => ({ setUserContext: jest.fn() }));
jest.mock('~/shared/services/AppResetService', () => ({ waitForLogout: jest.fn().mockResolvedValue(undefined) }));
jest.mock('~/features/watchSync/useWatchSync', () => ({ useWatchSync: jest.fn() }));
const mockSyncOfflineData = jest.fn();
jest.mock('~/features/running/hooks/useOfflineSync', () => ({
  useOfflineSync: () => ({ syncOfflineData: mockSyncOfflineData }),
}));

const accessToken = `header.${Buffer.from(JSON.stringify({
  userId: 1, isAgreedOnTerms: true, exp: 4_000_000_000,
})).toString('base64url')}.signature`;
const userData = {
  id: 1, name: 'Fresh profile', authorityType: 'ROLE_USER', totalPoint: 100,
  avatarId: 1, haveRunningRecord: false, userAccounts: [], equippedItems: [], hairColor: '#000000',
};

describe('AuthProvider persisted startup', () => {
  const authOptions = useAuthStore.persist.getOptions();
  const userOptions = useUserStore.persist.getOptions();
  let disk: Map<string, string>;
  let restoreAuth: () => void;
  let restoreUser: () => void;
  let failAuth: () => void;
  let failUser: () => void;
  let finishProfile: (data: typeof userData) => void;

  beforeEach(async () => {
    await Promise.all([useAuthStore.persist.rehydrate(), useUserStore.persist.rehydrate()]);
    useAuthStore.setState(useAuthStore.getInitialState(), true);
    useUserStore.setState(useUserStore.getInitialState(), true);
    disk = new Map([
      ['auth-storage', JSON.stringify({ state: { isLoggedIn: true }, version: 0 })],
      ['user-storage', JSON.stringify({ state: {
        currentUser: { id: 1, nickname: 'Cached profile', userAccounts: [], level: 1 },
      }, version: 1 })],
    ]);
    const storage: StateStorage = {
      getItem: (key) => {
        const snapshot = disk.get(key) ?? null;
        return new Promise((resolve, reject) => {
          if (key === 'auth-storage') {
            restoreAuth = () => resolve(snapshot);
            failAuth = () => reject(new Error('Storage unavailable'));
          } else {
            restoreUser = () => resolve(snapshot);
            failUser = () => reject(new Error('Storage unavailable'));
          }
        });
      },
      setItem: async (key, value) => { disk.set(key, value); },
      removeItem: async (key) => { disk.delete(key); },
    };
    useAuthStore.persist.setOptions({ storage: createJSONStorage(() => storage) });
    useUserStore.persist.setOptions({ storage: createJSONStorage(() => storage) });
    void useAuthStore.persist.rehydrate();
    void useUserStore.persist.rehydrate();
    (secureStorage.load as jest.Mock).mockImplementation(async (key) => key === 'accessToken' ? accessToken : 'refresh');
    (userService.getUserData as jest.Mock).mockReturnValue(new Promise((resolve) => { finishProfile = resolve; }));
    mockSyncOfflineData.mockResolvedValue(null);
    useUpdateStore.getState().setAutoUpdateCompleted(true);
  });

  afterEach(() => {
    useAuthStore.persist.setOptions(authOptions);
    useUserStore.persist.setOptions(userOptions);
  });

  it.each([
    ['auth-storage', 'user-storage'],
    ['user-storage', 'auth-storage'],
  ] as const)('waits for %s then %s, then restores profile and replay without losing the login bit', async (first, second) => {
    const restore = { 'auth-storage': restoreAuth, 'user-storage': restoreUser };
    render(<AuthProvider><View testID="child" /></AuthProvider>);
    await act(async () => {});
    expect(screen.getByTestId('child')).toBeOnTheScreen();
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(userService.getUserData).not.toHaveBeenCalled();
    expect(JSON.parse(disk.get('auth-storage')!).state.isLoggedIn).toBe(true);

    await act(async () => { restore[first](); });
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(userService.getUserData).not.toHaveBeenCalled();

    await act(async () => { restore[second](); });
    await waitFor(() => expect(userService.getUserData).toHaveBeenCalledTimes(1));
    expect(userService.getUserData).toHaveBeenCalledWith({ sessionSnapshot: { generation: 0, userId: 1 } });
    expect(routerMock.replace).not.toHaveBeenCalled();
    await act(async () => { finishProfile(userData); });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith('/(tabs)/running'));
    expect(routerMock.replace).toHaveBeenCalledTimes(1);
    expect(useUserStore.getState().currentUser?.nickname).toBe('Fresh profile');
    expect(mockSyncOfflineData).toHaveBeenCalledTimes(1);
    expect(JSON.parse(disk.get('auth-storage')!).state.isLoggedIn).toBe(true);
  });

  it('does not persist initial logged-out state when secure token restoration finishes before auth hydration', async () => {
    const initializing = useAuthStore.getState().initializeTokens();
    await act(async () => {});

    expect(JSON.parse(disk.get('auth-storage')!).state.isLoggedIn).toBe(true);

    await act(async () => { restoreAuth(); restoreUser(); await initializing; });
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe(accessToken);
    expect(JSON.parse(disk.get('auth-storage')!).state.isLoggedIn).toBe(true);
  });

  it.each(['auth-storage', 'user-storage'] as const)('finishes on %s read failure without destroying persisted login or starting replay', async (failedStore) => {
    const fail = { 'auth-storage': failAuth, 'user-storage': failUser };
    render(<AuthProvider><View testID="child" /></AuthProvider>);

    await act(async () => { fail[failedStore](); restoreAuth(); restoreUser(); });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'));
    expect(screen.getByTestId('child')).toBeOnTheScreen();
    expect(userService.getUserData).not.toHaveBeenCalled();
    expect(mockSyncOfflineData).not.toHaveBeenCalled();
    expect(JSON.parse(disk.get('auth-storage')!).state.isLoggedIn).toBe(true);
  });

  it('does not start profile or replay after unmount while persistence is pending', async () => {
    const provider = render(<AuthProvider><View /></AuthProvider>);
    provider.unmount();

    await act(async () => { restoreAuth(); restoreUser(); });

    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(userService.getUserData).not.toHaveBeenCalled();
    expect(mockSyncOfflineData).not.toHaveBeenCalled();
  });

  it('waits before interactive sign-in writes auth and permits a fresh login after persisted restoration fails', async () => {
    (AuthStrategyFactory.getStrategy as jest.Mock).mockReturnValue({
      isAvailable: () => true,
      getAuthorizationCode: async () => ({ authorizationCode: 'oauth-code' }),
    });
    (AuthenticationService.shared.getToken as jest.Mock).mockResolvedValue({ accessToken, refreshToken: 'refresh' });
    const auth = renderHook(() => useAuthSignIn());
    let signingIn!: Promise<void>;
    await act(async () => { signingIn = auth.result.current.signInWithGoogle(); });

    expect(JSON.parse(disk.get('auth-storage')!).state.isLoggedIn).toBe(true);
    expect(AuthenticationService.shared.getToken).not.toHaveBeenCalled();
    expect(userService.getUserData).not.toHaveBeenCalled();
    await act(async () => { failAuth(); restoreUser(); });
    await waitFor(() => expect(userService.getUserData).toHaveBeenCalledTimes(1));
    await act(async () => { finishProfile(userData); await signingIn; });

    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(useUserStore.getState().currentUser?.nickname).toBe('Fresh profile');
    expect(JSON.parse(disk.get('auth-storage')!).state.isLoggedIn).toBe(true);
    await expect(useAuthStore.getState().getAccessTokenSafe()).resolves.toBe(accessToken);
    await expect(useAuthStore.getState().getRefreshTokenSafe()).resolves.toBe('refresh');
  });

  it('keeps logout authoritative when persisted login arrives during token initialization', async () => {
    const initializing = useAuthStore.getState().initializeTokens();
    useAuthStore.getState().logout();

    await act(async () => { restoreAuth(); restoreUser(); await initializing; });

    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(JSON.parse(disk.get('auth-storage')!).state.isLoggedIn).toBe(false);
  });
});
