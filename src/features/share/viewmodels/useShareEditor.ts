/**
 * Share Editor ViewModel
 * 공유 에디터 화면이 사용하는 상태와 액션을 조합한다.
 */

import { useCallback, useRef } from 'react';
import type { View } from 'react-native';
import type {
  BackgroundOption,
  CharacterTransform,
  ElementTransform,
  PoseOption,
  ShareResult,
  ShareRunningData,
  StatElementConfig,
  StatType,
} from '../models/types';
import type { ViewBounds } from '../services/shareService';
import type { UnityReadyEvent } from '~/features/unity/bridge/UnityBridge';
import { useShareCaptureActions } from './useShareCaptureActions';
import { useShareEditorState } from './useShareEditorState';
import { useShareUnitySync } from './useShareUnitySync';

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
  setSelectedPose: (pose: PoseOption) => Promise<void>;
  updateStatTransform: (type: StatType, transform: ElementTransform) => void;
  toggleStatVisibility: (type: StatType) => void;
  toggleAvatarVisibility: () => void;
  shareResult: (
    exportStageRef: React.RefObject<View | null>,
    exportStageBounds?: ViewBounds
  ) => Promise<ShareResult>;
  resetAll: (options?: ResetAllOptions) => Promise<void>;
  restoreRunningResultDefaults: () => Promise<void>;
  handleUnityReady: (event: UnityReadyEvent) => void;
  updateCharacterPosition: (x: number, y: number) => void;
  updateCharacterScale: (scale: number) => void;
  setAnimationTime: (time: number) => void;
}

export const useShareEditor = ({ runningData }: UseShareEditorProps): UseShareEditorReturn => {
  const canvasRef = useRef<View>(null);
  const {
    selectedBackground,
    selectedPose,
    statElements,
    characterTransform,
    avatarVisible,
    animationTime,
    selectBackground,
    selectPose,
    updateStatTransform,
    toggleStatVisibility,
    toggleAvatarVisibility: toggleAvatarVisibilityState,
    updateCharacterPosition: updateCharacterPositionState,
    updateCharacterScale: updateCharacterScaleState,
    setAnimationTime: setAnimationTimeState,
    resetState,
  } = useShareEditorState();
  const {
    isLoading,
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
  } = useShareUnitySync({
    selectedBackground,
    selectedPose,
    characterTransform,
    avatarVisible,
    animationTime,
  });
  const { isCapturing, shareResult } = useShareCaptureActions({ runningData });

  const setSelectedBackground = useCallback(async (background: BackgroundOption) => {
    selectBackground(background);
    await syncBackground(background);
  }, [selectBackground, syncBackground]);

  const setSelectedPose = useCallback(async (pose: PoseOption) => {
    const poseChanged = selectedPose.id !== pose.id;
    const nextAnimationTime = selectPose(pose);

    await syncPose(
      pose,
      poseChanged ? nextAnimationTime : undefined
    );
  }, [selectPose, selectedPose.id, syncPose]);

  const updateCharacterPosition = useCallback((x: number, y: number) => {
    updateCharacterPositionState(x, y);
    syncCharacterPosition(x, y);
  }, [syncCharacterPosition, updateCharacterPositionState]);

  const updateCharacterScale = useCallback((scale: number) => {
    const nextScale = updateCharacterScaleState(scale);
    syncCharacterScale(nextScale);
  }, [syncCharacterScale, updateCharacterScaleState]);

  const toggleAvatarVisibility = useCallback(() => {
    const nextVisible = toggleAvatarVisibilityState();
    syncCharacterVisibility(nextVisible);
  }, [syncCharacterVisibility, toggleAvatarVisibilityState]);

  const setAnimationTime = useCallback((time: number) => {
    setAnimationTimeState(time);
    syncAnimationTime(time);
  }, [setAnimationTimeState, syncAnimationTime]);

  const resetAll = useCallback(async (options: ResetAllOptions = {}) => {
    const { syncUnity = true } = options;
    resetState();

    if (!syncUnity) {
      return;
    }

    await resetShareEditorUnityState();
  }, [resetShareEditorUnityState, resetState]);

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
    resetAll,
    restoreRunningResultDefaults,
    handleUnityReady,
    updateCharacterPosition,
    updateCharacterScale,
    setAnimationTime,
  };
};

export default useShareEditor;
