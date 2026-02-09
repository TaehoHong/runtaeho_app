/**
 * Share Feature Types
 * 러닝 기록 공유 기능에서 사용되는 타입 정의
 */

import type { Location } from '~/features/running/models';

/**
 * 배경 옵션 타입
 */
export interface BackgroundOption {
  id: string;
  name: string;
  /** 로컬 이미지, 색상, 또는 Unity 배경 ID */
  source: number | string;
  type: 'image' | 'color' | 'photo' | 'unity';
  /** 사용자 사진 URI (type이 'photo'인 경우) */
  photoUri?: string;
  /** Unity 배경 ID (type이 'unity'인 경우) */
  unityBackgroundId?: string;
}

/**
 * 포즈 옵션 타입
 */
export interface PoseOption {
  id: string;
  name: string;
  /** Unity Animator trigger 이름 */
  trigger: string;
  icon: string;
}

/**
 * 공유할 러닝 데이터
 */
export interface ShareRunningData {
  distance: number;
  durationSec: number;
  pace: string;
  startTimestamp: string;
  /** 획득 포인트 (100m당 1포인트) */
  earnedPoints: number;
  /** GPS 좌표 배열 (지도 표시용) */
  locations?: Location[];
}

/**
 * 요소 위치 타입
 */
export interface ElementPosition {
  x: number;
  y: number;
}

/**
 * 요소 변환 타입 (위치 + 스케일)
 */
export interface ElementTransform {
  x: number;
  y: number;
  scale: number;
}

/**
 * 통계 항목 타입
 */
export type StatType = 'distance' | 'time' | 'pace' | 'map';

/**
 * 개별 통계 요소 설정
 */
export interface StatElementConfig {
  type: StatType;
  visible: boolean;
  transform: ElementTransform;
}

/**
 * 공유 에디터 상태
 */
export interface ShareEditorState {
  /** 선택된 배경 */
  selectedBackground: BackgroundOption;
  /** 선택된 포즈 */
  selectedPose: PoseOption;
  /** 아바타 변환 (위치 + 스케일) */
  avatarTransform: ElementTransform;
  /** 개별 통계 요소 설정 배열 */
  statElements: StatElementConfig[];
  /** 캡처된 아바타 이미지 (Base64) */
  avatarImage: string | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 캡처 중 상태 */
  isCapturing: boolean;
  /** 아바타 표시 여부 (공유 에디터 토글용) */
  avatarVisible: boolean;
}

/**
 * 공유 결과 타입
 */
export interface ShareResult {
  success: boolean;
  message?: string;
  /** 공유된 앱 (iOS Share Sheet에서 선택된 앱) */
  app?: string;
}
