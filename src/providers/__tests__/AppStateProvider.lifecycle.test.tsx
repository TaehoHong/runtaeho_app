import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus, View } from 'react-native';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { AppStateProvider } from '~/providers/AppStateProvider';
import { createUser } from '~/features/user/models/User';
import { useUserStore } from '~/stores/user/userStore';
import { resetAllStores } from '~/test-utils/resetState';

const mockGetUserPoint = jest.fn();
const mockRecoverConnection = jest.fn();
const mockResetReadyAndResync = jest.fn();
const mockRunWhenReady = jest.fn();
const mockSyncAvatar = jest.fn();

jest.mock('~/features', () => {
  const { useAuthStore } = jest.requireActual('~/features/auth/stores/authStore');
  return { useAuthStore };
});

jest.mock('~/features/point/services/pointService', () => {
  const actual = jest.requireActual('~/features/point/services/pointService');
  actual.pointService.getUserPoint = (...args: unknown[]) => mockGetUserPoint(...args);
  return actual;
});

jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: {
    recoverConnection: (...args: unknown[]) => mockRecoverConnection(...args),
    resetReadyAndResync: (...args: unknown[]) => mockResetReadyAndResync(...args),
    runWhenReady: (...args: unknown[]) => mockRunWhenReady(...args),
    syncAvatar: (...args: unknown[]) => mockSyncAvatar(...args),
  },
}));

const asyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const installInMemoryStorage = (backgroundTime: string) => {
  const stored = new Map([['backgroundEnterTime', backgroundTime]]);
  asyncStorageMock.getItem.mockImplementation(async (key) => stored.get(key) ?? null);
  asyncStorageMock.setItem.mockImplementation(async (key, value) => { stored.set(key, value); });
  asyncStorageMock.removeItem.mockImplementation(async (key) => { stored.delete(key); });
  return stored;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolveFn: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    resolveFn = resolve;
  });
  return {
    promise,
    resolve: resolveFn,
  };
};

