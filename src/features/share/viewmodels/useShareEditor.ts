/**
 * Share Editor ViewModel
 * 공유 에디터 화면의 비즈니스 로직을 담당하는 훅
 *
 * Sprint 1: Unity 뷰 전체 화면 + 배경 변경 연동
 * Sprint 2: 캐릭터 드래그/줌 (Unity API 확장 필요)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Platform, type View } from 'react-native';
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
import { shareService } from '../services/shareService';
import { unityService } from '~/features/unity/services/UnityService';
import { useUnityReadiness } from '~/features/unity/hooks';

// Unity Frustum 비율 보정 스케일 팩터 (SharePreviewCanvas와 동일)
// RN PREVIEW 좌표계와 Unity Viewport 좌표계 간의 비율 차이 보정
const UNITY_SCALE_FACTOR_X = 1.0;
const UNITY_SCALE_FACTOR_Y = 1.0;
import type { UnityReadyEvent } from '~/features/unity/bridge/UnityBridge';

// ★ 캐릭터 초기 위치/스케일 상수 (RN 좌표계 기준)
// 모든 초기화 로직에서 동일한 값을 사용하여 빨간 박스와 Unity 캐릭터 위치 동기화
const INITIAL_CHARACTER_X = 0.5;    // 화면 중앙
const INITIAL_CHARACTER_Y = 0.9;    // 화면 하단 (RN: 0=상단, 1=하단)
const INITIAL_CHARACTER_SCALE = 1;  // 기본 스케일

interface UseShareEditorProps {
  runningData: ShareRunningData;
}

interface UseShareEditorReturn {
  // State
  selectedBackground: BackgroundOption;
  selectedPose: PoseOption;
  statElements: StatElementConfig[];
  isLoading: boolean;
  isCapturing: boolean;
  isUnityReady: boolean;
  characterTransform: CharacterTransform;
  avatarVisible: boolean;
  animationTime: number;

  // Refs
  canvasRef: React.RefObject<View | null>;

  // Actions
  setSelectedBackground: (background: BackgroundOption) => Promise<void>;
  setSelectedPose: (pose: PoseOption) => void;
  updateStatTransform: (type: StatType, transform: ElementTransform) => void;
  toggleStatVisibility: (type: StatType) => void;
  toggleAvatarVisibility: () => void;
  shareResult: () => Promise<ShareResult>;
  saveToGallery: () => Promise<boolean>;
  resetAll: () => void;
  handleUnityReady: (event: UnityReadyEvent) => void;
  updateCharacterPosition: (x: number, y: number) => void;
  updateCharacterScale: (scale: number) => void;
  setAnimationTime: (time: number) => void;
}

/**
 * 이미지를 리사이즈하고 Base64로 변환
 * Unity 전송 전 이미지 크기 최적화
 */
const resizeImageToBase64 = async (
  uri: string,
  maxSize: number = 1080
): Promise<string> => {
  try {
    // 이미지 리사이즈
    const manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: maxSize, height: maxSize } }],
      { compress: 0.8, format: SaveFormat.JPEG }
    );

    // Base64로 읽기
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

/**
 * 공유 에디터 훅
 */
