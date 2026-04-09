/**
 * Share Options
 * 공유 에디터의 선택지와 기본 상태를 정의한다.
 */

import type {
  BackgroundOption,
  PoseOption,
  CharacterTransform,
  ElementTransform,
  StatElementConfig,
} from '../models/types';

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
    id: 'jump',
    name: '점프',
    trigger: 'ATTACK',
    icon: 'flash-outline',
  },
  {
    id: 'tired',
    name: '지침',
    trigger: 'DAMAGED',
    icon: 'battery-dead-outline',
  },
  {
    id: 'rest',
    name: '휴식',
    trigger: 'DEATH',
    icon: 'battery-dead-outline',
  }
];

/**
 * 기본 배경
 */
export const DEFAULT_BACKGROUND: BackgroundOption = BACKGROUND_OPTIONS[0]!;

/**
 * 기본 포즈
 */
export const DEFAULT_POSE: PoseOption = POSE_OPTIONS[0]!;

/**
 * 초기 아바타 변환 (오버레이 요소 기준)
 */
export const INITIAL_AVATAR_TRANSFORM: ElementTransform = {
  x: 0,
  y: -80,
  scale: 1,
};

/**
 * 초기 Unity 캐릭터 변환 (정규화 좌표계)
 */
export const INITIAL_CHARACTER_TRANSFORM: CharacterTransform = {
  x: 0.5,
  y: 0.9,
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
 * 초기 포즈 애니메이션 재생 위치
 */
export const INITIAL_POSE_ANIMATION_TIMES: Record<string, number> = {
  IDLE: 0,
  MOVE: 0,
  ATTACK: 0,
  DAMAGED: 0,
  DEATH: 0,
};

/**
 * 공유 에디터 초기 상태 factory
 * 객체/배열 참조 공유를 막기 위해 매번 새 값을 반환한다.
 */
export const createInitialShareEditorState = () => ({
  selectedBackground: DEFAULT_BACKGROUND,
  selectedPose: DEFAULT_POSE,
  statElements: INITIAL_STAT_ELEMENTS.map((element) => ({
    ...element,
    transform: { ...element.transform },
  })),
  characterTransform: { ...INITIAL_CHARACTER_TRANSFORM },
  avatarVisible: true,
  animationTime: 0,
  poseAnimationTimes: { ...INITIAL_POSE_ANIMATION_TIMES },
});

/**
 * 캔버스 크기 (캡처 해상도)
 */
export const CANVAS_SIZE = {
  width: 1080,
  height: 1350, // 4:5 비율 (인스타그램 게시물 최적화)
};

/**
 * 요소별 스케일 범위 (Single Point of Truth)
 * 모든 Draggable 컴포넌트에서 이 상수를 참조
 */
export const SCALE_RANGES = {
  /** 캐릭터 (SharePreviewCanvas) */
  character: { min: 0.5, max: 2.5 },
  /** 통계 항목 (DraggableStat) */
  stat: { min: 0.5, max: 3.0 },
  /** 경로 지도 (DraggableRouteMap) */
  map: { min: 0.5, max: 2.0 },
} as const;
