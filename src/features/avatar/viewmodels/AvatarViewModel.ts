import { useCallback, useMemo } from 'react';
import {
  useGetMainAvatar,
  useUpdateAvatarItems,
  usePurchaseAndEquipItem,
  useRemoveAvatarItem,
  useRemoveAllAvatarItems,
} from '../../../services/avatar';
import type { Avatar } from '../models';
import {
  formatAvatar,
  validateAvatar,
  groupItemsByType,
  getEquippedItems,
  getEquippedItemByType,
} from '../models';

/**
 * Avatar ViewModel
 * Swift Avatar 관련 비즈니스 로직을 React Hook으로 마이그레이션
 */
export const useAvatarViewModel = () => {
  /**
   * 메인 아바타 조회
   * Swift getMainAvatar 메서드 대응
   */
  const {
    data: mainAvatar,
    error: avatarError,
    isLoading: isLoadingAvatar,
    isFetching: isFetchingAvatar,
    refetch: refetchAvatar,
  } = useGetMainAvatar();

  // Mutations
  const { mutateAsync: updateAvatarItems, isPending: isUpdatingItems } = useUpdateAvatarItems();
  const { mutateAsync: purchaseAndEquipItem, isPending: isPurchasing } = usePurchaseAndEquipItem();
  const { mutateAsync: removeAvatarItem, isPending: isRemovingItem } = useRemoveAvatarItem();
  const { mutateAsync: removeAllItems, isPending: isRemovingAllItems } = useRemoveAllAvatarItems();

  /**
   * 아바타 아이템 업데이트
   * Swift updateAvatarItems 메서드 대응
   */
  const updateItems = useCallback(async (avatarId: number, itemIds: number[]) => {
    try {
      const result = await updateAvatarItems({ avatarId, itemIds });
      return result;
    } catch (error) {
      console.error('Failed to update avatar items:', error);
      throw error;
    }
  }, [updateAvatarItems]);

  /**
   * 아이템 구매 후 즉시 장착
   * Swift purchaseAndEquipItem 메서드 대응
   */
  const purchaseAndEquip = useCallback(async (avatarId: number, itemIds: number[]) => {
    try {
      const result = await purchaseAndEquipItem({ avatarId, itemIds });
      return result;
    } catch (error) {
      console.error('Failed to purchase and equip item:', error);
      throw error;
    }
  }, [purchaseAndEquipItem]);

  /**
   * 아바타 아이템 제거
   * Swift removeAvatarItem 메서드 대응
   */
  const removeItem = useCallback(async (avatarId: number, itemId: number) => {
    try {
      await removeAvatarItem({ avatarId, itemId });
    } catch (error) {
      console.error('Failed to remove avatar item:', error);
      throw error;
    }
  }, [removeAvatarItem]);

  /**
   * 아바타의 모든 아이템 제거
   * Swift removeAllAvatarItems 메서드 대응
   */
  const removeAllAvatarItems = useCallback(async (avatarId: number) => {
    try {
      await removeAllItems(avatarId);
    } catch (error) {
      console.error('Failed to remove all avatar items:', error);
      throw error;
    }
  }, [removeAllItems]);

  /**
   * 아바타 검증
   * Swift validateAvatar 메서드 대응
   */
  const isValidAvatar = useCallback((avatar?: Avatar): boolean => {
    if (!avatar) return false;
    return validateAvatar(avatar);
  }, []);

  /**
   * 아바타 포맷팅된 정보
   * Swift formatAvatar 메서드 대응
   */
  const formattedAvatar = useMemo(() => {
    if (!mainAvatar) return null;
    return formatAvatar(mainAvatar);
  }, [mainAvatar]);

  /**
   * 타입별 그룹화된 아이템
   * Swift groupItemsByType 메서드 대응
   */
  const itemsByType = useMemo(() => {
    if (!mainAvatar) return {};
    return groupItemsByType(mainAvatar.avatarItems);
  }, [mainAvatar]);

  /**
   * 착용 중인 아이템 목록
   * Swift getEquippedItems 메서드 대응
   */
  const equippedItems = useMemo(() => {
    if (!mainAvatar) return [];
    return getEquippedItems(mainAvatar);
  }, [mainAvatar]);

  /**
   * 특정 타입의 착용 아이템 조회
   * Swift getEquippedItemByType 메서드 대응
   */
  const getEquippedItemForType = useCallback((itemTypeName: string) => {
    if (!mainAvatar) return null;
    return getEquippedItemByType(mainAvatar, itemTypeName);
  }, [mainAvatar]);

  /**
   * 아바타 상태 확인
   */
  const avatarStatus = useMemo(() => {
    return {
      hasAvatar: !!mainAvatar,
      isValid: isValidAvatar(mainAvatar),
      totalItems: mainAvatar?.avatarItems.length || 0,
      equippedItemsCount: equippedItems.length,
      availableTypes: Object.keys(itemsByType),
    };
  }, [mainAvatar, isValidAvatar, equippedItems.length, itemsByType]);

  return {
    // Data
    mainAvatar,
    formattedAvatar,
    itemsByType,
    equippedItems,
    avatarStatus,

    // Loading states
    isLoadingAvatar,
    isFetchingAvatar,
    isUpdatingItems,
    isPurchasing,
    isRemovingItem,
    isRemovingAllItems,

    // Error states
    avatarError,

    // Actions
    updateItems,
    purchaseAndEquip,
    removeItem,
    removeAllAvatarItems,
    refetchAvatar,

    // Utility functions
    isValidAvatar,
    getEquippedItemForType,

    // Computed values
    isLoading: isLoadingAvatar || isFetchingAvatar,
    hasError: !!avatarError,
    canUpdateItems: !!mainAvatar && !isUpdatingItems,
    canPurchaseItems: !isPurchasing,
    canRemoveItems: !!mainAvatar && !isRemovingItem && !isRemovingAllItems,
  };
};
