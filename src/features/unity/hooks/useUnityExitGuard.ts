import { useEffect, useRef, useState } from 'react';
import { useNavigation, usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';
import { getSessionSnapshot, isSessionCurrent, useAuthStore } from '~/features/auth/stores/authStore';
import { useUnityStore, type UnityExitSnapshot } from '~/stores/unity/unityStore';
import { captureTransitionSnapshot, releaseTransitionSnapshot } from '../services/transitionSnapshot';

/** Freeze the entire composed screen before native navigation separates its layers. */
export const useUnityExitGuard = (enabled = true) => {
  const navigation = useNavigation();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [removal, setRemoval] = useState<NavigationAction | null>(null);
  const capturingRef = useRef(false);
  const mountedRef = useRef(true);
  const readyResolverRef = useRef<(() => void) | null>(null);
  const releaseAfterUnmountRef = useRef<(() => void) | null>(null);
  const dispatchedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      readyResolverRef.current?.();
      releaseAfterUnmountRef.current?.();
    };
  }, []);

  usePreventRemove(enabled && isLoggedIn && !removal, ({ data }) => {
    if (capturingRef.current) return;
    capturingRef.current = true;
    const session = getSessionSnapshot();
    const isCurrent = () => mountedRef.current && navigation.isFocused()
      && useAuthStore.getState().isLoggedIn && isSessionCurrent(session);

    void (async () => {
      let uri: string | null = null;
      try {
        uri = await captureTransitionSnapshot();
      } catch (error) {
        console.warn('[UnityExitGuard] Snapshot unavailable; using an opaque transition cover', error);
      }
      if (!isCurrent()) {
        if (uri) releaseTransitionSnapshot(uri);
        capturingRef.current = false;
        return;
      }

      let rootNavigation = navigation;
      while (rootNavigation.getParent()) rootNavigation = rootNavigation.getParent()!;
      const state = rootNavigation.getState()!;
      const ready = new Promise<void>((resolve) => { readyResolverRef.current = resolve; });
      let destinationReady = false;
      const releaseWhenFinished = () => {
        if (!destinationReady || mountedRef.current) return;
        // Let the outgoing native views' removal commit before uncovering the destination.
        requestAnimationFrame(() => {
          if (useUnityStore.getState().exitSnapshot?.onReady === snapshot.onReady) {
            useUnityStore.getState().setExitSnapshot(null);
          }
        });
      };
      const snapshot: UnityExitSnapshot = {
        uri,
        sourceRootRouteKey: state.routes[state.index]!.key,
        onReady: () => readyResolverRef.current?.(),
        onDestinationReady: () => {
          destinationReady = true;
          releaseWhenFinished();
        },
      };
      releaseAfterUnmountRef.current = releaseWhenFinished;
      useUnityStore.getState().setExitSnapshot(snapshot);
      await ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (!isCurrent()) {
        if (useUnityStore.getState().exitSnapshot?.onReady === snapshot.onReady) {
          useUnityStore.getState().setExitSnapshot(null);
        }
        capturingRef.current = false;
        return;
      }
      setRemoval(data.action);
    })();
  });

  useEffect(() => {
    if (removal && !dispatchedRef.current) {
      dispatchedRef.current = true;
      navigation.dispatch(removal);
    }
  }, [navigation, removal]);
};
