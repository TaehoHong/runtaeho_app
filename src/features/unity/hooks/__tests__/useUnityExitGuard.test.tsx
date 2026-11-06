import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useUnityExitGuard } from '../useUnityExitGuard';
import { useUnityStore } from '~/stores/unity/unityStore';
import { useAuthStore } from '~/features/auth/stores/authStore';

const mockCapture = jest.fn();
const mockRelease = jest.fn();
const mockDispatch = jest.fn();
let mockPrevent: (event: { data: { action: { type: string } } }) => void;
const mockNavigation = {
  getParent: () => undefined,
  getState: () => ({ routes: [{ key: 'user-route' }], index: 0 }),
  isFocused: () => true,
  dispatch: mockDispatch,
};

jest.mock('expo-router/react-navigation', () => ({
  useNavigation: () => mockNavigation,
  usePreventRemove: (_prevent: boolean, callback: typeof mockPrevent) => { mockPrevent = callback; },
}));
jest.mock('~/features/unity/services/transitionSnapshot', () => ({
  captureTransitionSnapshot: () => mockCapture(),
  releaseTransitionSnapshot: (uri: string) => mockRelease(uri),
}));

describe('Unity screen exit snapshot', () => {
  const originalRaf = global.requestAnimationFrame;
  beforeEach(() => {
    jest.clearAllMocks();
    useUnityStore.getState().resetUnityState();
    useAuthStore.setState({ isLoggedIn: true });
    mockCapture.mockResolvedValue('file:///snapshot.png');
    global.requestAnimationFrame = ((callback: FrameRequestCallback) => { callback(0); return 0; }) as typeof requestAnimationFrame;
  });
  afterEach(() => { global.requestAnimationFrame = originalRaf; });

  it('waits for the composed cover to load before replaying the blocked navigation once', async () => {
    renderHook(useUnityExitGuard);
    act(() => {
      mockPrevent({ data: { action: { type: 'GO_BACK' } } });
      mockPrevent({ data: { action: { type: 'GO_BACK' } } });
    });
    await waitFor(() => expect(useUnityStore.getState().exitSnapshot?.uri).toBe('file:///snapshot.png'));
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockCapture).toHaveBeenCalledTimes(1);

    act(() => useUnityStore.getState().exitSnapshot?.onReady());
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: 'GO_BACK' }));
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('releases a late capture instead of covering or navigating a newer session', async () => {
    let finish!: (uri: string) => void;
    mockCapture.mockReturnValue(new Promise<string>((resolve) => { finish = resolve; }));
    renderHook(useUnityExitGuard);
    act(() => mockPrevent({ data: { action: { type: 'GO_BACK' } } }));
    useAuthStore.getState().invalidateSession();
    await act(async () => finish('file:///old-session.png'));

    expect(mockRelease).toHaveBeenCalledWith('file:///old-session.png');
    expect(useUnityStore.getState().exitSnapshot).toBeNull();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('keeps back navigation available with an opaque cover when native capture fails', async () => {
    mockCapture.mockRejectedValue(new Error('capture unavailable'));
    renderHook(useUnityExitGuard);
    act(() => mockPrevent({ data: { action: { type: 'GO_BACK' } } }));
    await waitFor(() => expect(useUnityStore.getState().exitSnapshot).not.toBeNull());
    expect(useUnityStore.getState().exitSnapshot?.uri).toBeNull();
    act(() => useUnityStore.getState().exitSnapshot?.onReady());
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(1));
  });

  it('does not replay navigation if its screen unmounts while the cover is loading', async () => {
    const { unmount } = renderHook(useUnityExitGuard);
    act(() => mockPrevent({ data: { action: { type: 'GO_BACK' } } }));
    await waitFor(() => expect(useUnityStore.getState().exitSnapshot).not.toBeNull());
    await act(async () => unmount());
    expect(useUnityStore.getState().exitSnapshot).toBeNull();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('keeps the cover after the destination transition until the outgoing screen unmounts', async () => {
    const { unmount } = renderHook(useUnityExitGuard);
    act(() => mockPrevent({ data: { action: { type: 'GO_BACK' } } }));
    await waitFor(() => expect(useUnityStore.getState().exitSnapshot?.uri).toBe('file:///snapshot.png'));
    const snapshot = useUnityStore.getState().exitSnapshot!;
    act(() => snapshot.onReady());
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(1));

    act(() => snapshot.onDestinationReady());
    expect(useUnityStore.getState().exitSnapshot).toBe(snapshot);
    act(() => unmount());
    await waitFor(() => expect(useUnityStore.getState().exitSnapshot).toBeNull());
  });

  it('keeps the cover after screen removal until the destination transition completes', async () => {
    const { unmount } = renderHook(useUnityExitGuard);
    act(() => mockPrevent({ data: { action: { type: 'GO_BACK' } } }));
    await waitFor(() => expect(useUnityStore.getState().exitSnapshot?.uri).toBe('file:///snapshot.png'));
    const snapshot = useUnityStore.getState().exitSnapshot!;
    act(() => snapshot.onReady());
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(1));
    act(() => unmount());
    expect(useUnityStore.getState().exitSnapshot).toBe(snapshot);

    act(() => snapshot.onDestinationReady());
    await waitFor(() => expect(useUnityStore.getState().exitSnapshot).toBeNull());
  });

  it('removes an abandoned image-error fallback when its source unmounts before navigation', async () => {
    const { unmount } = renderHook(useUnityExitGuard);
    act(() => mockPrevent({ data: { action: { type: 'GO_BACK' } } }));
    await waitFor(() => expect(useUnityStore.getState().exitSnapshot?.uri).toBe('file:///snapshot.png'));
    const snapshot = useUnityStore.getState().exitSnapshot!;
    act(() => useUnityStore.getState().setExitSnapshot({ ...snapshot, uri: null }));
    await act(async () => unmount());

    await waitFor(() => expect(useUnityStore.getState().exitSnapshot).toBeNull());
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not clear a newer cover when an old destination finishes', async () => {
    const { unmount } = renderHook(useUnityExitGuard);
    act(() => mockPrevent({ data: { action: { type: 'GO_BACK' } } }));
    await waitFor(() => expect(useUnityStore.getState().exitSnapshot?.uri).toBe('file:///snapshot.png'));
    const snapshot = useUnityStore.getState().exitSnapshot!;
    act(() => snapshot.onReady());
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(1));
    act(() => unmount());
    const newer = { ...snapshot, uri: 'file:///newer.png', onReady: () => {}, onDestinationReady: () => {} };
    act(() => useUnityStore.getState().setExitSnapshot(newer));

    act(() => snapshot.onDestinationReady());
    expect(useUnityStore.getState().exitSnapshot).toBe(newer);
  });
});
