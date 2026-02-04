/**
 * Share Options
 * 공유 에디터에서 사용되는 배경 및 포즈 옵션 정의
 */

import type { BackgroundOption, PoseOption, ElementTransform, StatElementConfig, UnityBackgroundOption } from '../models/types';

/**
 * Unity 배경 옵션 목록
 * Unity 씬의 배경 이미지를 변경하는데 사용
 * Unity의 BackgroundImage.cs의 BackgroundPaths 딕셔너리와 매핑됨
 */
export const UNITY_BACKGROUND_OPTIONS: UnityBackgroundOption[] = [
  {
    id: 'unity_bg_01',
    name: '배경 1',
    unityBackgroundId: 'bg_01',
    previewColor: '#2E7D32', // 녹색 계열
  },
  {
    id: 'unity_bg_02',
    name: '배경 2',
    unityBackgroundId: 'bg_02',
    previewColor: '#1565C0', // 파란색 계열
  },
];

/**
 * 기본 Unity 배경
 */
export const DEFAULT_UNITY_BACKGROUND: UnityBackgroundOption = UNITY_BACKGROUND_OPTIONS[0]!;

/**
 * 배경 옵션 목록
 */
export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: 'gradient_green',
    name: '그린 그라데이션',
    source: 'gradient',
    type: 'gradient',
    colors: ['#45DA31', '#2A8B1F'],
  },
  {
    id: 'gradient_blue',
    name: '블루 그라데이션',
    source: 'gradient',
    type: 'gradient',
    colors: ['#66EAF1', '#3283ff'],
  },
  {
    id: 'gradient_purple',
    name: '퍼플 그라데이션',
    source: 'gradient',
    type: 'gradient',
    colors: ['#9B59B6', '#8E44AD'],
  },
  {
    id: 'gradient_orange',
    name: '오렌지 그라데이션',
    source: 'gradient',
    type: 'gradient',
    colors: ['#F39C12', '#E74C3C'],
  },
  {
    id: 'gradient_dark',
    name: '다크 그라데이션',
    source: 'gradient',
    type: 'gradient',
    colors: ['#2C3E50', '#1A1A2E'],
  },
  {
    id: 'solid_white',
    name: '화이트',
    source: '#FFFFFF',
    type: 'color',
  },
  {
    id: 'solid_black',
    name: '블랙',
    source: '#1A1A1A',
    type: 'color',
  },
];

/**
 * 포즈 옵션 목록
 * Unity Animator trigger와 매핑
 */
export const POSE_OPTIONS: PoseOption[] = [
  {
    id: 'idle',
    name: '기본',
    trigger: 'IDLE',
    icon: 'person-standing',
  },
  {
    id: 'move',
    name: '달리기',
    trigger: 'MOVE',
    icon: 'running',
  },
  {
    id: 'attack',
    name: '점프',
    trigger: 'ATTACK',
    icon: 'jumping',
  },
  {
    id: 'damaged',
    name: '지침',
    trigger: 'DAMAGED',
    icon: 'tired',
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
 */
export const INITIAL_STAT_ELEMENTS: StatElementConfig[] = [
  {
    type: 'distance',
    visible: true,
    transform: { x: 0, y: 80, scale: 1 },
  },
  {
    type: 'time',
    visible: true,
    transform: { x: -60, y: 140, scale: 1 },
  },
  {
    type: 'pace',
    visible: true,
    transform: { x: 60, y: 140, scale: 1 },
  },
  {
    type: 'points',
    visible: true,
    transform: { x: 0, y: 190, scale: 1 },
  },
];

/**
 * 캔버스 크기 (캡처 해상도)
 */
export const CANVAS_SIZE = {
  width: 1080,
  height: 1920,
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
