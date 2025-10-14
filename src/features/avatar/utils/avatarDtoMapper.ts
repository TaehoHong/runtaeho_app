/**
 * DTO ↔ Domain Model 변환기
 *
 * 원칙:
 * - SRP: 데이터 변환만 담당
 * - 순수 함수: 부작용 없음
 * - 타입 안정성: 모든 변환에서 타입 검증
 *
 * 변환 방향:
 * - toAvatarItem: ItemDto → AvatarItem (백엔드 → 프론트엔드)
 * - toItemDto: AvatarItem → ItemDto (프론트엔드 → 백엔드, 필요 시)
 */

import type {
  ItemDto,
  AvatarItem,
  AvatarDto,
  Avatar,
  ItemType,
  ItemStatus,
  EquippedItemsMap,
} from '../models/avatarTypes';
import { ItemStatus as ItemStatusEnum, isItemType } from '../models/avatarTypes';

/**
 * ItemDto를 AvatarItem으로 변환
 *
 * @param dto - 백엔드 응답 DTO
 * @param equippedItems - 현재 착용 중인 아이템 맵 (상태 판별용)
 * @returns AvatarItem 도메인 모델
 *
 * 상태 결정 로직:
 * 1. 착용 중인 아이템 → EQUIPPED
 * 2. 보유했지만 미착용 → OWNED
 * 3. 미보유 → NOT_OWNED
 */
export function toAvatarItem(
  dto: ItemDto,
  equippedItems: EquippedItemsMap = {}
): AvatarItem {
  // ItemType 검증
  if (!isItemType(dto.itemType.id)) {
    throw new Error(`Invalid item type: ${dto.itemType.id}`);
  }

  const itemType = dto.itemType.id as ItemType;

  // 상태 결정
  const status = determineItemStatus(dto, itemType, equippedItems);

  return {
    id: dto.id,
    name: dto.name,
    itemType,
    filePath: dto.filePath,
    unityFilePath: dto.unityFilePath,
    status,
    price: dto.isOwned ? undefined : dto.point,
  };
}

/**
 * 아이템 상태 결정 로직 (SRP)
 *
 * @param dto - 아이템 DTO
 * @param itemType - 아이템 타입
 * @param equippedItems - 착용 중인 아이템 맵
 * @returns ItemStatus
 */
function determineItemStatus(
  dto: ItemDto,
  itemType: ItemType,
  equippedItems: EquippedItemsMap
): ItemStatus {
  // 1. 착용 중인지 확인
  const equippedItem = equippedItems.get(itemType);
  if (equippedItem && equippedItem.id === dto.id) {
    return ItemStatusEnum.EQUIPPED;
  }

  // 2. 보유 여부 확인
  if (dto.isOwned) {
    return ItemStatusEnum.OWNED;
  }

  // 3. 미보유
  return ItemStatusEnum.NOT_OWNED;
}

/**
 * ItemDto 배열을 AvatarItem 배열로 변환
 *
 * @param dtos - DTO 배열
 * @param equippedItems - 착용 중인 아이템 맵
 * @returns AvatarItem 배열
 */
export function toAvatarItems(
  dtos: readonly ItemDto[],
  equippedItems: EquippedItemsMap = new Map<ItemType, AvatarItem>()
): readonly AvatarItem[] {
  return dtos.map((dto) => toAvatarItem(dto, equippedItems));
}

/**
 * AvatarDto를 Avatar로 변환
 *
 * @param dto - 백엔드 아바타 DTO
 * @returns Avatar 도메인 모델
 */
export function toAvatar(dto: AvatarDto): Avatar {
  // 착용 중인 아이템 맵 생성
  const equippedItemsMap = createEquippedItemsMap(dto.avatarItems);

  // 아이템 변환
  const equippedItems = toAvatarItems(dto.avatarItems, equippedItemsMap);

  return {
    id: dto.id,
    userId: dto.userId,
    isMain: dto.isMain,
    equippedItems,
  };
}

/**
 * 착용 중인 아이템 맵 생성
 *
 * @param items - 아이템 DTO 배열
 * @returns EquippedItemsMap
 */
function createEquippedItemsMap(items: readonly ItemDto[]): EquippedItemsMap {
  const map: Record<ItemType, AvatarItem | undefined> = {} as any;

  for (const dto of items) {
    if (isItemType(dto.itemType.id)) {
      const itemType = dto.itemType.id as ItemType;
      // 간단한 변환 (상태는 모두 EQUIPPED)
      map[itemType] = {
        id: dto.id,
        name: dto.name,
        itemType,
        filePath: dto.filePath,
        unityFilePath: dto.unityFilePath,
        status: ItemStatusEnum.EQUIPPED,
        price: undefined,
      };
    }
  }

  return map;
}

/**
 * AvatarItem 배열을 ItemType별 맵으로 변환
 *
 * @param items - AvatarItem 배열
 * @returns EquippedItemsMap
 */
export function toEquippedItemsMap(items: readonly AvatarItem[]): EquippedItemsMap {
  const map: Record<ItemType, AvatarItem | undefined> = {} as any;

  for (const item of items) {
    map[item.itemType] = item;
  }

  return map;
}

/**
 * EquippedItemsMap을 아이템 ID 배열로 변환 (API 요청용)
 *
 * @param equippedItems - 착용 중인 아이템 맵
 * @returns 아이템 ID 배열
 */
export function toItemIds(equippedItems: EquippedItemsMap): readonly number[] {
  return Object.values(equippedItems)
    .filter((item): item is AvatarItem => item !== undefined)
    .map((item) => item.id);
}

/**
 * 카테고리별 아이템 그룹화
 *
 * @param items - AvatarItem 배열
 * @returns ItemType을 key로 하는 아이템 그룹 맵
 */
export function groupItemsByCategory(
  items: readonly AvatarItem[]
): Record<ItemType, readonly AvatarItem[]> {
  const grouped: Record<ItemType, AvatarItem[]> = {
    1: [],
    2: [],
    3: [],
  };

  for (const item of items) {
    if (isItemType(item.itemType)) {
      grouped[item.itemType].push(item);
    }
  }

  // readonly로 변환
  return {
    1: Object.freeze(grouped[1]),
    2: Object.freeze(grouped[2]),
    3: Object.freeze(grouped[3]),
  };
}

/**
 * 아이템 상태 업데이트 (불변성 유지)
 *
 * @param item - 원본 아이템
 * @param newStatus - 새로운 상태
 * @returns 새로운 아이템 인스턴스
 */
export function updateItemStatus(item: AvatarItem, newStatus: ItemStatus): AvatarItem {
  return {
    ...item,
    status: newStatus,
  };
}

/**
 * 아이템 배열에서 특정 아이템의 상태 업데이트 (불변성 유지)
 *
 * @param items - 원본 아이템 배열
 * @param itemId - 업데이트할 아이템 ID
 * @param newStatus - 새로운 상태
 * @returns 새로운 아이템 배열
 */
export function updateItemStatusInArray(
  items: readonly AvatarItem[],
  itemId: number,
  newStatus: ItemStatus
): readonly AvatarItem[] {
  return items.map((item) =>
    item.id === itemId ? updateItemStatus(item, newStatus) : item
  );
}
