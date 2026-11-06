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

  it('resets surface visibility when unity state is reset', () => {
    useUnityStore.getState().setSurfaceVisible(true);

    expect(useUnityStore.getState().isSurfaceVisible).toBe(true);

    useUnityStore.getState().resetUnityState();

    expect(useUnityStore.getState().isSurfaceVisible).toBe(false);
  });

  it('keeps the outgoing Unity viewport visible until its native transition ends', () => {
    const viewport = { owner: 'share' as const, frame: { x: 16, y: 115, width: 280, height: 350 } };
    useUnityStore.getState().setActiveViewport(viewport);
    useUnityStore.getState().setRenderedViewport(viewport);
    useUnityStore.getState().beginViewportExit('share', 'share-route');

    useUnityStore.getState().clearActiveViewport('share');

    expect(useUnityStore.getState().activeViewport).toEqual(viewport);
    expect(useUnityStore.getState().renderedViewport).toEqual(viewport);
    expect(useUnityStore.getState().isUnityViewVisible).toBe(true);

    useUnityStore.getState().completeViewportExit('share-route');

    expect(useUnityStore.getState().activeViewport).toBeNull();
    expect(useUnityStore.getState().renderedViewport).toBeNull();
    expect(useUnityStore.getState().isUnityViewVisible).toBe(false);
  });

  it('does not let an old exit hide a new claim, including the same owner and frame', () => {
    const viewport = { owner: 'avatar' as const, frame: { x: 20, y: 100, width: 300, height: 300 } };
    useUnityStore.getState().setActiveViewport(viewport);
    useUnityStore.getState().beginViewportExit('avatar', 'old-avatar-route');
    useUnityStore.getState().clearActiveViewport('avatar');

    useUnityStore.getState().setActiveViewport({ ...viewport });
    useUnityStore.getState().completeViewportExit('old-avatar-route');

    expect(useUnityStore.getState().activeViewport).toEqual(viewport);
    expect(useUnityStore.getState().isUnityViewVisible).toBe(true);
  });

  it('allows a forced clear during a retained exit', () => {
    useUnityStore.getState().setActiveViewport({
      owner: 'avatar', frame: { x: 20, y: 100, width: 300, height: 300 },
    });
    useUnityStore.getState().beginViewportExit('avatar', 'avatar-route');
    useUnityStore.getState().clearActiveViewport();

    expect(useUnityStore.getState().activeViewport).toBeNull();
    expect(useUnityStore.getState().isUnityViewVisible).toBe(false);
  });

  it('clears normally if the native transition completes before React cleanup', () => {
    useUnityStore.getState().setActiveViewport({
      owner: 'avatar', frame: { x: 20, y: 100, width: 300, height: 300 },
    });
    useUnityStore.getState().beginViewportExit('avatar', 'avatar-route');
    useUnityStore.getState().completeViewportExit('avatar-route');
    useUnityStore.getState().clearActiveViewport('avatar');

    expect(useUnityStore.getState().activeViewport).toBeNull();
    expect(useUnityStore.getState().isUnityViewVisible).toBe(false);
  });
});
