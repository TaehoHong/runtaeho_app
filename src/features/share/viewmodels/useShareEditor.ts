/**
 * Share Editor ViewModel
 * 공유 에디터 화면의 비즈니스 로직을 담당하는 훅
 *
 * 공유 화면은 전역 Unity host를 재사용하고,
 * 에디터는 live Unity scene에 직접 명령을 전달한다.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { type View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type {
  ShareRunningData,
  BackgroundOption,
  PoseOption,
  ElementTransform,
  StatElementConfig,
  StatType,
  ShareResult,
  CharacterTransform,
} from '../models/types';
import {
  DEFAULT_POSE,
  INITIAL_STAT_ELEMENTS,
  BACKGROUND_OPTIONS,
} from '../constants/shareOptions';
import { shareService, type ViewBounds } from '../services/shareService';
import type { UnityReadyEvent } from '~/features/unity/bridge/UnityBridge';
import { unityService } from '~/features/unity/services/UnityService';
import type { CharacterMotion } from '~/features/unity/types/UnityTypes';
import type { Item } from '~/features/avatar';
import { useUnityBootstrap } from '~/features/unity/hooks';
import { useUserStore } from '~/stores/user/userStore';

const UNITY_SCALE_FACTOR_X = 1.0;
const UNITY_SCALE_FACTOR_Y = 1.0;
const INITIAL_CHARACTER_X = 0.5;
const INITIAL_CHARACTER_Y = 0.9;
const INITIAL_CHARACTER_SCALE = 1;
const DEFAULT_POSE_ANIMATION_TIMES: Record<string, number> = {
  IDLE: 0,
  MOVE: 0,
  ATTACK: 0,
  DAMAGED: 0,
  DEATH: 0,
};
const VALID_POSE_MOTIONS: CharacterMotion[] = ['IDLE', 'MOVE', 'ATTACK', 'DAMAGED', 'DEATH'];

interface UseShareEditorProps {
  runningData: ShareRunningData;
}

interface ResetAllOptions {
  syncUnity?: boolean;
}

interface UseShareEditorReturn {
  selectedBackground: BackgroundOption;
  selectedPose: PoseOption;
  statElements: StatElementConfig[];
  isLoading: boolean;
  isCapturing: boolean;
  isUnityReady: boolean;
  characterTransform: CharacterTransform;
  avatarVisible: boolean;
  animationTime: number;
  canvasRef: React.RefObject<View | null>;
  setSelectedBackground: (background: BackgroundOption) => Promise<void>;
  setSelectedPose: (pose: PoseOption) => void;
  updateStatTransform: (type: StatType, transform: ElementTransform) => void;
  toggleStatVisibility: (type: StatType) => void;
  toggleAvatarVisibility: () => void;
  shareResult: (
    exportStageRef: React.RefObject<View | null>,
    exportStageBounds?: ViewBounds
  ) => Promise<ShareResult>;
  saveToGallery: (
    exportStageRef: React.RefObject<View | null>,
    exportStageBounds?: ViewBounds
  ) => Promise<boolean>;
  resetAll: (options?: ResetAllOptions) => Promise<void>;
  restoreRunningResultDefaults: () => Promise<void>;
  handleUnityReady: (event: UnityReadyEvent) => void;
  updateCharacterPosition: (x: number, y: number) => void;
  updateCharacterScale: (scale: number) => void;
  setAnimationTime: (time: number) => void;
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

    const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return base64;
  } catch (error) {
    console.error('[useShareEditor] resizeImageToBase64 error:', error);
    throw error;
  }
};

const getDefaultBackground = (): BackgroundOption => {
  return BACKGROUND_OPTIONS[0]!;
};

const toCharacterMotion = (trigger: string): CharacterMotion => {
  if (VALID_POSE_MOTIONS.includes(trigger as CharacterMotion)) {
    return trigger as CharacterMotion;
  }

  return 'IDLE';
};

export const useShareEditor = ({ runningData }: UseShareEditorProps): UseShareEditorReturn => {
  const canvasRef = useRef<View>(null);
  const currentUser = useUserStore((state) => state.currentUser);
  const equippedItems = useUserStore((state) => state.equippedItems);
  const hairColor = useUserStore((state) => state.hairColor);

  const [selectedBackground, setSelectedBackgroundState] = useState<BackgroundOption>(
    getDefaultBackground()
  );
  const [selectedPose, setSelectedPoseState] = useState<PoseOption>(DEFAULT_POSE);
  const [statElements, setStatElements] = useState<StatElementConfig[]>(INITIAL_STAT_ELEMENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasInitializedUnity, setHasInitializedUnity] = useState(false);
  const [characterTransform, setCharacterTransform] = useState<CharacterTransform>({
    x: INITIAL_CHARACTER_X,
    y: INITIAL_CHARACTER_Y,
    scale: INITIAL_CHARACTER_SCALE,
  });
  const [avatarVisible, setAvatarVisible] = useState(true);
  const [animationTime, setAnimationTimeState] = useState(0);
  const [poseAnimationTimes, setPoseAnimationTimes] = useState<Record<string, number>>(
    DEFAULT_POSE_ANIMATION_TIMES
  );

  const lastAnimationTimeCallRef = useRef(0);
  const initRequestIdRef = useRef(0);
  const isInitializingRef = useRef(false);
  const restoreInFlightRef = useRef<Promise<void> | null>(null);
  const hasRestoredDefaultsRef = useRef(false);

  const getInitialAvatarPayload = useCallback(() => {
    if (!currentUser) {
      return null;
    }

    const items = Object.values(equippedItems).filter(
      (item): item is Item => !!item
    );

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

  useEffect(() => {
    startUnity();
  }, [startUnity]);

  const applyBackgroundToUnity = useCallback(async (background: BackgroundOption) => {
    if (background.type === 'unity' && background.unityBackgroundId) {
      await unityService.setBackground(background.unityBackgroundId);
      return;
    }

    if (background.type === 'photo' && background.photoUri) {
      const base64Image = await resizeImageToBase64(background.photoUri);
      await unityService.setBackgroundFromPhoto(base64Image);
      return;
    }

    if (background.type === 'color' && typeof background.source === 'string') {
      await unityService.setBackgroundColor(background.source);
    }
  }, []);

  const applyDefaultUnityVisualState = useCallback(async () => {
    const defaultBackground = getDefaultBackground();
    const unityY = 1 - INITIAL_CHARACTER_Y;

    await applyBackgroundToUnity(defaultBackground);
    await unityService.setCharacterPosition(INITIAL_CHARACTER_X, unityY);
    await unityService.setCharacterScale(INITIAL_CHARACTER_SCALE);
    await unityService.setCharacterVisible(true);
  }, [applyBackgroundToUnity]);

  const applyDefaultShareEditorUnityState = useCallback(async () => {
    await applyDefaultUnityVisualState();
    await unityService.setPoseForSlider(toCharacterMotion(DEFAULT_POSE.trigger));
    await unityService.setAnimationNormalizedTime(0);
  }, [applyDefaultUnityVisualState]);

  useEffect(() => {
    const wasCanSendMessage = previousCanSendMessageRef.current;
    previousCanSendMessageRef.current = canSendMessage;

    if (wasCanSendMessage && !canSendMessage) {
      console.warn('[useShareEditor] Unity message channel disconnected - waiting for recovery');
      initRequestIdRef.current += 1;
      isInitializingRef.current = false;
      setHasInitializedUnity(false);
      setIsLoading(true);
    }
  }, [canSendMessage]);

  const runUnityInitialization = useCallback(
    async (requestId: number) => {
      const initialized = await unityService.runWhenReady(
        async () => {
          await applyBackgroundToUnity(selectedBackground);
          await unityService.setPoseForSlider(toCharacterMotion(selectedPose.trigger));
          await unityService.setAnimationNormalizedTime(animationTime);

          const unityY = 1 - characterTransform.y;
          await unityService.setCharacterPosition(characterTransform.x, unityY);
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
      console.error('[useShareEditor] Failed to restore running result defaults:', error);
      throw error;
    } finally {
      restoreInFlightRef.current = null;
    }
  }, [applyDefaultUnityVisualState]);

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
    setIsLoading(true);
    hasRestoredDefaultsRef.current = false;

    void runUnityInitialization(requestId)
      .catch((error) => {
        if (initRequestIdRef.current !== requestId) {
          return;
        }

        console.error('[useShareEditor] Failed to initialize Unity:', error);
      })
      .finally(() => {
        if (initRequestIdRef.current !== requestId) {
          return;
        }

        isInitializingRef.current = false;
        setIsLoading(false);
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
        console.warn('[useShareEditor] Running result restore retry failed on unmount:', error);
      });
    };
  }, [restoreRunningResultDefaults]);

  const setSelectedBackground = useCallback(
    async (background: BackgroundOption) => {
      setSelectedBackgroundState(background);

      if (!canSendMessage) {
        return;
      }

      try {
        await applyBackgroundToUnity(background);
      } catch (error) {
        console.error('[useShareEditor] Failed to change Unity background:', error);
      }
    },
    [applyBackgroundToUnity, canSendMessage]
  );

  const setSelectedPose = useCallback(
    async (pose: PoseOption) => {
      const poseChanged = selectedPose.id !== pose.id;

      setSelectedPoseState(pose);

      if (poseChanged) {
        const savedTime = poseAnimationTimes[pose.trigger] ?? 0;
        setAnimationTimeState(savedTime);
      }

      if (!canSendMessage) {
        return;
      }

      try {
        await unityService.setPoseForSlider(toCharacterMotion(pose.trigger));

        if (poseChanged) {
          const savedTime = poseAnimationTimes[pose.trigger] ?? 0;
          await unityService.setAnimationNormalizedTime(savedTime);
        }
      } catch (error) {
        console.error('[useShareEditor] Failed to change pose:', error);
      }
    },
    [canSendMessage, poseAnimationTimes, selectedPose.id]
  );

  const updateCharacterPosition = useCallback(
    (x: number, y: number) => {
      setCharacterTransform((prev) => ({ ...prev, x, y }));

      if (!canSendMessage) {
        return;
      }

      const scaledX = 0.5 + (x - 0.5) * UNITY_SCALE_FACTOR_X;
      const scaledY = 0.5 + (y - 0.5) * UNITY_SCALE_FACTOR_Y;
      const unityY = 1 - scaledY;

      unityService.setCharacterPosition(scaledX, unityY).catch((error) => {
        console.warn('[useShareEditor] Position update failed:', error);
      });
    },
    [canSendMessage]
  );

  const updateCharacterScale = useCallback(
    (scale: number) => {
      const clampedScale = Math.max(0.5, Math.min(2.5, scale));
      setCharacterTransform((prev) => ({ ...prev, scale: clampedScale }));

      if (!canSendMessage) {
        return;
      }

      unityService.setCharacterScale(clampedScale).catch((error) => {
        console.warn('[useShareEditor] Scale update failed:', error);
      });
    },
    [canSendMessage]
  );

  const throttledSetAnimationTime = useMemo(
    () => async (time: number) => {
      const now = Date.now();
      if (now - lastAnimationTimeCallRef.current < 16) {
        return;
      }

      lastAnimationTimeCallRef.current = now;

      if (!canSendMessage) {
        return;
      }

      try {
        await unityService.setAnimationNormalizedTime(time);
      } catch (error) {
        console.warn('[useShareEditor] Animation time update failed:', error);
      }
    },
    [canSendMessage]
  );

  const setAnimationTime = useCallback(
    (time: number) => {
      setAnimationTimeState(time);
      setPoseAnimationTimes((prev) => ({
        ...prev,
        [selectedPose.trigger]: time,
      }));
      void throttledSetAnimationTime(time);
    },
    [selectedPose.trigger, throttledSetAnimationTime]
  );

  const updateStatTransform = useCallback((type: StatType, transform: ElementTransform) => {
    setStatElements((prev) =>
      prev.map((element) =>
        element.type === type ? { ...element, transform } : element
      )
    );
  }, []);

  const toggleStatVisibility = useCallback((type: StatType) => {
    setStatElements((prev) =>
      prev.map((element) =>
        element.type === type ? { ...element, visible: !element.visible } : element
      )
    );
  }, []);

  const toggleAvatarVisibility = useCallback(() => {
    const newVisible = !avatarVisible;
    setAvatarVisible(newVisible);

    if (!canSendMessage) {
      return;
    }

    unityService.setCharacterVisible(newVisible).catch((error) => {
      console.error('[useShareEditor] Failed to toggle avatar visibility:', error);
    });
  }, [avatarVisible, canSendMessage]);

  const shareResult = useCallback(async (
    exportStageRef: React.RefObject<View | null>,
    exportStageBounds?: ViewBounds
  ): Promise<ShareResult> => {
    if (!exportStageRef.current) {
      return {
        success: false,
        message: 'Export stage not ready',
      };
    }

    setIsCapturing(true);
    try {
      const distanceKm = (runningData.distance / 1000).toFixed(2);
      const message = `오늘 ${distanceKm}km 달렸어요! #RunTaeho #러닝`;

      return await shareService.captureAndShare(
        exportStageRef,
        'RunTaeho 러닝 기록',
        message,
        exportStageBounds
      );
    } finally {
      setIsCapturing(false);
    }
  }, [runningData]);

  const saveToGallery = useCallback(async (
    exportStageRef: React.RefObject<View | null>,
    exportStageBounds?: ViewBounds
  ): Promise<boolean> => {
    if (!exportStageRef.current) {
      return false;
    }

    setIsCapturing(true);
    try {
      const imageUri = await shareService.captureViewAsImage(
        exportStageRef,
        exportStageBounds
      );
      return await shareService.saveToGallery(imageUri);
    } catch (error) {
      console.error('[useShareEditor] Save to gallery failed:', error);
      return false;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const resetAll = useCallback(async (options: ResetAllOptions = {}) => {
    const { syncUnity = true } = options;
    const defaultBg = getDefaultBackground();

    setStatElements(INITIAL_STAT_ELEMENTS);
    setSelectedBackgroundState(defaultBg);
    setSelectedPoseState(DEFAULT_POSE);
    setAvatarVisible(true);
    setAnimationTimeState(0);
    setPoseAnimationTimes(DEFAULT_POSE_ANIMATION_TIMES);
    setCharacterTransform({
      x: INITIAL_CHARACTER_X,
      y: INITIAL_CHARACTER_Y,
      scale: INITIAL_CHARACTER_SCALE,
    });

    if (!syncUnity || !canSendMessage) {
      return;
    }

    try {
      await applyDefaultShareEditorUnityState();
    } catch (error) {
      console.error('[useShareEditor] Failed to reset Unity state:', error);
    }
  }, [applyDefaultShareEditorUnityState, canSendMessage]);

  return {
    selectedBackground,
    selectedPose,
    statElements,
    isLoading,
    isCapturing,
    isUnityReady,
    characterTransform,
    avatarVisible,
    animationTime,
    canvasRef,
    setSelectedBackground,
    setSelectedPose,
    updateStatTransform,
    toggleStatVisibility,
    toggleAvatarVisibility,
    shareResult,
    saveToGallery,
    resetAll,
    restoreRunningResultDefaults,
    handleUnityReady,
    updateCharacterPosition,
    updateCharacterScale,
    setAnimationTime,
  };
};

export default useShareEditor;
