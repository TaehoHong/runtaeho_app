import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { UnityReadyEvent } from '../bridge/UnityBridge';
import { unitySessionController } from '../services/UnitySessionController';
import { useUnityStore } from '~/stores/unity/unityStore';

interface UseUnitySessionControllerResult {
  reattachToken: number;
  handleUnityReady: (event: UnityReadyEvent) => void;
  handleUnityError: (event: { nativeEvent?: { message?: string } }) => void;
}

export const useUnitySessionController = (): UseUnitySessionControllerResult => {
  const activeViewport = useUnityStore((state) => state.activeViewport);
  const reattachToken = useUnityStore((state) => state.reattachToken);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    unitySessionController.updateViewport(activeViewport);
  }, [activeViewport]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      unitySessionController.handleAppStateChange(previousState, nextState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleUnityReady = useCallback((event: UnityReadyEvent) => {
    unitySessionController.handleUnityReadyEvent(event?.nativeEvent ?? {});
  }, []);

  const handleUnityError = useCallback((event: { nativeEvent?: { message?: string } }) => {
    unitySessionController.handleUnityError(event?.nativeEvent?.message);
  }, []);

  return {
    reattachToken,
    handleUnityReady,
    handleUnityError,
  };
};
