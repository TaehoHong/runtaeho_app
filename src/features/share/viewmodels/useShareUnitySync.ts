import { useCallback, useEffect, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type {
  BackgroundOption,
  CharacterTransform,
  PoseOption,
} from '../models/types';
import {
  DEFAULT_BACKGROUND,
  DEFAULT_POSE,
  INITIAL_CHARACTER_TRANSFORM,
} from '../constants/shareOptions';
import type { UnityReadyEvent } from '~/features/unity/bridge/UnityBridge';
import { useUnityBootstrap } from '~/features/unity/hooks';
import { unityService } from '~/features/unity/services/UnityService';
import type { CharacterMotion } from '~/features/unity/types/UnityTypes';
import type { Item } from '~/features/avatar';
import { useUnityStore } from '~/stores/unity/unityStore';
import { useUserStore } from '~/stores/user/userStore';
import { isShareSurfaceReady } from './shareUnitySurfaceReady';

const VALID_POSE_MOTIONS: CharacterMotion[] = ['IDLE', 'MOVE', 'ATTACK', 'DAMAGED', 'DEATH'];
const POSITION_UPDATE_INTERVAL_MS = 16;

interface UseShareUnitySyncOptions {
  selectedBackground: BackgroundOption;
  selectedPose: PoseOption;
  characterTransform: CharacterTransform;
  avatarVisible: boolean;
  animationTime: number;
}

interface UseShareUnitySyncValue {
  isLoading: boolean;
  isUnityReady: boolean;
  handleUnityReady: (event: UnityReadyEvent) => void;
  syncBackground: (background: BackgroundOption) => Promise<void>;
  syncPose: (pose: PoseOption, animationTime?: number) => Promise<void>;
  syncCharacterPosition: (x: number, y: number) => void;
  syncCharacterScale: (scale: number) => void;
  syncCharacterVisibility: (visible: boolean) => void;
  syncAnimationTime: (time: number) => void;
  resetShareEditorUnityState: () => Promise<void>;
  restoreRunningResultDefaults: () => Promise<void>;
}

const resizeImageToBase64 = async (
  uri: string,
  maxSize: number = 1080
): Promise<string> => {
  try {
    const manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: maxSize, height: maxSize } }],
      { compress: 0.8, format: SaveFormat.JPEG }
    );

    return await FileSystem.readAsStringAsync(manipResult.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (error) {
    console.error('[useShareUnitySync] resizeImageToBase64 error:', error);
    throw error;
  }
};

const toCharacterMotion = (trigger: string): CharacterMotion => {
  if (VALID_POSE_MOTIONS.includes(trigger as CharacterMotion)) {
    return trigger as CharacterMotion;
  }

  return 'IDLE';
};

