import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Item } from '~/features/avatar';
import type { InitialAvatarPayload } from './useUnityBootstrap';
import { useUnityBootstrap } from './useUnityBootstrap';

const mockSyncAvatar = jest.fn();
const mockUseUnityReadiness = jest.fn();
const mockBaseHandleUnityReady = jest.fn();
const mockStartUnity = jest.fn();
const mockReset = jest.fn();

jest.mock('../services/UnityService', () => ({
  unityService: {
    syncAvatar: (...args: unknown[]) => mockSyncAvatar(...args),
  },
}));

jest.mock('./useUnityReadiness', () => ({
  useUnityReadiness: (...args: unknown[]) => mockUseUnityReadiness(...args),
}));

function createItem(id: number): Item {
  return {
    id,
    itemType: {
      id: 1,
      name: '머리',
    },
    name: `New_Hair_${id}`,
    unityFilePath: `Assets/05.Resource/Hair/New_Hair_${id}.png`,
    filePath: `/assets/items/Hair/New_Hair_${id}.png`,
    point: 100,
    createdAt: new Date().toISOString(),
    isOwned: true,
  };
}

describe('useUnityBootstrap', () => {
  const readinessState = {
    isReady: false,
    isAvatarApplied: false,
    canSendMessage: false,
    isUnityStarted: false,
    isUnityAvailable: true,
    handleUnityReady: mockBaseHandleUnityReady,
    startUnity: mockStartUnity,
    reset: mockReset,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    readinessState.isReady = false;
    readinessState.isAvatarApplied = false;
    readinessState.canSendMessage = false;
    readinessState.isUnityStarted = false;
    readinessState.isUnityAvailable = true;

    mockSyncAvatar.mockResolvedValue('applied');
    mockUseUnityReadiness.mockImplementation(() => ({
      ...readinessState,
    }));
  });

  it('calls syncAvatar once even when onUnityReady is fired multiple times', async () => {
    const payload: InitialAvatarPayload = {
      items: [createItem(1)],
      hairColor: '#000000',
    };

    const { result, rerender } = renderHook(
      (_props: undefined) =>
        useUnityBootstrap({
          getInitialAvatarPayload: () => payload,
        }),
      { initialProps: undefined }
    );

    act(() => {
      result.current.handleUnityReady({ nativeEvent: { ready: true } });
      result.current.handleUnityReady({ nativeEvent: { ready: true } });
    });

    expect(mockBaseHandleUnityReady).toHaveBeenCalledTimes(2);
    expect(mockSyncAvatar).toHaveBeenCalledTimes(0);

    act(() => {
      readinessState.canSendMessage = true;
      readinessState.isReady = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
    });

    rerender(undefined);
    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
    });
  });

  it('waits until payload becomes available and then syncs once', async () => {
    let payload: InitialAvatarPayload = null;

    const { result, rerender } = renderHook(
      (_props: undefined) =>
        useUnityBootstrap({
          getInitialAvatarPayload: () => payload,
        }),
      { initialProps: undefined }
    );

    act(() => {
      readinessState.canSendMessage = true;
      readinessState.isReady = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(result.current.bootstrapPhase).toBe('waiting-payload');
    });

    act(() => {
      payload = {
        items: [createItem(2)],
        hairColor: '#8B4513',
      };
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
      expect(result.current.isInitialAvatarSynced).toBe(true);
      expect(result.current.bootstrapPhase).toBe('done');
    });
  });

  it('re-syncs initial avatar after canSendMessage reconnect', async () => {
    const payload: InitialAvatarPayload = {
      items: [createItem(3)],
      hairColor: '#123456',
    };

    const { result, rerender } = renderHook(
      (_props: undefined) =>
        useUnityBootstrap({
          getInitialAvatarPayload: () => payload,
        }),
      { initialProps: undefined }
    );

    act(() => {
      readinessState.canSendMessage = true;
      readinessState.isReady = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
      expect(result.current.isInitialAvatarSynced).toBe(true);
    });

    act(() => {
      readinessState.canSendMessage = false;
      readinessState.isReady = false;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(result.current.isInitialAvatarSynced).toBe(false);
      expect(result.current.bootstrapPhase).toBe('waiting-ready');
    });

    act(() => {
      readinessState.canSendMessage = true;
      readinessState.isReady = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(2);
      expect(result.current.isInitialAvatarSynced).toBe(true);
    });
  });
});
