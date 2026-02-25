import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus, View } from 'react-native';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { AppStateProvider } from '~/providers/AppStateProvider';
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

jest.mock('~/features/point/services/pointService', () => ({
  pointService: {
    getUserPoint: (...args: unknown[]) => mockGetUserPoint(...args),
  },
}));

jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: {
    recoverConnection: (...args: unknown[]) => mockRecoverConnection(...args),
    resetReadyAndResync: (...args: unknown[]) => mockResetReadyAndResync(...args),
    runWhenReady: (...args: unknown[]) => mockRunWhenReady(...args),
    syncAvatar: (...args: unknown[]) => mockSyncAvatar(...args),
  },
}));

const asyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

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
});
