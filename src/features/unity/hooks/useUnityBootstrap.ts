import { useCallback, useEffect, useRef, useState } from 'react';
import type { Item } from '~/features/avatar';
import { useUnityStore } from '~/stores/unity/unityStore';
import { unityService } from '../services/UnityService';
import { unitySessionController } from '../services/UnitySessionController';
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
const AVATAR_SYNC_RETRY_DELAY_MS = 300;
const REATTACH_RESYNC_RETRY_DELAY_MS = 300;
const REATTACH_READY_COOLDOWN_MS = 350;

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
  const readyEventVersion = useUnityStore((state) => state.lastUnityReadyEvent?.version ?? 0);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const hasSyncedSuccessfullyRef = useRef(false);
  const previousCanSendMessageRef = useRef(canSendMessage);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryScheduledRef = useRef(false);
  const reattachRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingReattachResyncRef = useRef(false);
  const reattachSyncInFlightRef = useRef(false);
  const lastReattachReadyAtRef = useRef(0);
  const attemptReattachResyncRef = useRef<() => void>(() => {});
  const lastHandledReadyEventVersionRef = useRef(
    useUnityStore.getState().lastUnityReadyEvent?.version ?? 0
  );

  const clearRetrySchedule = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryScheduledRef.current = false;
  }, []);

  const clearReattachRetrySchedule = useCallback(() => {
    if (reattachRetryTimerRef.current) {
      clearTimeout(reattachRetryTimerRef.current);
      reattachRetryTimerRef.current = null;
    }
  }, []);

  const scheduleReattachRetry = useCallback(() => {
    clearReattachRetrySchedule();
    reattachRetryTimerRef.current = setTimeout(() => {
      reattachRetryTimerRef.current = null;
      attemptReattachResyncRef.current();
    }, REATTACH_RESYNC_RETRY_DELAY_MS);
  }, [clearReattachRetrySchedule]);

  const attemptReattachResync = useCallback(() => {
    if (
      !pendingReattachResyncRef.current
      || reattachSyncInFlightRef.current
      || !hasSyncedSuccessfullyRef.current
      || !canSendMessage
    ) {
      return;
    }

    const payload = getInitialAvatarPayload();
    if (!payload) {
      pendingReattachResyncRef.current = false;
      return;
    }

    if (!unitySessionController.shouldSyncAvatarPayload(payload)) {
      clearReattachRetrySchedule();
      pendingReattachResyncRef.current = false;
      return;
    }

    reattachSyncInFlightRef.current = true;

    void unityService
      .syncAvatar(payload.items, payload.hairColor, { waitForReady: false })
      .then((result) => {
        if (result === 'failed') {
          console.warn('[useUnityBootstrap] reattach avatar sync failed, scheduling retry');
          scheduleReattachRetry();
          return;
        }

        clearReattachRetrySchedule();
        pendingReattachResyncRef.current = false;
      })
      .catch((error) => {
        console.warn('[useUnityBootstrap] reattach avatar sync error, scheduling retry:', error);
        scheduleReattachRetry();
      })
      .finally(() => {
        reattachSyncInFlightRef.current = false;
      });
  }, [
    canSendMessage,
    clearReattachRetrySchedule,
    getInitialAvatarPayload,
    scheduleReattachRetry,
  ]);

  const scheduleRetry = useCallback((requestId: number) => {
    clearRetrySchedule();
    retryScheduledRef.current = true;
    retryTimerRef.current = setTimeout(() => {
      if (requestIdRef.current !== requestId) {
        return;
      }
      retryScheduledRef.current = false;
      setBootstrapPhase('waiting-ready');
    }, AVATAR_SYNC_RETRY_DELAY_MS);
  }, [clearRetrySchedule]);

  useEffect(() => {
    attemptReattachResyncRef.current = attemptReattachResync;
  }, [attemptReattachResync]);

  const handleUnityReady = useCallback(
    (event: UnityReadyEvent) => {
      if (!hasSyncedSuccessfullyRef.current) {
        setBootstrapPhase('waiting-ready');
      }
      baseHandleUnityReady(event);

      if (event?.nativeEvent?.type === 'reattach') {
        const now = Date.now();
        if (now - lastReattachReadyAtRef.current < REATTACH_READY_COOLDOWN_MS) {
          return;
        }
        lastReattachReadyAtRef.current = now;
        pendingReattachResyncRef.current = true;
        attemptReattachResyncRef.current();
      }
    },
    [baseHandleUnityReady]
  );

  useEffect(() => {
    const readyEvent = useUnityStore.getState().lastUnityReadyEvent;
    if (!readyEvent || readyEvent.version === lastHandledReadyEventVersionRef.current) {
      return;
    }

    lastHandledReadyEventVersionRef.current = readyEvent.version;

    const nativeEvent: UnityReadyEvent['nativeEvent'] = {
      timestamp: readyEvent.timestamp,
      ...(typeof readyEvent.ready === 'boolean' ? { ready: readyEvent.ready } : {}),
      ...(readyEvent.message ? { message: readyEvent.message } : {}),
      ...(readyEvent.type ? { type: readyEvent.type } : {}),
      ...(typeof readyEvent.target === 'number' ? { target: readyEvent.target } : {}),
    };

    handleUnityReady({
      nativeEvent,
    });
  }, [handleUnityReady, readyEventVersion]);

  const resetBootstrap = useCallback(() => {
    requestIdRef.current += 1;
    inFlightRef.current = false;
    hasSyncedSuccessfullyRef.current = false;
    clearRetrySchedule();
    clearReattachRetrySchedule();
    pendingReattachResyncRef.current = false;
    reattachSyncInFlightRef.current = false;
    lastReattachReadyAtRef.current = 0;
    setIsInitialAvatarSynced(false);
    setBootstrapPhase('idle');
    reset();
  }, [clearReattachRetrySchedule, clearRetrySchedule, reset]);

  useEffect(() => {
    const wasCanSendMessage = previousCanSendMessageRef.current;
    previousCanSendMessageRef.current = canSendMessage;

    if (wasCanSendMessage && !canSendMessage) {
      requestIdRef.current += 1;
      inFlightRef.current = false;
      hasSyncedSuccessfullyRef.current = false;
      clearRetrySchedule();
      clearReattachRetrySchedule();
      reattachSyncInFlightRef.current = false;
      lastReattachReadyAtRef.current = 0;
      setIsInitialAvatarSynced(false);
      setBootstrapPhase('waiting-ready');
    }
  }, [canSendMessage, clearReattachRetrySchedule, clearRetrySchedule]);

  useEffect(() => {
    if (!pendingReattachResyncRef.current || !canSendMessage) {
      return;
    }

    attemptReattachResync();
  }, [attemptReattachResync, canSendMessage, getInitialAvatarPayload]);

  useEffect(() => {
    if (
      hasSyncedSuccessfullyRef.current
      || inFlightRef.current
      || retryScheduledRef.current
    ) {
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

    if (!unitySessionController.shouldSyncAvatarPayload(payload)) {
      clearRetrySchedule();
      hasSyncedSuccessfullyRef.current = true;
      setIsInitialAvatarSynced(true);
      setBootstrapPhase('done');
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

        if (result === 'failed') {
          setIsInitialAvatarSynced(false);
          setBootstrapPhase('error');
          scheduleRetry(requestId);
          return;
        }

        clearRetrySchedule();
        hasSyncedSuccessfullyRef.current = true;
        setIsInitialAvatarSynced(true);
        setBootstrapPhase('done');
      })
      .catch((error) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        console.error('[useUnityBootstrap] initial avatar sync failed:', error);
        setIsInitialAvatarSynced(false);
        setBootstrapPhase('error');
        scheduleRetry(requestId);
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        inFlightRef.current = false;
      });
  }, [bootstrapPhase, canSendMessage, clearRetrySchedule, getInitialAvatarPayload, scheduleRetry]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      inFlightRef.current = false;
      clearRetrySchedule();
      clearReattachRetrySchedule();
      pendingReattachResyncRef.current = false;
      reattachSyncInFlightRef.current = false;
      lastReattachReadyAtRef.current = 0;
    };
  }, [clearReattachRetrySchedule, clearRetrySchedule]);

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
