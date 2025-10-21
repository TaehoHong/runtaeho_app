/**
 * Item 모델
 * 백엔드 API 구조와 동일하게 유지
 */

/**
 * 아이템 카테고리 타입 (상수)
 */
export const ItemTypeId = {
  HAIR: 1,
  CLOTH: 2,
  PANTS: 3,
} as const;

export type ItemTypeId = typeof ItemTypeId[keyof typeof ItemTypeId];

/**
 * 아이템 카테고리 모델 (백엔드 ItemType 엔티티)
 */
export interface ItemType {
  id: number;        // 1, 2, 3
  name: string;      // "머리", "의상", "바지"
}

/**
 * 아이템 상태 (프론트엔드에서 계산)
 * - EQUIPPED: 현재 착용 중
 * - OWNED: 보유했지만 미착용
 * - NOT_OWNED: 미보유 (구매 가능)
 */
export const ItemStatus = {
  EQUIPPED: 'EQUIPPED',
  OWNED: 'OWNED',
  NOT_OWNED: 'NOT_OWNED',
} as const;

export type ItemStatus = typeof ItemStatus[keyof typeof ItemStatus];

/**
 * 아이템 모델 (백엔드 Item 엔티티와 동일)
 */
export interface Item {
  id: number;
  itemType: ItemType;           // ⭐ 객체 (id + name)
  name: string;
  unityFilePath: string;
  filePath: string;
  point: number;                // 가격
  createdAt: string;
  isOwned?: boolean;            // 백엔드 제공: 사용자 보유 여부

  // 프론트엔드 전용 (optional)
  status?: ItemStatus;          // 착용 상태 (계산된 값)
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
  itemType: ItemType,
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
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as any;
  return (
    typeof obj.id === 'number' &&
    (obj.id === 1 || obj.id === 2 || obj.id === 3) &&
    typeof obj.name === 'string'
  );
}