export const useShareUnitySync = ({
  selectedBackground,
  selectedPose,
  characterTransform,
  avatarVisible,
  animationTime,
}: UseShareUnitySyncOptions): UseShareUnitySyncValue => {
  const currentUser = useUserStore((state) => state.currentUser);
  const equippedItems = useUserStore((state) => state.equippedItems);
  const hairColor = useUserStore((state) => state.hairColor);

  const [isInitializing, setIsInitializing] = useState(true);
  const [hasInitializedUnity, setHasInitializedUnity] = useState(false);
  const [hasRenderedShareSurface, setHasRenderedShareSurface] = useState(false);
  const lastAnimationTimeCallRef = useRef(0);
  const initRequestIdRef = useRef(0);
  const isInitializingRef = useRef(false);
  const restoreInFlightRef = useRef<Promise<void> | null>(null);
  const hasRestoredDefaultsRef = useRef(false);

  const getInitialAvatarPayload = useCallback(() => {
    if (!currentUser) {
      return null;
    }

    const items = Object.values(equippedItems).filter((item): item is Item => !!item);

    return {
      items,
      hairColor,
    };
  }, [currentUser, equippedItems, hairColor]);

  const {
    isReady: isUnityReady,
    handleUnityReady,
    canSendMessage,
    isInitialAvatarSynced,
    startUnity,
  } = useUnityBootstrap({
    waitForAvatar: false,
    timeout: 3000,
    autoStart: false,
    getInitialAvatarPayload,
  });

  const previousCanSendMessageRef = useRef(canSendMessage);
  const isSurfaceVisible = useUnityStore((state) => state.isSurfaceVisible);
  const activeViewport = useUnityStore((state) => state.activeViewport);
  const renderedViewport = useUnityStore((state) => state.renderedViewport);

  useEffect(() => {
    startUnity();
  }, [startUnity]);

  const applyBackgroundToUnity = useCallback(async (background: BackgroundOption) => {
    if (background.type === 'unity' && background.unityBackgroundId) {
      await unityService.setBackground(background.unityBackgroundId);
      return;
    }

    if (background.type === 'photo' && background.photoUri) {
      await unityService.setBackgroundFromPhoto(
        await resizeImageToBase64(background.photoUri)
      );
      return;
    }

    if (background.type === 'color' && typeof background.source === 'string') {
      await unityService.setBackgroundColor(background.source);
    }
  }, []);

  const applyDefaultUnityVisualState = useCallback(async () => {
    await applyBackgroundToUnity(DEFAULT_BACKGROUND);
    await unityService.setCharacterPosition(
      INITIAL_CHARACTER_TRANSFORM.x,
      1 - INITIAL_CHARACTER_TRANSFORM.y
    );
    await unityService.setCharacterScale(INITIAL_CHARACTER_TRANSFORM.scale);
    await unityService.setCharacterVisible(true);
  }, [applyBackgroundToUnity]);

  const applyDefaultShareEditorUnityState = useCallback(async () => {
    await applyDefaultUnityVisualState();
    await unityService.setPoseForSlider(toCharacterMotion(DEFAULT_POSE.trigger));
    await unityService.setAnimationNormalizedTime(0);
  }, [applyDefaultUnityVisualState]);

  const runUnityInitialization = useCallback(
    async (requestId: number) => {
      const initialized = await unityService.runWhenReady(
        async () => {
          await applyBackgroundToUnity(selectedBackground);
          await unityService.setPoseForSlider(toCharacterMotion(selectedPose.trigger));
          await unityService.setAnimationNormalizedTime(animationTime);
          await unityService.setCharacterPosition(
            characterTransform.x,
            1 - characterTransform.y
          );
          await unityService.setCharacterScale(characterTransform.scale);
          await unityService.setCharacterVisible(avatarVisible);
        },
        { waitForAvatar: false, timeoutMs: 3000, forceReadyOnTimeout: true }
      );

      if (initRequestIdRef.current !== requestId) {
        return;
      }

      if (initialized) {
        setHasInitializedUnity(true);
      }
    },
    [
      animationTime,
      applyBackgroundToUnity,
      avatarVisible,
      characterTransform,
      selectedBackground,
      selectedPose.trigger,
    ]
  );

  const restoreRunningResultDefaults = useCallback(async () => {
    if (hasRestoredDefaultsRef.current) {
      return;
    }

    if (restoreInFlightRef.current) {
      await restoreInFlightRef.current;
      return;
    }

    const restoreTask = (async () => {
      const restored = await unityService.runWhenReady(
        async () => {
          await applyDefaultUnityVisualState();
          await unityService.stopCharacter();
        },
        { waitForAvatar: false, timeoutMs: 3000, forceReadyOnTimeout: true }
      );

      if (!restored) {
        throw new Error('Failed to restore running result defaults');
      }
    })();

    restoreInFlightRef.current = restoreTask;

    try {
      await restoreTask;
      hasRestoredDefaultsRef.current = true;
    } catch (error) {
      console.error('[useShareUnitySync] Failed to restore running result defaults:', error);
      throw error;
    } finally {
      restoreInFlightRef.current = null;
    }
  }, [applyDefaultUnityVisualState]);

  useEffect(() => {
    const wasCanSendMessage = previousCanSendMessageRef.current;
    previousCanSendMessageRef.current = canSendMessage;

    if (wasCanSendMessage && !canSendMessage) {
      console.warn('[useShareUnitySync] Unity message channel disconnected - waiting for recovery');
      initRequestIdRef.current += 1;
      isInitializingRef.current = false;
      setHasInitializedUnity(false);
      setHasRenderedShareSurface(false);
      setIsInitializing(true);
    }
  }, [canSendMessage]);

  useEffect(() => {
    if (
      !canSendMessage
      || !isInitialAvatarSynced
      || hasInitializedUnity
      || isInitializingRef.current
    ) {
      return;
    }

    const requestId = initRequestIdRef.current + 1;
    initRequestIdRef.current = requestId;
    isInitializingRef.current = true;
    setIsInitializing(true);
    hasRestoredDefaultsRef.current = false;

    void runUnityInitialization(requestId)
      .catch((error) => {
        if (initRequestIdRef.current !== requestId) {
          return;
        }

        console.error('[useShareUnitySync] Failed to initialize Unity:', error);
      })
      .finally(() => {
        if (initRequestIdRef.current !== requestId) {
          return;
        }

        isInitializingRef.current = false;
        setIsInitializing(false);
      });
  }, [
    canSendMessage,
    hasInitializedUnity,
    isInitialAvatarSynced,
    runUnityInitialization,
  ]);

  useEffect(() => {
    return () => {
      initRequestIdRef.current += 1;
      isInitializingRef.current = false;

      void restoreRunningResultDefaults().catch((error) => {
        console.warn('[useShareUnitySync] Running result restore retry failed on unmount:', error);
      });
    };
  }, [restoreRunningResultDefaults]);

  const syncBackground = useCallback(async (background: BackgroundOption) => {
    if (!canSendMessage) {
      return;
    }

    try {
      await applyBackgroundToUnity(background);
    } catch (error) {
      console.error('[useShareUnitySync] Failed to change Unity background:', error);
    }
  }, [applyBackgroundToUnity, canSendMessage]);

  const syncPose = useCallback(
    async (pose: PoseOption, nextAnimationTime?: number) => {
      if (!canSendMessage) {
        return;
      }

      try {
        await unityService.setPoseForSlider(toCharacterMotion(pose.trigger));

        if (typeof nextAnimationTime === 'number') {
          await unityService.setAnimationNormalizedTime(nextAnimationTime);
        }
      } catch (error) {
        console.error('[useShareUnitySync] Failed to change pose:', error);
      }
    },
    [canSendMessage]
  );

  const syncCharacterPosition = useCallback((x: number, y: number) => {
    if (!canSendMessage) {
      return;
    }

    unityService.setCharacterPosition(x, 1 - y).catch((error) => {
      console.warn('[useShareUnitySync] Position update failed:', error);
    });
  }, [canSendMessage]);

  const syncCharacterScale = useCallback((scale: number) => {
    if (!canSendMessage) {
      return;
    }

    unityService.setCharacterScale(scale).catch((error) => {
      console.warn('[useShareUnitySync] Scale update failed:', error);
    });
  }, [canSendMessage]);

  const syncCharacterVisibility = useCallback((visible: boolean) => {
    if (!canSendMessage) {
      return;
    }

    unityService.setCharacterVisible(visible).catch((error) => {
      console.error('[useShareUnitySync] Failed to toggle avatar visibility:', error);
    });
  }, [canSendMessage]);

  const syncAnimationTime = useCallback((time: number) => {
    const now = Date.now();
    if (now - lastAnimationTimeCallRef.current < POSITION_UPDATE_INTERVAL_MS) {
      return;
    }

    lastAnimationTimeCallRef.current = now;

    if (!canSendMessage) {
      return;
    }

    unityService.setAnimationNormalizedTime(time).catch((error) => {
      console.warn('[useShareUnitySync] Animation time update failed:', error);
    });
  }, [canSendMessage]);

  const resetShareEditorUnityState = useCallback(async () => {
    if (!canSendMessage) {
      return;
    }

    try {
      await applyDefaultShareEditorUnityState();
    } catch (error) {
      console.error('[useShareUnitySync] Failed to reset Unity state:', error);
    }
  }, [applyDefaultShareEditorUnityState, canSendMessage]);

  const shareSurfaceReady = isShareSurfaceReady(
    activeViewport,
    renderedViewport,
    isSurfaceVisible
  );

  useEffect(() => {
    if (!shareSurfaceReady) {
      return;
    }

    setHasRenderedShareSurface(true);
  }, [shareSurfaceReady]);

  return {
    isLoading: isInitializing || !hasRenderedShareSurface,
    isUnityReady,
    handleUnityReady,
    syncBackground,
    syncPose,
    syncCharacterPosition,
    syncCharacterScale,
    syncCharacterVisibility,
    syncAnimationTime,
    resetShareEditorUnityState,
    restoreRunningResultDefaults,
  };
};
