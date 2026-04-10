import { useUnityStore } from '../unityStore';

describe('unityStore viewport dedupe', () => {
  beforeEach(() => {
    useUnityStore.getState().resetUnityState();
  });

  it('skips redundant active viewport updates when the visible frame is unchanged', () => {
    const subscriber = jest.fn();
    const unsubscribe = useUnityStore.subscribe(subscriber);

    useUnityStore.getState().setActiveViewport({
      owner: 'share',
      frame: { x: 16, y: 115, width: 280, height: 350 },
      borderRadius: 16,
    });

    useUnityStore.getState().setActiveViewport({
      owner: 'share',
      frame: { x: 16, y: 115, width: 280, height: 350 },
      borderRadius: 16,
    });

    unsubscribe();

    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('skips redundant session status writes when status, reason, and owner are unchanged', () => {
    const subscriber = jest.fn();
    const unsubscribe = useUnityStore.subscribe(subscriber);

    useUnityStore.getState().setSessionStatus('attached_visible', 'viewport:share', 'share');
    useUnityStore.getState().setSessionStatus('attached_visible', 'viewport:share', 'share');

    unsubscribe();

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(useUnityStore.getState().sessionTransitions).toHaveLength(1);
  });
});
