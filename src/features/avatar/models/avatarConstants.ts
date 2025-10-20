/**
 * 아바타 기능 관련 상수
 *
 * 원칙:
 * - SRP: 각 상수 그룹은 하나의 책임만 가짐
 * - 매직 넘버/문자열 제거
 * - 변경 가능한 값은 환경변수로 분리 가능하도록 설계
 */

import type { ItemType, ItemCategory } from './';

// ===================================
// API 관련 상수
// ===================================

/**
 * API 엔드포인트
 * SRP: API 경로만 관리
 */
export const AVATAR_API_ENDPOINTS = {
  GET_ITEMS: '/api/v1/items',
  PURCHASE_ITEMS: '/api/v1/user-items',
  GET_MAIN_AVATAR: '/api/v1/avatars/main',
  
} as const;

// ===================================
// 카테고리 관련 상수
// ===================================

/**
 * 아이템 카테고리 정의
 * SRP: 카테고리 메타데이터만 관리
 * OCP: 배열로 관리하여 새 카테고리 추가 용이
 */
export const ITEM_CATEGORIES: readonly ItemCategory[] = [
  {
    type: 1 as ItemType,
    displayName: '머리',
    unityName: 'Hair',
  },
  {
    type: 2 as ItemType,
    displayName: '의상',
    unityName: 'Cloth',
  },
  {
    type: 3 as ItemType,
    displayName: '바지',
    unityName: 'Pant',
  },
] as const;

/**
 * 카테고리 타입으로 카테고리 정보 찾기
 */
export function getCategoryByType(type: ItemType): ItemCategory | undefined {
  return ITEM_CATEGORIES.find((category) => category.type === type);
}

/**
 * 카테고리 표시 이름 가져오기
 */
export function getCategoryDisplayName(type: ItemType): string {
  return getCategoryByType(type)?.displayName ?? '알 수 없음';
}

/**
 * Unity 카테고리 이름 가져오기
 */
export function getCategoryUnityName(type: ItemType): string {
  return getCategoryByType(type)?.unityName ?? '';
}

// ===================================
// UI 관련 상수
// ===================================

/**
 * 그리드 레이아웃 설정
 */
export const GRID_LAYOUT = {
  NUM_COLUMNS: 3,
  ITEM_SPACING: 15,
  HORIZONTAL_PADDING: 20,
} as const;

/**
 * 아이템 카드 크기
 */
export const ITEM_CARD_SIZE = {
  WIDTH: 105,
  HEIGHT: 105,
  BORDER_RADIUS: 12,
  BORDER_WIDTH: 2,
  SELECTED_BORDER_WIDTH: 3,
} as const;

/**
 * Unity 프리뷰 설정
 */
export const UNITY_PREVIEW = {
  HEIGHT: 335,
  BORDER_RADIUS: 12,
} as const;

/**
 * 컬러 팔레트
 * SRP: UI 색상만 관리
 */
export const AVATAR_COLORS = {
  // Background
  SCREEN_BACKGROUND: '#FAFAFA',
  CARD_BACKGROUND: '#FFFFFF',
  ITEM_BACKGROUND: '#F2F2F2',
  SELECTED_ITEM_BACKGROUND: '#E8F5E8',

  // Borders
  EQUIPPED_BORDER: '#7AE87A',
  OWNED_BORDER: '#000000',
  NOT_OWNED_BORDER: '#888888',

  // Buttons
  CANCEL_BUTTON: '#D9D9D9',
  CONFIRM_BUTTON: '#7AE87A',
  PURCHASE_BUTTON: '#71DCF9',
  ALERT_BUTTON: '#FF7B7B',

  // Text
  PRIMARY_TEXT: '#000000',
  SECONDARY_TEXT: '#666666',
  DISABLED_TEXT: '#999999',

  // Category Tab
  SELECTED_TAB: '#7AE87A',
  UNSELECTED_TAB: '#F2F2F2',

  // Point
  POINT_ICON: '#7BE87B',
  POINT_DECREASE: '#FF0000',
  POINT_INCREASE: '#7AE87A',
} as const;

/**
 * 버튼 크기
 */
export const BUTTON_SIZE = {
  BOTTOM_BUTTON_WIDTH: 162,
  BOTTOM_BUTTON_HEIGHT: 56,
  MODAL_BUTTON_WIDTH: 140,
  MODAL_BUTTON_HEIGHT: 52,
} as const;

// ===================================
// 비즈니스 로직 상수
// ===================================

/**
 * 아이템 상태별 투명도
 */
export const ITEM_OPACITY = {
  EQUIPPED: 1.0,
  OWNED: 1.0,
  NOT_OWNED: 0.5,
} as const;

/**
 * 가격 표시 설정
 */
export const PRICE_DISPLAY = {
  SHOW_FOR_STATUS: ['NOT_OWNED'],
  ICON_SIZE: 16,
  FONT_SIZE: 14,
} as const;

// ===================================
// 에러 메시지
// ===================================

/**
 * 사용자 친화적 에러 메시지
 * SRP: 에러 메시지만 관리
 */
export const ERROR_MESSAGES = {
  INSUFFICIENT_POINTS: '포인트가 부족합니다.',
  INSUFFICIENT_POINTS_DETAIL: '보유 포인트가 부족해요!\n포인트를 모으고 다시 방문해주세요.',
  PURCHASE_FAILED: '아이템 구매에 실패했습니다.',
  UPDATE_FAILED: '착용 상태 업데이트에 실패했습니다.',
  NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
  ITEM_NOT_FOUND: '아이템을 찾을 수 없습니다.',
  INVALID_CATEGORY: '유효하지 않은 카테고리입니다.',
} as const;

/**
 * 성공 메시지
 */
export const SUCCESS_MESSAGES = {
  PURCHASE_SUCCESS: '아이템을 구매했습니다.',
  EQUIP_SUCCESS: '아이템을 착용했습니다.',
  UPDATE_SUCCESS: '변경사항이 저장되었습니다.',
} as const;

// ===================================
// React Query 관련 상수
// ===================================

/**
 * Query Key 프리픽스
 */
export const QUERY_KEY_PREFIX = {
  AVATAR: 'avatar',
  ITEMS: 'items',
  MAIN_AVATAR: 'main',
  USER_POINTS: 'user-points',
} as const;

/**
 * React Query 옵션
 */
export const QUERY_OPTIONS = {
  STALE_TIME: 5 * 60 * 1000, // 5분
  GC_TIME: 10 * 60 * 1000, // 10분
  RETRY_COUNT: 1,
} as const;
