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
import { isShareSurfaceAttached } from './shareUnitySurfaceReady';

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
  syncCharacterRotation: (rotation: number) => void;
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

    try {
      return await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } finally {
      if (manipResult.uri !== uri) {
        await FileSystem.deleteAsync(manipResult.uri, { idempotent: true }).catch(() => {
          console.warn('[useShareUnitySync] Failed to remove resized background');
        });
      }
    }
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
  const lastAnimationTimeCallRef = useRef(0);
  const initRequestIdRef = useRef(0);
  const isInitializingRef = useRef(false);
  const restoreInFlightRef = useRef<Promise<void> | null>(null);
  const hasRestoredDefaultsRef = useRef(false);
  const backgroundRequestIdRef = useRef(0);
  const visualOperationIdRef = useRef(0);
  const latestVisualStateRef = useRef({ selectedPose, characterTransform, avatarVisible, animationTime });
  latestVisualStateRef.current = { selectedPose, characterTransform, avatarVisible, animationTime };

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

  const applyBackgroundToUnity = useCallback(async (background: BackgroundOption, requestId = backgroundRequestIdRef.current) => {
    if (requestId !== backgroundRequestIdRef.current) return;
    if (background.type === 'unity' && background.unityBackgroundId) {
      await unityService.setBackground(background.unityBackgroundId);
      return;
    }

    if (background.type === 'photo' && background.photoUri) {
      const photo = await resizeImageToBase64(background.photoUri);
      if (requestId !== backgroundRequestIdRef.current) return;
      await unityService.setBackgroundFromPhoto(photo);
      return;
    }

    if (background.type === 'color' && typeof background.source === 'string') {
      await unityService.setBackgroundColor(background.source);
    }
  }, []);

  const applyDefaultUnityVisualState = useCallback(async (operationId = visualOperationIdRef.current) => {
    const assertCurrent = () => {
      if (operationId !== visualOperationIdRef.current) throw new Error('Unity visual operation superseded');
    };
    assertCurrent();
    await applyBackgroundToUnity(DEFAULT_BACKGROUND);
    assertCurrent();
    await unityService.setCharacterPosition(
      INITIAL_CHARACTER_TRANSFORM.x,
      1 - INITIAL_CHARACTER_TRANSFORM.y
    );
    assertCurrent();
    await unityService.setCharacterScale(INITIAL_CHARACTER_TRANSFORM.scale);
    assertCurrent();
    await unityService.setCharacterRotation(INITIAL_CHARACTER_TRANSFORM.rotation ?? 0);
    assertCurrent();
    await unityService.setCharacterVisible(true);
  }, [applyBackgroundToUnity]);

  const applyDefaultShareEditorUnityState = useCallback(async () => {
    const operationId = visualOperationIdRef.current;
    await applyDefaultUnityVisualState(operationId);
    if (operationId !== visualOperationIdRef.current) return;
    await unityService.setPoseForSlider(toCharacterMotion(DEFAULT_POSE.trigger));
    if (operationId !== visualOperationIdRef.current) return;
    await unityService.setAnimationNormalizedTime(0);
  }, [applyDefaultUnityVisualState]);

  const runUnityInitialization = useCallback(
    async (requestId: number) => {
      const operationId = visualOperationIdRef.current;
      const backgroundRequestId = backgroundRequestIdRef.current;
      const isCurrent = () => operationId === visualOperationIdRef.current;
      const initialized = await unityService.runWhenReady(
        async () => {
          if (!isCurrent()) return;
          await applyBackgroundToUnity(selectedBackground, backgroundRequestId);
          if (!isCurrent()) return;
          await unityService.setPoseForSlider(toCharacterMotion(latestVisualStateRef.current.selectedPose.trigger));
          if (!isCurrent()) return;
          await unityService.setAnimationNormalizedTime(latestVisualStateRef.current.animationTime);
          if (!isCurrent()) return;
          await unityService.setCharacterPosition(
            latestVisualStateRef.current.characterTransform.x,
            1 - latestVisualStateRef.current.characterTransform.y
          );
          if (!isCurrent()) return;
          await unityService.setCharacterScale(latestVisualStateRef.current.characterTransform.scale);
          if (!isCurrent()) return;
          await unityService.setCharacterRotation(latestVisualStateRef.current.characterTransform.rotation ?? 0);
          if (!isCurrent()) return;
          await unityService.setCharacterVisible(latestVisualStateRef.current.avatarVisible);
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
      applyBackgroundToUnity,
      selectedBackground,
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

    backgroundRequestIdRef.current += 1;
    const operationId = ++visualOperationIdRef.current;
    const restoreTask = (async () => {
      const restored = await unityService.runWhenReady(
        async () => {
          await applyDefaultUnityVisualState(operationId);
          if (operationId !== visualOperationIdRef.current) throw new Error('Unity restore superseded');
          await unityService.stopCharacter();
        },
        { waitForAvatar: false, timeoutMs: 3000, forceReadyOnTimeout: true }
      );

      if (!restored || operationId !== visualOperationIdRef.current) {
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
      backgroundRequestIdRef.current += 1;
      visualOperationIdRef.current += 1;
      isInitializingRef.current = false;
      setHasInitializedUnity(false);
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
      backgroundRequestIdRef.current += 1;
      visualOperationIdRef.current += 1;
      isInitializingRef.current = false;

      void restoreRunningResultDefaults().catch((error) => {
        console.warn('[useShareUnitySync] Running result restore retry failed on unmount:', error);
      });
    };
  }, [restoreRunningResultDefaults]);

  const syncBackground = useCallback(async (background: BackgroundOption) => {
    const requestId = ++backgroundRequestIdRef.current;
    if (restoreInFlightRef.current) visualOperationIdRef.current += 1;
    hasRestoredDefaultsRef.current = false;
    if (!canSendMessage) {
      return;
    }

    try {
      await applyBackgroundToUnity(background, requestId);
    } catch (error) {
      console.error('[useShareUnitySync] Failed to change Unity background:', error);
    }
  }, [applyBackgroundToUnity, canSendMessage]);

  const syncPose = useCallback(
    async (pose: PoseOption, nextAnimationTime?: number) => {
      if (!canSendMessage) {
        return;
      }

      const operationId = visualOperationIdRef.current;
      try {
        await unityService.setPoseForSlider(toCharacterMotion(pose.trigger));
        if (operationId !== visualOperationIdRef.current) return;

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

  const syncCharacterRotation = useCallback((rotation: number) => {
    if (!canSendMessage) {
      return;
    }

    unityService.setCharacterRotation(rotation).catch((error) => {
      console.warn('[useShareUnitySync] Rotation update failed:', error);
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
    backgroundRequestIdRef.current += 1;
    visualOperationIdRef.current += 1;
    if (!canSendMessage) {
      return;
    }

    try {
      await applyDefaultShareEditorUnityState();
    } catch (error) {
      console.error('[useShareUnitySync] Failed to reset Unity state:', error);
    }
  }, [applyDefaultShareEditorUnityState, canSendMessage]);

  const shareSurfaceAttached = isShareSurfaceAttached(
    activeViewport,
    renderedViewport,
    isSurfaceVisible
  );

  return {
    isLoading: isInitializing || !shareSurfaceAttached,
    isUnityReady,
    handleUnityReady,
    syncBackground,
    syncPose,
    syncCharacterPosition,
    syncCharacterScale,
    syncCharacterRotation,
    syncCharacterVisibility,
    syncAnimationTime,
    resetShareEditorUnityState,
    restoreRunningResultDefaults,
  };
};
