import { useCallback, useEffect, useRef, useState } from 'react';
import type { Item } from '~/features/avatar';
import { unityService } from '../services/UnityService';
import type { UnityReadyEvent } from '../bridge/UnityBridge';
import {
  useUnityReadiness,
  type UseUnityReadinessOptions,
} from './useUnityReadiness';

export type UnityBootstrapPhase =
  | 'idle'
  | 'waiting-ready'
  | 'waiting-payload'
  | 'syncing-avatar'
  | 'done'
  | 'error';

export type InitialAvatarPayload = { items: Item[]; hairColor?: string } | null;

export interface UseUnityBootstrapOptions extends UseUnityReadinessOptions {
  getInitialAvatarPayload?: () => InitialAvatarPayload;
}

export interface UseUnityBootstrapResult {
  bootstrapPhase: UnityBootstrapPhase;
  isInitialAvatarSynced: boolean;
  isReady: boolean;
  isAvatarApplied: boolean;
  canSendMessage: boolean;
  isUnityStarted: boolean;
  isUnityAvailable: boolean;
  handleUnityReady: (event: UnityReadyEvent) => void;
  startUnity: () => void;
  reset: () => void;
}

export const useUnityBootstrap = (
  options: UseUnityBootstrapOptions = {}
): UseUnityBootstrapResult => {
  const {
    getInitialAvatarPayload = () => null,
    ...readinessOptions
  } = options;

  const {
    isReady,
    isAvatarApplied,
    canSendMessage,
    isUnityStarted,
    isUnityAvailable,
    handleUnityReady: baseHandleUnityReady,
    startUnity,
    reset,
  } = useUnityReadiness(readinessOptions);

  const [bootstrapPhase, setBootstrapPhase] = useState<UnityBootstrapPhase>('idle');
  const [isInitialAvatarSynced, setIsInitialAvatarSynced] = useState(false);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const hasSyncedOnceRef = useRef(false);
  const previousCanSendMessageRef = useRef(canSendMessage);

  const handleUnityReady = useCallback(
    (event: UnityReadyEvent) => {
      setBootstrapPhase('waiting-ready');
      baseHandleUnityReady(event);
    },
    [baseHandleUnityReady]
  );

  const resetBootstrap = useCallback(() => {
    requestIdRef.current += 1;
    inFlightRef.current = false;
    hasSyncedOnceRef.current = false;
    setIsInitialAvatarSynced(false);
    setBootstrapPhase('idle');
    reset();
  }, [reset]);

  useEffect(() => {
    const wasCanSendMessage = previousCanSendMessageRef.current;
    previousCanSendMessageRef.current = canSendMessage;

    if (wasCanSendMessage && !canSendMessage) {
      requestIdRef.current += 1;
      inFlightRef.current = false;
      hasSyncedOnceRef.current = false;
      setIsInitialAvatarSynced(false);
      setBootstrapPhase('waiting-ready');
    }
  }, [canSendMessage]);

  useEffect(() => {
    if (hasSyncedOnceRef.current || inFlightRef.current) {
      return;
    }

    if (!canSendMessage) {
      if (bootstrapPhase !== 'idle') {
        setBootstrapPhase('waiting-ready');
      }
      return;
    }

    const payload = getInitialAvatarPayload();
    if (!payload) {
      setBootstrapPhase('waiting-payload');
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    inFlightRef.current = true;
    setBootstrapPhase('syncing-avatar');

    void unityService
      .syncAvatar(payload.items, payload.hairColor, { waitForReady: false })
      .then((result) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        hasSyncedOnceRef.current = true;
        if (result === 'failed') {
          setIsInitialAvatarSynced(false);
          setBootstrapPhase('error');
          return;
        }

        setIsInitialAvatarSynced(true);
        setBootstrapPhase('done');
      })
      .catch((error) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        console.error('[useUnityBootstrap] initial avatar sync failed:', error);
        hasSyncedOnceRef.current = true;
        setIsInitialAvatarSynced(false);
        setBootstrapPhase('error');
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        inFlightRef.current = false;
      });
  }, [bootstrapPhase, canSendMessage, getInitialAvatarPayload]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      inFlightRef.current = false;
    };
  }, []);

  return {
    bootstrapPhase,
    isInitialAvatarSynced,
    isReady,
    isAvatarApplied,
    canSendMessage,
    isUnityStarted,
    isUnityAvailable,
    handleUnityReady,
    startUnity,
    reset: resetBootstrap,
  };
};
