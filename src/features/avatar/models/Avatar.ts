/**
 * Avatar 모델
 * Swift Avatar 구조체에서 마이그레이션
 */

import type { Item } from './Item'

/**
 * 아바타 (사용자 아바타 정보)
 */
export interface Avatar {
  readonly id: number;
  readonly userId: number;
  readonly isMain: boolean;
  readonly items: readonly Item[];
}

/**
 * 착용 아이템 업데이트 요청
 */
export interface UpdateEquippedItemsRequest {
  readonly avatarId: number;
  readonly itemIds: readonly number[];
}

/**
 * 장착된 아이템 맵
 * key: itemType.id (1, 2, 3), value: Item
 */
export type EquippedItemsMap = Record<number, Item>;

/**
 * 아이템 목록 조회 요청
 */
export interface GetItemsRequest {
  readonly cursor?: number | null;
  readonly itemTypeId: number;
  readonly size?: number;
}

/**
 * 아바타 생성 헬퍼 함수
 * Swift createAvatar 메서드 대응
 */
export const createAvatar = (
  id: number,
  userId: number,
  isMain: boolean = false,
  orderIndex: number = 0
): Avatar => ({
  id,
  userId,
  isMain,
  items: [],
});
