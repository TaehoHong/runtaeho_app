/**
 * Avatar 모델
 * Swift Avatar 구조체에서 마이그레이션
 */

import type { UnityAvatarDto } from '../../unity/types/UnityTypes';
import type { Item } from './Item';

/**
 * 아바타 기본 모델
 */
export interface Avatar {
  id: number;
  userId: number;
  isMain: boolean;
  orderIndex: number;
  avatarItems: AvatarItem[];
}

/**
 * 아바타 아이템 모델
 */
export interface AvatarItem {
  id: number;
  item: Item;
  isEnabled: boolean;
}

/**
 * 아바타 아이템 요청 모델
 */
export interface AvatarItemRequest {
  itemIds: number[];
}

/**
 * 아이템 구매 요청 모델
 */
export interface PurchaseItemRequest {
  itemId: number;
  avatarId?: number;
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
  orderIndex,
  avatarItems: [],
});

/**
 * 아이템 타입별 그룹화
 */
export const groupItemsByType = (items: AvatarItem[]): Record<string, AvatarItem[]> => {
  return items.reduce((acc, item) => {
    const typeName = item.itemType.name;
    if (!acc[typeName]) {
      acc[typeName] = [];
    }
    acc[typeName].push(item);
    return acc;
  }, {} as Record<string, AvatarItem[]>);
};

/**
 * 착용 중인 아이템 필터링
 */
export const getEquippedItems = (avatar: Avatar): AvatarItem[] => {
  return avatar.avatarItems.filter(item => item.isEnabled);
};

/**
 * Avatar를 Unity DTO로 변환
 * Unity 연동을 위한 변환 함수
 */
export const avatarToUnityDto = (avatar: Avatar): UnityAvatarDto => {
  const equippedItems = getEquippedItems(avatar);

  return {
    id: avatar.id,
    userId: avatar.userId,

    // 착용 아이템을 Unity 형식으로 변환
    hair: equippedItems.find(item => item.itemType.name === 'HAIR') ? {
      id: equippedItems.find(item => item.itemType.name === 'HAIR')!.id,
      name: equippedItems.find(item => item.itemType.name === 'HAIR')!.name,
      category: 'HAIR',
      unityFilePath: equippedItems.find(item => item.itemType.name === 'HAIR')!.unityFilePath,
    } : undefined,

    top: equippedItems.find(item => item.itemType.name === 'TOP') ? {
      id: equippedItems.find(item => item.itemType.name === 'TOP')!.id,
      name: equippedItems.find(item => item.itemType.name === 'TOP')!.name,
      category: 'TOP',
      unityFilePath: equippedItems.find(item => item.itemType.name === 'TOP')!.unityFilePath,
    } : undefined,

    bottom: equippedItems.find(item => item.itemType.name === 'BOTTOM') ? {
      id: equippedItems.find(item => item.itemType.name === 'BOTTOM')!.id,
      name: equippedItems.find(item => item.itemType.name === 'BOTTOM')!.name,
      category: 'BOTTOM',
      unityFilePath: equippedItems.find(item => item.itemType.name === 'BOTTOM')!.unityFilePath,
    } : undefined,

    shoes: equippedItems.find(item => item.itemType.name === 'SHOES') ? {
      id: equippedItems.find(item => item.itemType.name === 'SHOES')!.id,
      name: equippedItems.find(item => item.itemType.name === 'SHOES')!.name,
      category: 'SHOES',
      unityFilePath: equippedItems.find(item => item.itemType.name === 'SHOES')!.unityFilePath,
    } : undefined,

    accessory: equippedItems.find(item => item.itemType.name === 'ACCESSORY') ? {
      id: equippedItems.find(item => item.itemType.name === 'ACCESSORY')!.id,
      name: equippedItems.find(item => item.itemType.name === 'ACCESSORY')!.name,
      category: 'ACCESSORY',
      unityFilePath: equippedItems.find(item => item.itemType.name === 'ACCESSORY')!.unityFilePath,
    } : undefined,
  };
};