import { useCallback, useState } from 'react';
import type {
  BackgroundOption,
  CharacterTransform,
  ElementTransform,
  PoseOption,
  StatElementConfig,
  StatType,
} from '../models/types';
import { SCALE_RANGES, createInitialShareEditorState } from '../constants/shareOptions';

type ShareEditorInitialState = ReturnType<typeof createInitialShareEditorState>;

export interface UseShareEditorStateValue {
  selectedBackground: BackgroundOption;
  selectedPose: PoseOption;
  statElements: StatElementConfig[];
  characterTransform: CharacterTransform;
  avatarVisible: boolean;
  animationTime: number;
  selectBackground: (background: BackgroundOption) => void;
  selectPose: (pose: PoseOption) => number;
  updateStatTransform: (type: StatType, transform: ElementTransform) => void;
  toggleStatVisibility: (type: StatType) => void;
  toggleAvatarVisibility: () => boolean;
  updateCharacterPosition: (x: number, y: number) => void;
  updateCharacterScale: (scale: number) => number;
  setAnimationTime: (time: number) => void;
  resetState: () => ShareEditorInitialState;
}

export const useShareEditorState = (): UseShareEditorStateValue => {
  const [selectedBackground, setSelectedBackground] = useState<BackgroundOption>(
    () => createInitialShareEditorState().selectedBackground
  );
  const [selectedPose, setSelectedPose] = useState<PoseOption>(
    () => createInitialShareEditorState().selectedPose
  );
  const [statElements, setStatElements] = useState<StatElementConfig[]>(
    () => createInitialShareEditorState().statElements
  );
  const [characterTransform, setCharacterTransform] = useState<CharacterTransform>(
    () => createInitialShareEditorState().characterTransform
  );
  const [avatarVisible, setAvatarVisible] = useState<boolean>(
    () => createInitialShareEditorState().avatarVisible
  );
  const [animationTime, setAnimationTimeState] = useState<number>(
    () => createInitialShareEditorState().animationTime
  );
  const [poseAnimationTimes, setPoseAnimationTimes] = useState<Record<string, number>>(
    () => createInitialShareEditorState().poseAnimationTimes
  );

  const selectBackground = useCallback((background: BackgroundOption) => {
    setSelectedBackground(background);
  }, []);

  const selectPose = useCallback(
    (pose: PoseOption): number => {
      const nextAnimationTime =
        selectedPose.id === pose.id
          ? animationTime
          : (poseAnimationTimes[pose.trigger] ?? 0);

      setSelectedPose(pose);

      if (selectedPose.id !== pose.id) {
        setAnimationTimeState(nextAnimationTime);
      }

      return nextAnimationTime;
    },
    [animationTime, poseAnimationTimes, selectedPose.id]
  );

  const updateStatTransform = useCallback((type: StatType, transform: ElementTransform) => {
    setStatElements((previousElements) =>
      previousElements.map((element) =>
        element.type === type ? { ...element, transform } : element
      )
    );
  }, []);

  const toggleStatVisibility = useCallback((type: StatType) => {
    setStatElements((previousElements) =>
      previousElements.map((element) =>
        element.type === type ? { ...element, visible: !element.visible } : element
      )
    );
  }, []);

  const toggleAvatarVisibility = useCallback((): boolean => {
    const nextVisible = !avatarVisible;
    setAvatarVisible(nextVisible);
    return nextVisible;
  }, [avatarVisible]);

  const updateCharacterPosition = useCallback((x: number, y: number) => {
    setCharacterTransform((previousTransform) => ({ ...previousTransform, x, y }));
  }, []);

  const updateCharacterScale = useCallback((scale: number): number => {
    const clampedScale = Math.max(
      SCALE_RANGES.character.min,
      Math.min(SCALE_RANGES.character.max, scale)
    );

    setCharacterTransform((previousTransform) => ({
      ...previousTransform,
      scale: clampedScale,
    }));

    return clampedScale;
  }, []);

  const setAnimationTime = useCallback(
    (time: number) => {
      setAnimationTimeState(time);
      setPoseAnimationTimes((previousTimes) => ({
        ...previousTimes,
        [selectedPose.trigger]: time,
      }));
    },
    [selectedPose.trigger]
  );

  const resetState = useCallback(() => {
    const initialState = createInitialShareEditorState();

    setSelectedBackground(initialState.selectedBackground);
    setSelectedPose(initialState.selectedPose);
    setStatElements(initialState.statElements);
    setCharacterTransform(initialState.characterTransform);
    setAvatarVisible(initialState.avatarVisible);
    setAnimationTimeState(initialState.animationTime);
    setPoseAnimationTimes(initialState.poseAnimationTimes);

    return initialState;
  }, []);

  return {
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
    toggleAvatarVisibility,
    updateCharacterPosition,
    updateCharacterScale,
    setAnimationTime,
    resetState,
  };
};
