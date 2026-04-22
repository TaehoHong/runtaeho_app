import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useUnityStore } from '~/stores/unity/unityStore';
import { useUnityReadiness } from './useUnityReadiness';

const mockSyncReady = jest.fn();
const mockWaitForReady = jest.fn();

jest.mock('../services/UnityService', () => ({
  unityService: {
    syncReady: (...args: unknown[]) => mockSyncReady(...args),
    waitForReady: (...args: unknown[]) => mockWaitForReady(...args),
  },
}));

describe('useUnityReadiness', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    useUnityStore.getState().resetUnityState();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    mockSyncReady.mockResolvedValue(undefined);
    mockWaitForReady.mockResolvedValue({ timedOut: false });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
  });

  it('does not reschedule a pending manual start when startUnity is called again', async () => {
    const { result, unmount } = renderHook(() =>
      useUnityReadiness({
        autoStart: false,
        waitForAvatar: false,
        startDelay: 500,
      })
    );

    act(() => {
      result.current.startUnity();
    });

    act(() => {
      jest.advanceTimersByTime(250);
    });

    act(() => {
      result.current.startUnity();
    });

    act(() => {
      jest.advanceTimersByTime(249);
    });

    expect(result.current.isUnityStarted).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => {
      expect(result.current.isUnityStarted).toBe(true);
    });

    unmount();
  });

  it('starts immediately when Unity becomes ready before the delayed mount fires', async () => {
    const { result, unmount } = renderHook(() =>
      useUnityReadiness({
        autoStart: false,
        waitForAvatar: false,
        startDelay: 500,
      })
    );

    act(() => {
      result.current.startUnity();
    });

    act(() => {
      jest.advanceTimersByTime(100);
      useUnityStore.getState().setGameObjectReady(true);
    });

    await waitFor(() => {
      expect(result.current.isUnityStarted).toBe(true);
    });

    unmount();
  });

  it('auto-starts Unity on supported platforms', async () => {
    const { result, unmount } = renderHook(() =>
      useUnityReadiness({
        autoStart: true,
        waitForAvatar: false,
        startDelay: 500,
      })
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.isUnityStarted).toBe(true);
    });

    unmount();
  });
});
