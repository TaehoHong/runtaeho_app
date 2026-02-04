/**
 * Share Editor ViewModel
 * 공유 에디터 화면의 비즈니스 로직을 담당하는 훅
 *
 * Sprint 1: Unity 뷰 전체 화면 + 배경 변경 연동
 * Sprint 2: 캐릭터 드래그/줌 (Unity API 확장 필요)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
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
} from '../models/types';
import {
  DEFAULT_POSE,
  INITIAL_STAT_ELEMENTS,
  DEFAULT_UNITY_BACKGROUND,
  BACKGROUND_OPTIONS,
} from '../constants/shareOptions';
import { shareService } from '../services/shareService';
import { unityService } from '~/features/unity/services/UnityService';
import { useUnityReadiness } from '~/features/unity/hooks';
import type { UnityReadyEvent } from '~/features/unity/bridge/UnityBridge';

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

  // Refs
  canvasRef: React.RefObject<View | null>;

  // Actions
  setSelectedBackground: (background: BackgroundOption) => Promise<void>;
  setSelectedPose: (pose: PoseOption) => void;
  updateStatTransform: (type: StatType, transform: ElementTransform) => void;
  toggleStatVisibility: (type: StatType) => void;
  shareResult: () => Promise<ShareResult>;
  saveToGallery: () => Promise<boolean>;
  resetAll: () => void;
  handleUnityReady: (event: UnityReadyEvent) => void;
}

/**
 * 이미지를 리사이즈하고 Base64로 변환
 * Unity 전송 전 이미지 크기 최적화
 */
const resizeImageToBase64 = async (
  uri: string,
  maxWidth: number = 1080,
  maxHeight: number = 1920
): Promise<string> => {
  try {
    // 이미지 리사이즈
    const manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: maxWidth, height: maxHeight } }],
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

/**
 * 기본 배경 설정 (iOS: Unity 배경, Android: 그라데이션)
 */
const getDefaultBackground = (): BackgroundOption => {
  if (Platform.OS === 'ios') {
    // iOS: Unity 배경 사용
    return {
      id: DEFAULT_UNITY_BACKGROUND.id,
      name: DEFAULT_UNITY_BACKGROUND.name,
      source: DEFAULT_UNITY_BACKGROUND.previewColor,
      type: 'unity',
      unityBackgroundId: DEFAULT_UNITY_BACKGROUND.unityBackgroundId,
    };
  }
  // Android: 기본 그라데이션 배경
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
  const [isLoading, setIsLoading] = useState(Platform.OS === 'ios'); // iOS는 Unity Ready 대기
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasInitializedUnity, setHasInitializedUnity] = useState(false);

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
      if (!canSendMessage || hasInitializedUnity || Platform.OS !== 'ios') {
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
      } catch (error) {
        console.error('[useShareEditor] Failed to initialize Unity:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUnity();
  }, [canSendMessage, hasInitializedUnity]);

  /**
   * Android 전용: Unity 없이 바로 로딩 완료
   */
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setIsLoading(false);
    }
  }, []);

  /**
   * 배경 선택 (Unity 배경 변경 포함)
   */
  const setSelectedBackground = useCallback(
    async (background: BackgroundOption) => {
      setSelectedBackgroundState(background);

      // iOS Unity 배경 변경
      if (Platform.OS === 'ios' && canSendMessage) {
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
          } else if (background.type === 'gradient' && background.colors) {
            // ★ 그라데이션은 시작색으로 Unity 배경 설정 (그라데이션 지원 X)
            await unityService.setBackgroundColor(background.colors[0]!);
          }
        } catch (error) {
          console.error('[useShareEditor] Failed to change Unity background:', error);
        }
      }
    },
    [canSendMessage]
  );

  /**
   * 포즈 선택 및 Unity 업데이트
   */
  const setSelectedPose = useCallback(
    async (pose: PoseOption) => {
      setSelectedPoseState(pose);

      // Unity 캐릭터 모션 변경 (iOS only)
      if (Platform.OS === 'ios' && canSendMessage) {
        try {
          await unityService.setCharacterMotion(pose.trigger as any);
        } catch (error) {
          console.error('[useShareEditor] Failed to change pose:', error);
        }
      }
    },
    [canSendMessage]
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
  }, [setSelectedBackground, setSelectedPose]);

  return {
    // State
    selectedBackground,
    selectedPose,
    statElements,
    isLoading,
    isCapturing,
    isUnityReady,

    // Refs
    canvasRef,

    // Actions
    setSelectedBackground,
    setSelectedPose,
    updateStatTransform,
    toggleStatVisibility,
    shareResult,
    saveToGallery,
    resetAll,
    handleUnityReady,
  };
};

export default useShareEditor;
