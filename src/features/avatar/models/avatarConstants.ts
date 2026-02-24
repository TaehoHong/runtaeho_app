import { GREY } from '~/shared/styles';
/**
 * 아바타 기능 관련 상수
 *
 * 원칙:
 * - SRP: 각 상수 그룹은 하나의 책임만 가짐
 * - 매직 넘버/문자열 제거
 * - 변경 가능한 값은 환경변수로 분리 가능하도록 설계
 */


// ===================================
// 헤어 색상 관련 상수
// ===================================

/**
 * 헤어 색상 정의
 * 7가지 색상 중 선택 가능
 */
export const HAIR_COLORS = [
  { id: 1, name: '검정', hex: '#000000' },
  { id: 2, name: '갈색', hex: '#8B4513' },
  { id: 3, name: '금발', hex: '#FFD700' },
  { id: 4, name: '빨강', hex: '#DC143C' },
  { id: 5, name: '파랑', hex: '#4169E1' },
  { id: 6, name: '보라', hex: '#9370DB' },
  { id: 7, name: '흰색', hex: GREY.WHITE },
] as const;

/**
 * 헤어 색상 타입
 */
export type HairColor = typeof HAIR_COLORS[number];

/**
 * 기본 헤어 색상 (갈색)
 */
export const DEFAULT_HAIR_COLOR: HairColor = HAIR_COLORS[1]; // #8B4513

/**
 * 헤어 색상 ID로 색상 정보 찾기
 */
export function getHairColorById(id: number): HairColor | undefined {
  return HAIR_COLORS.find((color) => color.id === id);
}

/**
 * HEX 값으로 헤어 색상 찾기
 */
export function getHairColorByHex(hex: string): HairColor | undefined {
  return HAIR_COLORS.find((color) => color.hex.toLowerCase() === hex.toLowerCase());
}

// ===================================
// 카테고리 관련 상수
// ===================================

/**
 * 아이템 카테고리 정의
 * SRP: 카테고리 메타데이터만 관리
 * OCP: 배열로 관리하여 새 카테고리 추가 용이
 */
export const ITEM_CATEGORIES = [
  {
    type: 1,
    displayName: '머리',
    unityName: 'Hair',
  },
  {
    type: 2,
    displayName: '의상',
    unityName: 'Cloth',
  },
  {
    type: 3,
    displayName: '바지',
    unityName: 'Pant',
  },
] as const;

/**
 * ItemCategory 타입 자동 추론
 * typeof를 사용하여 ITEM_CATEGORIES에서 타입 추출
 */
export type ItemCategory = typeof ITEM_CATEGORIES[number];

/**
 * 카테고리 타입 ID로 카테고리 정보 찾기
 */
export function getCategoryByType(typeId: number): ItemCategory | undefined {
  return ITEM_CATEGORIES.find((category) => category.type === typeId);
}

/**
 * 카테고리 표시 이름 가져오기
 */
export function getCategoryDisplayName(typeId: number): string {
  return getCategoryByType(typeId)?.displayName ?? '알 수 없음';
}

/**
 * Unity 카테고리 이름 가져오기
 */
export function getCategoryUnityName(typeId: number): string {
  return getCategoryByType(typeId)?.unityName ?? '';
}

/**
 * ItemType ID → Unity 파트명 매핑 (Swift ItemType.unityName과 동일)
 * getUnityPartName 함수를 통해 접근 권장
 */
export const ITEM_TYPE_TO_UNITY_PART: Record<number, string> = {
  1: 'Hair',   // HAIR
  2: 'Cloth',  // CLOTH
  3: 'Pant',   // PANTS (주의: Pant!)
} as const;

/**
 * ItemType ID를 Unity 파트명으로 변환
 * Swift의 ItemType.unityName과 동일한 동작
 *
 * @param itemTypeId - 아이템 타입 ID (1: Hair, 2: Cloth, 3: Pant)
 * @returns Unity 파트명
 * @throws Error - 알 수 없는 아이템 타입 ID인 경우
 */
export function getUnityPartName(itemTypeId: number): string {
  const partName = ITEM_TYPE_TO_UNITY_PART[itemTypeId];
  if (!partName) {
    throw new Error(`Unknown item type ID: ${itemTypeId}. Valid IDs: 1 (Hair), 2 (Cloth), 3 (Pant)`);
  }
  return partName;
}

// ===================================
// UI 관련 상수
// ===================================

/**
 * 그리드 레이아웃 설정
 */
export const GRID_LAYOUT = {
  NUM_COLUMNS: 4,
  ITEM_SPACING: 10,
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
  HEIGHT: 300,
  BORDER_RADIUS: 12,
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
