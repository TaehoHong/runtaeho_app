/**
 * Avatar 모델
 * Swift Avatar 구조체에서 마이그레이션
 */

import type { Item } from './Item';
import type { ItemType, ItemStatus } from './Item'

/**
 * 아바타 (사용자 아바타 정보)
 */
export interface Avatar {
  readonly id: number;
  readonly userId: number;
  readonly isMain: boolean;
  readonly items: readonly AvatarItem[];
}

/**
 * 아바타 아이템 모델
 */
export interface AvatarItem {
  readonly id: number;
  readonly name: string;
  readonly itemType: ItemType;
  readonly filePath: string;
  readonly unityFilePath: string;
  readonly status: ItemStatus;
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
 * key: ItemType, value: AvatarItem
 */
export type EquippedItemsMap = Record<ItemType, AvatarItem | undefined>;


/**
 * 아이템 목록 조회 요청
 */
export interface GetItemsRequest {
  readonly cursor?: number | null;
  readonly itemType: ItemType;
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
