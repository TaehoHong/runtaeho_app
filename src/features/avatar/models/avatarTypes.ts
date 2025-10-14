/**
 * 아바타 도메인 타입 정의
 *
 * 원칙:
 * - SRP: 각 타입은 하나의 명확한 책임만 가짐
 * - OCP: Enum 대신 Union Type 사용으로 확장성 확보
 * - 불변성: readonly 속성 사용
 */

// ===================================
// Domain Types (비즈니스 로직 타입)
// ===================================

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
export type ItemStatus = 'EQUIPPED' | 'OWNED' | 'NOT_OWNED';

export const ItemStatus = {
  EQUIPPED: 'EQUIPPED' as ItemStatus,
  OWNED: 'OWNED' as ItemStatus,
  NOT_OWNED: 'NOT_OWNED' as ItemStatus,
} as const;

/**
 * 아바타 아이템 (도메인 모델)
 * SRP: 아이템 자체의 속성만 표현
 */
export interface AvatarItem {
  readonly id: number;
  readonly name: string;
  readonly itemType: ItemType;
  readonly filePath: string;
  readonly unityFilePath: string;
  readonly status: ItemStatus;
  readonly price?: number;
}

/**
 * 아이템 카테고리 정보
 * SRP: 카테고리 메타 정보만 표현
 */
export interface ItemCategory {
  readonly type: ItemType;
  readonly displayName: string;
  readonly unityName: string;
}

/**
 * 아바타 (사용자 아바타 정보)
 */
export interface Avatar {
  readonly id: number;
  readonly userId: number;
  readonly isMain: boolean;
  readonly equippedItems: readonly AvatarItem[];
}

/**
 * 구매 대상 아이템
 * SRP: 구매에 필요한 정보만 포함
 */
export interface PurchaseItem {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly itemType: ItemType;
}

// ===================================
// API Response Types (DTO)
// ===================================

/**
 * API에서 반환하는 아이템 타입 DTO
 */
export interface ItemTypeDto {
  readonly id: number;
  readonly name: string;
}

/**
 * API에서 반환하는 아이템 DTO
 * SRP: API 응답 구조만 표현
 */
export interface ItemDto {
  readonly id: number;
  readonly name: string;
  readonly itemType: ItemTypeDto;
  readonly filePath: string;
  readonly unityFilePath: string;
  readonly isOwned: boolean;
  readonly point: number;
}

/**
 * 아바타 응답 DTO
 */
export interface AvatarDto {
  readonly id: number;
  readonly userId: number;
  readonly isMain: boolean;
  readonly avatarItems: readonly ItemDto[];
}

// ===================================
// API Request Types
// ===================================

/**
 * 아이템 목록 조회 요청
 */
export interface GetItemsRequest {
  readonly cursor?: number | null;
  readonly itemType: ItemType;
  readonly size?: number;
}

/**
 * 아이템 구매 요청
 */
export interface PurchaseItemsRequest {
  readonly itemIds: readonly number[];
}

/**
 * 착용 아이템 업데이트 요청
 */
export interface UpdateEquippedItemsRequest {
  readonly avatarId: number;
  readonly itemIds: readonly number[];
}

// ===================================
// UI State Types
// ===================================

/**
 * 장착된 아이템 맵
 * key: ItemType, value: AvatarItem
 */
export type EquippedItemsMap = Readonly<Record<ItemType, AvatarItem | undefined>>;

/**
 * 카테고리별 아이템 맵
 * key: ItemType, value: AvatarItem 배열
 */
export type ItemsByCategory = Readonly<Record<ItemType, readonly AvatarItem[]>>;

// ===================================
// Type Guards (타입 검증)
// ===================================

/**
 * ItemType 타입 가드
 */
export function isItemType(value: unknown): value is ItemType {
  return value === 1 || value === 2 || value === 3;
}

/**
 * 유효한 AvatarItem인지 검증
 */
export function isValidAvatarItem(item: unknown): item is AvatarItem {
  if (typeof item !== 'object' || item === null) return false;

  const candidate = item as Partial<AvatarItem>;

  return (
    typeof candidate.id === 'number' &&
    typeof candidate.name === 'string' &&
    isItemType(candidate.itemType) &&
    typeof candidate.filePath === 'string' &&
    typeof candidate.unityFilePath === 'string' &&
    (candidate.status === ItemStatus.EQUIPPED ||
      candidate.status === ItemStatus.OWNED ||
      candidate.status === ItemStatus.NOT_OWNED)
  );
}
