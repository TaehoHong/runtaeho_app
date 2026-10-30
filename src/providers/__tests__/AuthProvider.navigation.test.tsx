import React from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { View } from 'react-native';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { useUpdateStore } from '~/features/updates/stores/updateStore';
import { userService } from '~/features/user/services/userService';
import { AuthProvider } from '~/providers/AuthProvider';
import { useAppStore, ViewState } from '~/stores/app/appStore';
import { useUserStore } from '~/stores/user/userStore';
import { routerMock } from '~/test-utils/mocks/native';
import { resetAllStores } from '~/test-utils/resetState';
import { tokenStorage } from '~/utils/storage';

jest.mock('~/utils/storage', () => ({
  tokenStorage: {
    saveTokens: jest.fn(),
    getAccessToken: jest.fn(),
    loadTokens: jest.fn(),
  },
}));
jest.mock('~/features/user/services/userService', () => ({
  userService: { getUserData: jest.fn() },
}));
jest.mock('~/config/sentry', () => ({ setUserContext: jest.fn() }));
jest.mock('~/shared/services/AppResetService', () => ({
  waitForLogout: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('~/features/watchSync/useWatchSync', () => ({ useWatchSync: jest.fn() }));
const mockSyncOfflineData = jest.fn();
jest.mock('~/features/running/hooks/useOfflineSync', () => ({
  useOfflineSync: () => ({ syncOfflineData: mockSyncOfflineData }),
}));

const mockTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;
const mockGetUserData = userService.getUserData as jest.Mock;
const buildToken = (agreed: boolean, revision = 1) => {
  const payload = Buffer.from(JSON.stringify({
    userId: 1, isAgreedOnTerms: agreed, iat: revision, exp: 4_000_000_000,
  })).toString('base64url');
  return `header.${payload}.signature`;
};
const userData = {
  id: 1, name: 'Runner', authorityType: 'ROLE_USER', totalPoint: 100,
  avatarId: 1, haveRunningRecord: false, userAccounts: [], equippedItems: [], hairColor: '#000000',
};
const renderProvider = () => render(<AuthProvider><View testID="child" /></AuthProvider>);
const expectRoute = async (path: string) => {
  await waitFor(() => expect(routerMock.replace).toHaveBeenLastCalledWith(path));
};

describe('AuthProvider navigation', () => {
  beforeEach(() => {
    resetAllStores();
    useAuthStore.setState({ tokensRevoked: false });
    useUpdateStore.getState().setAutoUpdateCompleted(true);
    mockTokenStorage.loadTokens.mockImplementation(async () => ({
      accessToken: useAuthStore.getState().accessToken,
      refreshToken: useAuthStore.getState().refreshToken,
    }));
    mockTokenStorage.getAccessToken.mockImplementation(async () => useAuthStore.getState().accessToken);
    mockTokenStorage.saveTokens.mockImplementation(async (_access, _refresh, options) => {
      options?.onCommit?.();
    });
    mockGetUserData.mockResolvedValue(userData);
    mockSyncOfflineData.mockResolvedValue(null);
  });

  it('waits for user hydration but routes while replay is pending without restarting it on token or nickname changes', async () => {
    let hydrateUser: (data: typeof userData) => void = () => {};
    let finishReplay: () => void = () => {};
    mockGetUserData.mockReturnValueOnce(new Promise((resolve) => { hydrateUser = resolve; }));
    mockSyncOfflineData.mockReturnValueOnce(new Promise<void>((resolve) => { finishReplay = resolve; }));
    useAuthStore.setState({ isLoggedIn: true, accessToken: buildToken(true) });
    renderProvider();
    await waitFor(() => expect(mockGetUserData).toHaveBeenCalled());
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(mockSyncOfflineData).not.toHaveBeenCalled();

    await act(async () => { hydrateUser(userData); });
    await expectRoute('/(tabs)/running');
    expect(useAppStore.getState().viewState).toBe(ViewState.Loaded);
    expect(mockSyncOfflineData).toHaveBeenCalledTimes(1);
    routerMock.replace.mockClear();
    act(() => {
      useAuthStore.getState().setAccessToken(buildToken(true, 2));
      useUserStore.getState().setNickname('Updated nickname');
    });
    await act(async () => { finishReplay(); });
    expect(mockSyncOfflineData).toHaveBeenCalledTimes(1);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('keeps the authenticated route ready when background replay rejects', async () => {
    let failReplay: (error: Error) => void = () => {};
    mockSyncOfflineData.mockReturnValueOnce(new Promise((_resolve, reject) => { failReplay = reject; }));
    useAuthStore.setState({ isLoggedIn: true, accessToken: buildToken(true) });
    renderProvider();
    await expectRoute('/(tabs)/running');
    routerMock.replace.mockClear();

    await act(async () => { failReplay(new Error('replay unavailable')); });

    expect(useAppStore.getState().viewState).toBe(ViewState.Loaded);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('readies a replacement login without waiting for the previous bootstrap user request', async () => {
    let finishOldHydration: (data: typeof userData) => void = () => {};
    mockGetUserData.mockReturnValueOnce(new Promise((resolve) => { finishOldHydration = resolve; }));
    useAuthStore.setState({ isLoggedIn: true, accessToken: buildToken(true) });
    renderProvider();
    const auth = renderHook(() => useAuth());
    await waitFor(() => expect(mockGetUserData).toHaveBeenCalledTimes(1));

    act(() => { useAuthStore.getState().logout(); });
    await expectRoute('/auth/login');
    await act(async () => { await auth.result.current.completeLogin(buildToken(true, 2), 'new-refresh'); });
    await expectRoute('/(tabs)/running');
    expect(mockGetUserData).toHaveBeenCalledTimes(2);
    expect(mockSyncOfflineData).toHaveBeenCalledTimes(1);
    routerMock.replace.mockClear();
    await act(async () => { finishOldHydration({ ...userData, name: 'Old profile' }); });

    expect(useUserStore.getState().currentUser?.nickname).toBe('Runner');
    expect(mockSyncOfflineData).toHaveBeenCalledTimes(1);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('does not start replay after unmount during user hydration', async () => {
    let hydrateUser: (data: typeof userData) => void = () => {};
    mockGetUserData.mockReturnValueOnce(new Promise((resolve) => { hydrateUser = resolve; }));
    useAuthStore.setState({ isLoggedIn: true, accessToken: buildToken(true) });
    const provider = renderProvider();
    await waitFor(() => expect(mockGetUserData).toHaveBeenCalled());
    provider.unmount();

    await act(async () => { hydrateUser(userData); });

    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(mockSyncOfflineData).not.toHaveBeenCalled();
  });

  it('preserves the profile editor on same-session token refresh', async () => {
    useAuthStore.setState({ isLoggedIn: true, accessToken: buildToken(true) });
    renderProvider();
    await expectRoute('/(tabs)/running');
    act(() => { routerMock.push('/user/profile-edit'); });
    routerMock.replace.mockClear();

    act(() => { useAuthStore.getState().setAccessToken(buildToken(true, 2)); });

    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(useAppStore.getState().viewState).toBe(ViewState.Loaded);
  });

  it('waits for token restoration and OTA completion before routing an existing login', async () => {
    let restoreTokens: (tokens: { accessToken: string; refreshToken: null }) => void = () => {};
    mockTokenStorage.loadTokens.mockReturnValue(new Promise((resolve) => { restoreTokens = resolve; }));
    useAuthStore.getState().setLoggedIn(true);
    useUpdateStore.getState().setAutoUpdateCompleted(false);
    renderProvider();
    expect(routerMock.replace).not.toHaveBeenCalled();

    await act(async () => { restoreTokens({ accessToken: buildToken(true), refreshToken: null }); });
    await expectRoute('/auth/login');
    expect(useAppStore.getState().viewState).toBe(ViewState.Loading);
    routerMock.replace.mockClear();

    act(() => { useAuthStore.getState().setAccessToken(buildToken(true, 2)); });
    expect(routerMock.replace).not.toHaveBeenCalled();
    act(() => { useUpdateStore.getState().setAutoUpdateCompleted(true); });
    await expectRoute('/(tabs)/running');
    expect(useAppStore.getState().viewState).toBe(ViewState.Loaded);
  });

  it('routes login, both terms transitions, and logout while preserving unchanged terms', async () => {
    renderProvider();
    const auth = renderHook(() => useAuth());
    await expectRoute('/auth/login');
    expect(useAppStore.getState().viewState).toBe(ViewState.Loaded);

    await act(async () => { await auth.result.current.completeLogin(buildToken(false), 'refresh'); });
    await expectRoute('/auth/terms-agreement');
    routerMock.replace.mockClear();
    act(() => { useAuthStore.getState().setAccessToken(buildToken(false, 2)); });
    expect(routerMock.replace).not.toHaveBeenCalled();

    await act(async () => { await auth.result.current.completeLogin(buildToken(true, 3)); });
    await expectRoute('/(tabs)/running');
    act(() => { useAuthStore.getState().setAccessToken(buildToken(false, 4)); });
    await expectRoute('/auth/terms-agreement');
    act(() => { useAuthStore.getState().logout(); });
    await expectRoute('/auth/login');
    routerMock.replace.mockClear();
    act(() => { useAuthStore.getState().setAccessToken(buildToken(true, 5)); });
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('routes a new OAuth session for the same user even when consent and login status stay unchanged', async () => {
    useAuthStore.setState({ isLoggedIn: true, accessToken: buildToken(true) });
    renderProvider();
    const auth = renderHook(() => useAuth());
    await expectRoute('/(tabs)/running');
    routerMock.replace.mockClear();

    await act(async () => {
      const attempt = useAuthStore.getState().beginLoginAttempt();
      await auth.result.current.completeLogin(buildToken(true, 2), 'new-refresh', attempt);
    });

    await expectRoute('/(tabs)/running');
    expect(routerMock.replace).toHaveBeenCalledTimes(1);
    expect(useUserStore.getState().currentUser?.id).toBe(1);
    routerMock.replace.mockClear();
    act(() => { useUserStore.getState().setNickname('Updated nickname'); });
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