export const useShareEditor = ({ runningData }: UseShareEditorProps): UseShareEditorReturn => {
  // Canvas ref for capturing
  const canvasRef = useRef<View>(null);

  // State
  const [selectedBackground, setSelectedBackgroundState] = useState<BackgroundOption>(
    getDefaultBackground()
  );
  const [selectedPose, setSelectedPoseState] = useState<PoseOption>(DEFAULT_POSE);
  const [statElements, setStatElements] = useState<StatElementConfig[]>(INITIAL_STAT_ELEMENTS);
  const [isLoading, setIsLoading] = useState(true); // Unity Ready 대기 (iOS, Android)
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasInitializedUnity, setHasInitializedUnity] = useState(false);
  const [characterTransform, setCharacterTransform] = useState<CharacterTransform>({
    x: INITIAL_CHARACTER_X,
    y: INITIAL_CHARACTER_Y,    // Unity 초기화와 동일한 값 (화면 하단)
    scale: INITIAL_CHARACTER_SCALE,
  });
  const [avatarVisible, setAvatarVisible] = useState<boolean>(true);

  // 애니메이션 슬라이더 값 (0~1)
  const [animationTime, setAnimationTimeState] = useState(0);

  // ★ 포즈별 애니메이션 시간 저장 상태
  // 각 포즈(IDLE, MOVE, ATTACK, DAMAGED)마다 개별 슬라이더 값 유지
  const [poseAnimationTimes, setPoseAnimationTimes] = useState<Record<string, number>>({
    IDLE: 0,
    MOVE: 0,
    ATTACK: 0,
    DAMAGED: 0,
    DEATH: 0,
  });

  // throttle을 위한 마지막 호출 시간 ref
  const lastAnimationTimeCallRef = useRef(0);

  // 초기 배경/포즈 값을 ref로 저장 (초기화 시 최신 값 참조 방지)
  const initialBackgroundRef = useRef(getDefaultBackground());
  const initialPoseRef = useRef(DEFAULT_POSE);

  /**
   * Unity 준비 상태 관리 (Store 기반)
   * - waitForAvatar: false - GameObject만 준비되면 OK (아바타 로딩 불필요, 포즈 변경만 필요)
   * - timeout: 3000 - 3초 내 미준비 시 강제 ready 처리
   * - autoStart: false - Unity는 이미 실행 중이므로 자동 시작 불필요
   */
  const { isReady: isUnityReady, handleUnityReady, canSendMessage } = useUnityReadiness({
    waitForAvatar: false,
    timeout: 3000,
    autoStart: false,
  });

  /**
   * Unity 초기화 (배경/포즈 설정)
   * isUnityReady 또는 canSendMessage가 true가 되면 실행
   */
  useEffect(() => {
    const initializeUnity = async () => {
      if (!canSendMessage || hasInitializedUnity) {
        return;
      }

      console.log('[useShareEditor] Unity ready, initializing...');
      setHasInitializedUnity(true);

      try {
        const bg = initialBackgroundRef.current;
        const pose = initialPoseRef.current;

        // 기본 Unity 배경 설정
        if (bg.type === 'unity' && bg.unityBackgroundId) {
          await unityService.setBackground(bg.unityBackgroundId);
        }

        // 기본 포즈 설정 (달리기)
        await unityService.setCharacterMotion(pose.trigger as any);

        // ★ 초기 캐릭터 위치/스케일 설정 (RN 상태와 Unity 동기화)
        // Y축 반전: RN(0=상단) → Unity(0=하단)
        const unityY = 1 - INITIAL_CHARACTER_Y;
        await unityService.setCharacterPosition(INITIAL_CHARACTER_X, unityY);
        await unityService.setCharacterScale(INITIAL_CHARACTER_SCALE);
      } catch (error) {
        console.error('[useShareEditor] Failed to initialize Unity:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUnity();
  }, [canSendMessage, hasInitializedUnity]);


  /**
   * 화면 언마운트 시 Unity 상태 초기화
   * 공유 화면에서 변경된 배경/포즈/위치/스케일을 기본값으로 복원
   */
  useEffect(() => {
    return () => {
      // cleanup에서 Unity 상태 초기화 (iOS, Android)
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        console.log('[useShareEditor] Cleanup: Resetting Unity state');

        // 배경 초기화 (기본 배경으로)
        const defaultBg = getDefaultBackground();
        if (defaultBg.type === 'unity' && defaultBg.unityBackgroundId) {
          unityService.setBackground(defaultBg.unityBackgroundId)
            .catch(err => console.warn('[useShareEditor] Cleanup background failed:', err));
        }

        // 포즈 초기화 (달리기)
        unityService.setCharacterMotion(DEFAULT_POSE.trigger as any)
          .catch(err => console.warn('[useShareEditor] Cleanup motion failed:', err));

        // 위치/스케일 초기화
        // Y축 반전: RN(0=상단, 1=하단) → Unity(0=하단, 1=상단)
        const unityY = 1 - INITIAL_CHARACTER_Y;
        unityService.setCharacterPosition(INITIAL_CHARACTER_X, unityY)
          .catch(err => console.warn('[useShareEditor] Cleanup position failed:', err));
        unityService.setCharacterScale(INITIAL_CHARACTER_SCALE)
          .catch(err => console.warn('[useShareEditor] Cleanup scale failed:', err));
      }
    };
  }, []); // 빈 의존성 - 언마운트 시 한 번만 실행

  /**
   * 배경 선택 (Unity 배경 변경 포함)
   */
  const setSelectedBackground = useCallback(
    async (background: BackgroundOption) => {
      setSelectedBackgroundState(background);

      if (canSendMessage) {
        try {
          if (background.type === 'unity' && background.unityBackgroundId) {
            // Unity 사전정의 배경
            await unityService.setBackground(background.unityBackgroundId);
          } else if (background.type === 'photo' && background.photoUri) {
            // ★ 사용자 사진 배경 - Base64로 변환하여 Unity에 전송
            const base64Image = await resizeImageToBase64(background.photoUri);
            await unityService.setBackgroundFromPhoto(base64Image);
          } else if (background.type === 'color' && typeof background.source === 'string') {
            // 단색 배경
            await unityService.setBackgroundColor(background.source);
          }
        } catch (error) {
          console.error('[useShareEditor] Failed to change Unity background:', error);
        }
      }
    },
    [canSendMessage]
  );

  /**
   * 포즈 선택 및 Unity 업데이트 (슬라이더 모드용)
   * 포즈가 실제로 변경된 경우 해당 포즈에 저장된 애니메이션 시간으로 복원
   * 동일 포즈 재선택 시에는 슬라이더 값 유지
   */
  const setSelectedPose = useCallback(
    async (pose: PoseOption) => {
      // 포즈가 변경된 경우에만 애니메이션 시간 복원
      const poseChanged = selectedPose.id !== pose.id;

      setSelectedPoseState(pose);

      if (poseChanged) {
        // ★ 변경: 0으로 리셋 대신 저장된 값으로 복원
        const savedTime = poseAnimationTimes[pose.trigger] ?? 0;
        setAnimationTimeState(savedTime);
      }

      // Unity 캐릭터 포즈 변경 (슬라이더 모드)
      if (canSendMessage) {
        try {
          // 포즈 변경 또는 동일 포즈 재선택 모두 슬라이더 모드로 설정
          await unityService.setPoseForSlider(pose.trigger as any);

          // 포즈가 변경된 경우 저장된 애니메이션 시간으로 Unity도 복원
          if (poseChanged) {
            const savedTime = poseAnimationTimes[pose.trigger] ?? 0;
            await unityService.setAnimationNormalizedTime(savedTime);
          }
        } catch (error) {
          console.error('[useShareEditor] Failed to change pose:', error);
        }
      }
    },
    [selectedPose, canSendMessage, poseAnimationTimes]
  );

  /**
   * 캐릭터 위치 업데이트 (정규화 좌표)
   * RN PREVIEW 좌표 → Unity Viewport 좌표 변환:
   * 1. 스케일 보정: RN과 Unity의 Viewport 크기 차이 보정
   * 2. Y축 반전: RN(0=상단, 1=하단) → Unity(0=하단, 1=상단)
   */
  const updateCharacterPosition = useCallback(
    (x: number, y: number) => {
      setCharacterTransform((prev) => ({ ...prev, x, y }));

      if (canSendMessage) {
        // 중앙(0.5) 기준으로 스케일 보정 (RN PREVIEW → Unity Viewport)
        const scaledX = 0.5 + (x - 0.5) * UNITY_SCALE_FACTOR_X;
        const scaledY = 0.5 + (y - 0.5) * UNITY_SCALE_FACTOR_Y;

        // Y축 반전: RN 좌표계(0=상단) → Unity Viewport 좌표계(0=하단)
        const unityY = 1 - scaledY;

        unityService.setCharacterPosition(scaledX, unityY).catch((error) => {
          console.warn('[useShareEditor] Position update failed:', error);
        });
      }
    },
    [canSendMessage]
  );

  /**
   * 캐릭터 스케일 업데이트
   */
  const updateCharacterScale = useCallback(
    (scale: number) => {
      const clampedScale = Math.max(0.5, Math.min(2.5, scale));
      setCharacterTransform((prev) => ({ ...prev, scale: clampedScale }));

      if (canSendMessage) {
        unityService.setCharacterScale(clampedScale).catch((error) => {
          console.warn('[useShareEditor] Scale update failed:', error);
        });
      }
    },
    [canSendMessage]
  );

  /**
   * Throttled 애니메이션 시간 업데이트 (Unity 전송용)
   * ~60fps (16ms) 간격으로 Unity에 업데이트 전송
   */
  const throttledSetAnimationTime = useMemo(
    () => async (time: number) => {
      const now = Date.now();
      if (now - lastAnimationTimeCallRef.current < 16) {
        return; // 16ms 이내 호출은 무시 (~60fps)
      }
      lastAnimationTimeCallRef.current = now;

      if (canSendMessage) {
        try {
          await unityService.setAnimationNormalizedTime(time);
        } catch (error) {
          console.warn('[useShareEditor] Animation time update failed:', error);
        }
      }
    },
    [canSendMessage]
  );

  /**
   * 애니메이션 시간 설정 (슬라이더 조작용)
   * 상태 업데이트와 Unity 전송을 함께 수행
   * ★ 현재 포즈에 값을 저장하여 포즈 변경 시 복원 가능
   * @param time 0.0 ~ 1.0 범위의 정규화 시간
   */
  const setAnimationTime = useCallback(
    (time: number) => {
      setAnimationTimeState(time);
      // ★ 추가: 현재 포즈에 값 저장
      setPoseAnimationTimes((prev) => ({
        ...prev,
        [selectedPose.trigger]: time,
      }));
      throttledSetAnimationTime(time);
    },
    [throttledSetAnimationTime, selectedPose]
  );

  /**
   * 통계 요소 변환 업데이트
   */
  const updateStatTransform = useCallback((type: StatType, transform: ElementTransform) => {
    setStatElements((prev) =>
      prev.map((element) =>
        element.type === type ? { ...element, transform } : element
      )
    );
  }, []);

  /**
   * 통계 요소 가시성 토글
   */
  const toggleStatVisibility = useCallback((type: StatType) => {
    setStatElements((prev) =>
      prev.map((element) =>
        element.type === type ? { ...element, visible: !element.visible } : element
      )
    );
  }, []);

  /**
   * 아바타 표시/숨김 토글 (iOS Unity 캐릭터 제어)
   */
  const toggleAvatarVisibility = useCallback(async () => {
    const newVisible = !avatarVisible;
    setAvatarVisible(newVisible);

    // Unity 캐릭터 표시/숨김
    if (canSendMessage) {
      try {
        await unityService.setCharacterVisible(newVisible);
      } catch (error) {
        console.error('[useShareEditor] Failed to toggle avatar visibility:', error);
      }
    }
  }, [avatarVisible, canSendMessage]);

  /**
   * 캡처 후 공유
   */
  const shareResult = useCallback(async (): Promise<ShareResult> => {
    if (!canvasRef.current) {
      return {
        success: false,
        message: 'Canvas not ready',
      };
    }

    setIsCapturing(true);
    try {
      const distanceKm = (runningData.distance / 1000).toFixed(2);
      const message = `오늘 ${distanceKm}km 달렸어요! #RunTaeho #러닝`;

      return await shareService.captureAndShare(
        canvasRef,
        'RunTaeho 러닝 기록',
        message
      );
    } finally {
      setIsCapturing(false);
    }
  }, [runningData]);

  /**
   * 갤러리에 저장
   */
  const saveToGallery = useCallback(async (): Promise<boolean> => {
    if (!canvasRef.current) {
      return false;
    }

    setIsCapturing(true);
    try {
      const imageUri = await shareService.captureViewAsImage(canvasRef);
      return await shareService.saveToGallery(imageUri);
    } catch (error) {
      console.error('[useShareEditor] Save to gallery failed:', error);
      return false;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  /**
   * 모든 설정 초기화
   */
  const resetAll = useCallback(async () => {
    setStatElements(INITIAL_STAT_ELEMENTS);

    // 배경 초기화 (기본 배경으로)
    const defaultBg = getDefaultBackground();
    await setSelectedBackground(defaultBg);

    // 포즈 초기화
    await setSelectedPose(DEFAULT_POSE);

    // 아바타 표시 상태 초기화
    setAvatarVisible(true);

    // 애니메이션 시간 초기화
    setAnimationTimeState(0);

    // ★ 포즈별 애니메이션 시간도 초기화
    setPoseAnimationTimes({
      IDLE: 0,
      MOVE: 0,
      ATTACK: 0,
      DAMAGED: 0,
    });

    // 캐릭터 위치/스케일 초기화 (하단 중앙으로)
    setCharacterTransform({
      x: INITIAL_CHARACTER_X,
      y: INITIAL_CHARACTER_Y,
      scale: INITIAL_CHARACTER_SCALE,
    });
    if (canSendMessage) {
      try {
        // Y축 반전: RN 좌표계(0=상단) → Unity Viewport 좌표계(0=하단)
        const unityY = 1 - INITIAL_CHARACTER_Y;
        await unityService.setCharacterPosition(INITIAL_CHARACTER_X, unityY);
        await unityService.setCharacterScale(INITIAL_CHARACTER_SCALE);
        // 아바타 표시 상태 초기화
        await unityService.setCharacterVisible(true);
      } catch (error) {
        console.error('[useShareEditor] Failed to reset character transform:', error);
      }
    }
  }, [setSelectedBackground, setSelectedPose, canSendMessage]);

  return {
    // State
    selectedBackground,
    selectedPose,
    statElements,
    isLoading,
    isCapturing,
    isUnityReady,
    characterTransform,
    avatarVisible,
    animationTime,

    // Refs
    canvasRef,

    // Actions
    setSelectedBackground,
    setSelectedPose,
    updateStatTransform,
    toggleStatVisibility,
    toggleAvatarVisibility,
    shareResult,
    saveToGallery,
    resetAll,
    handleUnityReady,
    updateCharacterPosition,
    updateCharacterScale,
    setAnimationTime,
  };
};

export default useShareEditor;
