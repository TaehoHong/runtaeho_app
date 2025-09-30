/**
 * Item 모델
 * Swift Item 구조체에서 마이그레이션
 */

/**
 * 아이템 기본 모델
 */
export interface Item {
  id: number;
  itemType: ItemType;
  name: string;
  unityFilePath: string;
  filePath: string;
  point: number;
  createdAt: string;
}

export interface ItemType {
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
 * 사용자 아이템 생성 헬퍼 함수
 */
export const createUserItem = (
  id: number,
  userId: number,
  item: Item,
  isEnabled: boolean = true,
  isExpired: boolean = false,
  expireDateTime?: string
): UserItem => ({
  id,
  userId,
  item,
  isEnabled,
  isExpired,
  expireDateTime,
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

/**
 * 가격 범위별 필터링
 */
export const filterItemsByPrice = (items: Item[], minPoint: number, maxPoint: number): Item[] => {
  return items.filter(item => item.point >= minPoint && item.point <= maxPoint);
};

/**
 * 아이템 정렬
 */
export const sortItems = (items: Item[], sortBy: 'name' | 'point' | 'createdAt' = 'name', order: 'asc' | 'desc' = 'asc'): Item[] => {
  return [...items].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'point':
        comparison = a.point - b.point;
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });
};