describe('AppStateProvider lifecycle', () => {
  let appStateHandler: ((nextAppState: AppStateStatus) => void) | null = null;
  let appStateRemoveSpy: jest.Mock;
  let appStateSpy: jest.SpyInstance;

  const renderProvider = () =>
    render(
      <AppStateProvider>
        <View testID="app-state-provider-child" />
      </AppStateProvider>
    );

  const emitAppState = (nextAppState: AppStateStatus) => {
    if (!appStateHandler) {
      throw new Error('AppState handler is not registered');
    }

    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: nextAppState,
    });

    act(() => {
      appStateHandler?.(nextAppState);
    });
  };

  const flushAsync = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetAllStores();

    useAuthStore.getState().setLoggedIn(false);
    useUserStore.getState().logout();

    asyncStorageMock.getItem.mockResolvedValue(null);
    asyncStorageMock.setItem.mockResolvedValue();
    asyncStorageMock.removeItem.mockResolvedValue();

    mockGetUserPoint.mockResolvedValue({ userId: 1, point: 0 });
    mockRecoverConnection.mockResolvedValue({
      valid: true,
      recovered: true,
      usedForceReset: false,
    });
    mockResetReadyAndResync.mockResolvedValue(undefined);
    mockSyncAvatar.mockResolvedValue('empty');
    mockRunWhenReady.mockImplementation(async (task: () => Promise<void>) => {
      await task();
      return true;
    });

    appStateHandler = null;
    appStateRemoveSpy = jest.fn();

    appStateSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((type, handler) => {
      if (type === 'change') {
        appStateHandler = handler;
      }

      return { remove: appStateRemoveSpy };
    });

    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
  });

  afterEach(() => {
    appStateSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('APP-LC-001 stores backgroundEnterTime when app enters background', async () => {
    useAuthStore.getState().setLoggedIn(true);
    renderProvider();

    emitAppState('background');

    await waitFor(() => {
      expect(asyncStorageMock.setItem).toHaveBeenCalledWith('backgroundEnterTime', expect.any(String));
    });
    expect(mockGetUserPoint).not.toHaveBeenCalled();
  });

  it('APP-LC-002 performs short foreground tasks without long-background branch', async () => {
    useAuthStore.getState().setLoggedIn(true);
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    asyncStorageMock.getItem.mockResolvedValue(String(1_000_000 - 120_000));

    renderProvider();
    emitAppState('active');

    await waitFor(() => {
      expect(mockRecoverConnection).toHaveBeenCalledTimes(1);
    });
    expect(mockResetReadyAndResync).not.toHaveBeenCalled();
    expect(mockGetUserPoint).not.toHaveBeenCalled();
    expect(asyncStorageMock.removeItem).toHaveBeenCalledWith('backgroundEnterTime');

    nowSpy.mockRestore();
  });

  it('APP-LC-003 executes long-background branch and syncs user point', async () => {
    useAuthStore.getState().setLoggedIn(true);
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
    asyncStorageMock.getItem.mockResolvedValue(String(2_000_000 - 301_000));
    useUserStore.setState({ currentUser: createUser({ id: 7, nickname: 'User 7' }) });
    mockGetUserPoint.mockResolvedValue({ userId: 7, point: 777 });

    renderProvider();
    emitAppState('active');

    await waitFor(() => {
      expect(mockResetReadyAndResync).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockGetUserPoint).toHaveBeenCalledTimes(1);
    });

    expect(mockRunWhenReady).toHaveBeenCalledTimes(1);
    expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
    expect(mockRecoverConnection).toHaveBeenCalledTimes(1);
    expect(useUserStore.getState().totalPoint).toBe(777);

    nowSpy.mockRestore();
  });

  it('APP-LC-004 blocks duplicate foreground execution while previous run is in flight', async () => {
    useAuthStore.getState().setLoggedIn(true);
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(4_000_000);
    asyncStorageMock.getItem.mockResolvedValue(String(4_000_000 - 30_000));
    const deferred = createDeferred<{ valid: boolean; recovered: boolean; usedForceReset: boolean }>();
    mockRecoverConnection.mockReturnValue(deferred.promise);

    renderProvider();

    emitAppState('active');
    emitAppState('active');

    await waitFor(() => {
      expect(asyncStorageMock.getItem).toHaveBeenCalledTimes(1);
    });
    expect(mockRecoverConnection).toHaveBeenCalledTimes(1);

    deferred.resolve({ valid: true, recovered: true, usedForceReset: false });
    await flushAsync();

    nowSpy.mockRestore();
  });

  it('APP-LC-005 skips background/foreground work when logged out', async () => {
    useAuthStore.getState().setLoggedIn(false);
    renderProvider();

    emitAppState('background');
    emitAppState('active');
    await flushAsync();

    expect(asyncStorageMock.setItem).not.toHaveBeenCalledWith(
      'backgroundEnterTime',
      expect.any(String)
    );
    expect(asyncStorageMock.removeItem).not.toHaveBeenCalledWith('backgroundEnterTime');
    expect(mockGetUserPoint).not.toHaveBeenCalled();
    expect(mockRecoverConnection).not.toHaveBeenCalled();
  });

  it('keeps the next long background duration when the previous foreground completes', async () => {
    useAuthStore.getState().setLoggedIn(true);
    useUserStore.setState({ currentUser: createUser({ id: 7, nickname: 'User 7' }) });
    mockGetUserPoint.mockResolvedValue({ userId: 7, point: 777 });
    const stored = installInMemoryStorage('10000');
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(400_000);
    const oldReset = createDeferred<void>();
    mockResetReadyAndResync.mockReturnValueOnce(oldReset.promise);
    renderProvider();

    emitAppState('active');
    await waitFor(() => expect(mockResetReadyAndResync).toHaveBeenCalledTimes(1));
    nowSpy.mockReturnValue(410_000);
    emitAppState('background');
    await waitFor(() => expect(stored.get('backgroundEnterTime')).toBe('410000'));
    nowSpy.mockReturnValue(420_000);
    await act(async () => { oldReset.resolve(); });
    await flushAsync();
    nowSpy.mockReturnValue(820_000);
    emitAppState('active');

    await waitFor(() => expect(mockResetReadyAndResync).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(useUserStore.getState().totalPoint).toBe(777));
    expect(mockRecoverConnection).toHaveBeenCalled();
  });

  it('processes the latest foreground cycle after an older cycle finishes waiting', async () => {
    useAuthStore.getState().setLoggedIn(true);
    useUserStore.setState({ currentUser: createUser({ id: 7, nickname: 'User 7' }) });
    mockGetUserPoint.mockResolvedValue({ userId: 7, point: 888 });
    const stored = installInMemoryStorage('10000');
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(400_000);
    const oldReset = createDeferred<void>();
    mockResetReadyAndResync.mockReturnValueOnce(oldReset.promise);
    renderProvider();

    emitAppState('active');
    await waitFor(() => expect(mockResetReadyAndResync).toHaveBeenCalledTimes(1));
    nowSpy.mockReturnValue(410_000);
    emitAppState('background');
    await waitFor(() => expect(stored.get('backgroundEnterTime')).toBe('410000'));
    nowSpy.mockReturnValue(820_000);
    emitAppState('active');
    emitAppState('active');
    await act(async () => { oldReset.resolve(); });

    await waitFor(() => expect(useUserStore.getState().totalPoint).toBe(888));
    expect(mockResetReadyAndResync).toHaveBeenCalledTimes(2);
    expect(mockGetUserPoint).toHaveBeenCalledTimes(1);
    expect(mockRecoverConnection).toHaveBeenCalledTimes(1);
  });

  it('finishes a required long-background refresh on the latest short foreground cycle', async () => {
    useAuthStore.getState().setLoggedIn(true);
    useUserStore.setState({
      currentUser: createUser({ id: 7, nickname: 'User 7' }),
      totalPoint: 100,
    });
    mockGetUserPoint.mockResolvedValue({ userId: 7, point: 200 });
    const stored = installInMemoryStorage('10000');
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(400_000);
    const oldReset = createDeferred<void>();
    mockResetReadyAndResync.mockReturnValueOnce(oldReset.promise);
    renderProvider();

    emitAppState('active');
    await waitFor(() => expect(mockResetReadyAndResync).toHaveBeenCalledTimes(1));
    nowSpy.mockReturnValue(410_000);
    emitAppState('background');
    await waitFor(() => expect(stored.get('backgroundEnterTime')).toBe('410000'));
    nowSpy.mockReturnValue(420_000);
    emitAppState('active');
    await act(async () => { oldReset.resolve(); });

    await waitFor(() => expect(useUserStore.getState().totalPoint).toBe(200));
    expect(mockGetUserPoint).toHaveBeenCalledTimes(1);
    expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
    expect(mockRecoverConnection).toHaveBeenCalledTimes(1);
  });

  it('preserves a background write overlapping a pending foreground timestamp read', async () => {
    useAuthStore.getState().setLoggedIn(true);
    useUserStore.setState({ currentUser: createUser({ id: 7, nickname: 'User 7' }) });
    mockGetUserPoint.mockResolvedValue({ userId: 7, point: 999 });
    const stored = installInMemoryStorage('10000');
    const oldRead = createDeferred<string | null>();
    const newWrite = createDeferred<void>();
    asyncStorageMock.getItem.mockReturnValueOnce(oldRead.promise);
    asyncStorageMock.setItem.mockImplementation(async (key, value) => {
      await newWrite.promise;
      stored.set(key, value);
    });
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(400_000);
    renderProvider();

    emitAppState('active');
    await waitFor(() => expect(asyncStorageMock.getItem).toHaveBeenCalledTimes(1));
    nowSpy.mockReturnValue(410_000);
    emitAppState('background');
    nowSpy.mockReturnValue(820_000);
    emitAppState('active');
    await act(async () => { oldRead.resolve('10000'); });
    await waitFor(() => expect(asyncStorageMock.setItem).toHaveBeenCalled());
    expect(mockResetReadyAndResync).not.toHaveBeenCalled();
    await act(async () => { newWrite.resolve(); });

    await waitFor(() => expect(useUserStore.getState().totalPoint).toBe(999));
    expect(mockResetReadyAndResync).toHaveBeenCalledTimes(1);
    expect(mockRecoverConnection).toHaveBeenCalledTimes(1);
  });

  it('does not let a pending timestamp removal erase the next background write', async () => {
    useAuthStore.getState().setLoggedIn(true);
    useUserStore.setState({ currentUser: createUser({ id: 7, nickname: 'User 7' }) });
    mockGetUserPoint.mockResolvedValue({ userId: 7, point: 123 });
    const stored = installInMemoryStorage('390000');
    const oldRemoval = createDeferred<void>();
    asyncStorageMock.removeItem.mockImplementationOnce(async () => {
      await oldRemoval.promise;
      stored.delete('backgroundEnterTime');
    });
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(400_000);
    renderProvider();

    emitAppState('active');
    await waitFor(() => expect(asyncStorageMock.removeItem).toHaveBeenCalledTimes(1));
    nowSpy.mockReturnValue(410_000);
    emitAppState('background');
    await flushAsync();
    await act(async () => { oldRemoval.resolve(); });
    await flushAsync();
    nowSpy.mockReturnValue(820_000);
    emitAppState('active');

    await waitFor(() => expect(useUserStore.getState().totalPoint).toBe(123));
    expect(mockResetReadyAndResync).toHaveBeenCalledTimes(1);
  });

  it('uses live login state and tracks cycles through logged-out foreground events', async () => {
    const stored = installInMemoryStorage('10000');
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(400_000);
    renderProvider();

    act(() => {
      useAuthStore.getState().setLoggedIn(true);
      emitAppState('background');
    });
    await waitFor(() => expect(stored.get('backgroundEnterTime')).toBe('400000'));
    act(() => {
      useAuthStore.getState().logout();
      emitAppState('active');
      useAuthStore.getState().setLoggedIn(true);
      nowSpy.mockReturnValue(410_000);
      emitAppState('background');
    });

    await waitFor(() => expect(stored.get('backgroundEnterTime')).toBe('410000'));
    expect(mockRecoverConnection).not.toHaveBeenCalled();
  });

  it('does not apply account A point data after logout and account B login', async () => {
    useAuthStore.getState().setLoggedIn(true);
    jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
    asyncStorageMock.getItem.mockResolvedValue(String(2_000_000 - 301_000));
    useUserStore.setState({ currentUser: createUser({ id: 1, nickname: 'User 1' }) });
    const oldPoint = createDeferred<{ userId: number; point: number }>();
    mockGetUserPoint.mockReturnValue(oldPoint.promise);
    renderProvider();
    emitAppState('active');
    await waitFor(() => expect(mockGetUserPoint).toHaveBeenCalledTimes(1));
    act(() => {
      useAuthStore.getState().logout();
      useAuthStore.getState().setLoggedIn(true);
      useUserStore.setState({ currentUser: createUser({ id: 2, nickname: 'User 2' }), totalPoint: 900 });
    });
    await act(async () => { oldPoint.resolve({ userId: 1, point: 1 }); });
    expect(useUserStore.getState().totalPoint).toBe(900);
    expect(mockSyncAvatar).not.toHaveBeenCalled();
  });

});
