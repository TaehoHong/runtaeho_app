import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus, Platform, View } from 'react-native';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { AppStateProvider } from '~/providers/AppStateProvider';
import { useUserStore } from '~/stores/user/userStore';
import { resetAllStores } from '~/test-utils/resetState';

const mockGetUserPoint = jest.fn();
const mockValidateUnityState = jest.fn();
const mockForceResetUnity = jest.fn();
const mockSyncReadyState = jest.fn();
const mockResetGameObjectReady = jest.fn();
const mockOnReady = jest.fn();
const mockChangeAvatar = jest.fn();

jest.mock('~/features', () => {
  const { useAuthStore } = jest.requireActual('~/features/auth/stores/authStore');
  return { useAuthStore };
});

jest.mock('~/features/point/services/pointService', () => ({
  pointService: {
    getUserPoint: (...args: unknown[]) => mockGetUserPoint(...args),
  },
}));

jest.mock('~/features/unity/bridge/UnityBridge', () => ({
  UnityBridge: {
    validateUnityState: (...args: unknown[]) => mockValidateUnityState(...args),
    forceResetUnity: (...args: unknown[]) => mockForceResetUnity(...args),
    syncReadyState: (...args: unknown[]) => mockSyncReadyState(...args),
    resetGameObjectReady: (...args: unknown[]) => mockResetGameObjectReady(...args),
  },
}));

jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: {
    onReady: (...args: unknown[]) => mockOnReady(...args),
    changeAvatar: (...args: unknown[]) => mockChangeAvatar(...args),
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
  const originalPlatformOS = Platform.OS;
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

    mockValidateUnityState.mockResolvedValue(true);
    mockForceResetUnity.mockResolvedValue(undefined);
    mockSyncReadyState.mockResolvedValue(true);
    mockResetGameObjectReady.mockResolvedValue(undefined);
    mockGetUserPoint.mockResolvedValue({ userId: 1, point: 0 });
    mockOnReady.mockImplementation(() => jest.fn());
    mockChangeAvatar.mockResolvedValue(undefined);

    appStateHandler = null;
    appStateRemoveSpy = jest.fn();

    appStateSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((type, handler) => {
      if (type === 'change') {
        appStateHandler = handler;
      }

      return { remove: appStateRemoveSpy };
    });

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOS,
    });

    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOS,
    });
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
      expect(mockSyncReadyState).toHaveBeenCalledTimes(1);
    });
    expect(mockResetGameObjectReady).not.toHaveBeenCalled();
    expect(mockGetUserPoint).not.toHaveBeenCalled();
    expect(asyncStorageMock.removeItem).toHaveBeenCalledWith('backgroundEnterTime');

    nowSpy.mockRestore();
  });

  it('APP-LC-003 executes long-background branch and syncs user point', async () => {
    useAuthStore.getState().setLoggedIn(true);
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
    asyncStorageMock.getItem.mockResolvedValue(String(2_000_000 - 301_000));
    mockGetUserPoint.mockResolvedValue({ userId: 7, point: 777 });
    const unsubscribeSpy = jest.fn();
    mockOnReady.mockImplementation(() => unsubscribeSpy);

    renderProvider();
    emitAppState('active');

    await waitFor(() => {
      expect(mockResetGameObjectReady).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockGetUserPoint).toHaveBeenCalledTimes(1);
    });
    expect(useUserStore.getState().totalPoint).toBe(777);
    expect(mockForceResetUnity).not.toHaveBeenCalled();
    expect(mockOnReady).toHaveBeenCalledTimes(1);
    expect(mockChangeAvatar).not.toHaveBeenCalled();

    nowSpy.mockRestore();
  });

  it('APP-LC-004 ios skips force reset when syncReadyState recovers stale check', async () => {
    useAuthStore.getState().setLoggedIn(true);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(3_000_000);
    asyncStorageMock.getItem.mockResolvedValue(String(3_000_000 - 60_000));
    mockValidateUnityState.mockResolvedValue(false);
    mockSyncReadyState.mockResolvedValueOnce(true);

    renderProvider();
    emitAppState('active');

    await waitFor(() => {
      expect(mockSyncReadyState).toHaveBeenCalledTimes(1);
    });
    expect(mockForceResetUnity).not.toHaveBeenCalled();
    expect(mockResetGameObjectReady).not.toHaveBeenCalled();

    nowSpy.mockRestore();
  });

  it('APP-LC-004B ios force resets only after retry sync fails', async () => {
    useAuthStore.getState().setLoggedIn(true);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(3_100_000);
    asyncStorageMock.getItem.mockResolvedValue(String(3_100_000 - 40_000));
    mockValidateUnityState.mockResolvedValue(false);
    mockSyncReadyState
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    renderProvider();
    emitAppState('active');

    await waitFor(() => {
      expect(mockForceResetUnity).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });
    expect(mockSyncReadyState).toHaveBeenCalledTimes(3);
    expect(mockResetGameObjectReady).not.toHaveBeenCalled();

    nowSpy.mockRestore();
  });

  it('APP-LC-005 blocks duplicate foreground execution while previous run is in flight', async () => {
    useAuthStore.getState().setLoggedIn(true);
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(4_000_000);
    asyncStorageMock.getItem.mockResolvedValue(String(4_000_000 - 30_000));
    const deferred = createDeferred<boolean>();
    mockSyncReadyState.mockReturnValue(deferred.promise);

    renderProvider();

    emitAppState('active');
    emitAppState('active');

    await waitFor(() => {
      expect(asyncStorageMock.getItem).toHaveBeenCalledTimes(1);
    });
    expect(mockSyncReadyState).toHaveBeenCalledTimes(1);

    deferred.resolve(true);
    await flushAsync();

    nowSpy.mockRestore();
  });

  it('APP-LC-006 skips background/foreground work when logged out', async () => {
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
    expect(mockSyncReadyState).not.toHaveBeenCalled();
  });

  it('APP-LC-007 android skips force reset when syncReadyState recovers stale check', async () => {
    useAuthStore.getState().setLoggedIn(true);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    mockValidateUnityState.mockResolvedValue(false);
    mockSyncReadyState.mockResolvedValueOnce(true);

    renderProvider();
    emitAppState('active');

    await waitFor(() => {
      expect(mockSyncReadyState).toHaveBeenCalledTimes(1);
    });
    expect(mockForceResetUnity).not.toHaveBeenCalled();
    expect(mockResetGameObjectReady).not.toHaveBeenCalled();
  });

  it('APP-LC-008 android force resets only after retry sync fails', async () => {
    useAuthStore.getState().setLoggedIn(true);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    mockValidateUnityState.mockResolvedValue(false);
    mockSyncReadyState
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    renderProvider();
    emitAppState('active');

    await waitFor(() => {
      expect(mockForceResetUnity).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });
    expect(mockSyncReadyState).toHaveBeenCalledTimes(3);
    expect(mockResetGameObjectReady).not.toHaveBeenCalled();
  });
});
