/**
 * Share Options
 * 공유 에디터에서 사용되는 배경 및 포즈 옵션 정의
 */

import type { BackgroundOption, PoseOption, ElementTransform, StatElementConfig } from '../models/types';

/**
 * 배경 옵션 목록
 */
export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  // Unity 배경 (기본 선택)
  {
    id: 'bg_river',
    name: '강 배경',
    source: 'bg_river',
    type: 'unity',
    unityBackgroundId: 'river',
  },
];

/**
 * 포즈 옵션 목록
 * Unity Animator trigger와 매핑
 * icon: Ionicons 아이콘 이름 (UI에 표시)
 */
export const POSE_OPTIONS: PoseOption[] = [
  {
    id: 'idle',
    name: '기본',
    trigger: 'IDLE',
    icon: 'body-outline',
  },
  {
    id: 'move',
    name: '달리기',
    trigger: 'MOVE',
    icon: 'footsteps-outline',
  },
  {
    id: 'attack',
    name: '점프',
    trigger: 'ATTACK',
    icon: 'flash-outline',
  },
  {
    id: 'damaged',
    name: '지침',
    trigger: 'DAMAGED',
    icon: 'battery-dead-outline',
  },
  {
    id: 'rest',
    name: '휴식',
    trigger: 'REST',
    icon: 'cafe-outline',
  },
  {
    id: 'victory',
    name: '승리',
    trigger: 'VICTORY',
    icon: 'ribbon-outline',
  },
];

/**
 * 기본 배경
 */
export const DEFAULT_BACKGROUND: BackgroundOption = BACKGROUND_OPTIONS[0]!;

/**
 * 기본 포즈
 */
export const DEFAULT_POSE: PoseOption = POSE_OPTIONS[1]!; // 달리기 포즈

/**
 * 초기 아바타 변환 (위치 + 스케일)
 */
export const INITIAL_AVATAR_TRANSFORM: ElementTransform = {
  x: 0,
  y: -80,
  scale: 1,
};

/**
 * 초기 통계 요소 설정 배열
 * NOTE: 1:1 비율 캔버스에 맞게 y 좌표 조정됨 (9:16 → 1:1, 약 0.56배)
 */
export const INITIAL_STAT_ELEMENTS: StatElementConfig[] = [
  {
    type: 'distance',
    visible: true,
    transform: { x: 0, y: 45, scale: 1 },
  },
  {
    type: 'time',
    visible: true,
    transform: { x: -60, y: 78, scale: 1 },
  },
  {
    type: 'pace',
    visible: true,
    transform: { x: 60, y: 78, scale: 1 },
  },
  {
    type: 'map',
    visible: true,
    transform: { x: 0, y: 106, scale: 1 },
  },
];

/**
 * 캔버스 크기 (캡처 해상도)
 */
export const CANVAS_SIZE = {
  width: 1080,
  height: 1080,
};

/**
 * 미리보기 스케일
 */
export const PREVIEW_SCALE = 0.3;

/**
 * 아바타 스케일 범위
 */
export const AVATAR_SCALE_RANGE = {
  min: 0.5,
  max: 2.5,
};

/**
 * 통계 요소 스케일 범위
 */
export const STAT_SCALE_RANGE = {
  min: 0.5,
  max: 3.0,
};
