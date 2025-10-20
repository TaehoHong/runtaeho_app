/**
 * Item 모델
 */

/**
 * 아이템 카테고리
 * OCP: 새로운 타입 추가 시 타입만 확장하면 됨
 */
export type ItemType = 1 | 2 | 3;

export const ItemType = {
  HAIR: 1 as ItemType,
  CLOTH: 2 as ItemType,
  PANTS: 3 as ItemType,
} as const;

/**
 * 아이템 상태
 * - EQUIPPED: 현재 착용 중
 * - OWNED: 보유했지만 미착용
 * - NOT_OWNED: 미보유 (구매 가능)
 */
export const ItemStatus = {
  EQUIPPED: 'EQUIPPED',
  OWNED: 'OWNED',
  NOT_OWNED: 'NOT_OWNED',
} as const;

// 'EQUIPPED' | 'OWNED' | 'NOT_OWNED'
export type ItemStatus = typeof ItemStatus[keyof typeof ItemStatus];

/**
 * 아이템 기본 모델
 */
export interface Item {
  id: number;
  itemType: ItemTypeModel;
  name: string;
  unityFilePath: string;
  filePath: string;
  point: number;
  createdAt: string;
}

export interface ItemTypeModel {
  id: number;
  name: String;
}

/**
 * 사용자 아이템 모델
 */
export interface UserItem {
  id: number;
  userId: number;
  item: Item;
  isEnabled: boolean;
  isExpired: boolean;
  expireDateTime?: string;
  createdAt: string;
}

/**
 * 아이템 구매 요청
 */
export interface PurchaseItemsRequest {
  readonly itemIds: readonly number[];
}

/**
 * 아이템 검색 조건
 */
export interface ItemSearch {
  itemTypeId?: number;
  name?: string;
  minPoint?: number;
  maxPoint?: number;
  page?: number;
  size?: number;
}

/**
 * 아이템 목록 응답
 */
export interface ItemListResponse {
  content: Item[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

/**
 * 아이템 생성 헬퍼 함수
 */
export const createItem = (
  id: number,
  itemType: ItemTypeModel,
  name: string,
  unityFilePath: string,
  filePath: string,
  point: number
): Item => ({
  id,
  itemType,
  name,
  unityFilePath,
  filePath,
  point,
  createdAt: new Date().toISOString(),
});
/**
 * 아이템 포맷팅 헬퍼 함수
 */
export const formatItem = (item: Item) => ({
  ...item,
  displayName: item.name,
  formattedPoint: `${item.point.toLocaleString()}P`,
  categoryName: item.itemType.name,
  isAffordable: (userPoints: number) => userPoints >= item.point,
});

/**
 * 사용자 아이템 포맷팅 헬퍼 함수
 */
export const formatUserItem = (userItem: UserItem) => ({
  ...userItem,
  ...formatItem(userItem.item),
  isActive: userItem.isEnabled && !userItem.isExpired,
  isExpiringSoon: userItem.expireDateTime
    ? new Date(userItem.expireDateTime).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 // 7일
    : false,
  remainingDays: userItem.expireDateTime
    ? Math.max(0, Math.ceil((new Date(userItem.expireDateTime).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null,
});

/**
 * 아이템 검증 헬퍼 함수
 */
export const validateItem = (item: Item): boolean => {
  if (!item.id || item.id <= 0) return false;
  if (!item.name || item.name.trim().length === 0) return false;
  if (!item.filePath || item.filePath.trim().length === 0) return false;
  if (!item.unityFilePath || item.unityFilePath.trim().length === 0) return false;
  if (item.point < 0) return false;
  return true;
};

/**
 * 아이템 타입별 필터링
 */
export const filterItemsByType = (items: Item[], itemTypeId: number): Item[] => {
  return items.filter(item => item.itemType.id === itemTypeId);
};


export function isItemType(value: unknown): value is ItemType {
  return value === 1 || value === 2 || value === 3;
}