/**
 * 아바타 ViewModel Hook
 *
 * 원칙:
 * - SRP: 아바타 화면의 비즈니스 로직만 담당
 * - UI 로직과 분리: 상태 관리 + 비즈니스 로직만
 * - 선언적 API: Hook으로 깔끔한 API 제공
 *
 * iOS AvatarManagementViewModel 포팅
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ITEM_CATEGORIES,
  toAvatarItems,
  toItemIds,
  useAvatarItems,
  usePurchaseItems,
  useUpdateEquippedItems,
  type AvatarItem,
  type EquippedItemsMap,
  type ItemType
} from '~/features/avatar';
import { getUnityService } from '~/features/unity/services/UnityService';
import { useUserStore } from '~/stores/user/userStore';

// 입력이 Map이 아니어도 안전하게 Map으로 변환
function normalizeEquippedMap(input: unknown): EquippedItemsMap {
  if (input instanceof Map) {
    return new Map(input) as EquippedItemsMap;
  }
  const obj = (input ?? {}) as Record<string, AvatarItem | undefined>;
  return new Map(
    Object.entries(obj).map(([k, v]) => [Number(k), v])
  ) as EquippedItemsMap;
}

/**
 * ViewModel 반환 타입
 */
export interface AvatarViewModel {
  // State
  readonly categories: typeof ITEM_CATEGORIES;
  readonly selectedCategoryIndex: number;
  readonly selectedCategory: ItemType;
  readonly currentCategoryItems: readonly AvatarItem[];
  readonly previewItems: EquippedItemsMap;
  readonly totalPoint: number;
  readonly hasChanges: boolean;
  readonly shouldShowPurchaseButton: boolean;
  readonly itemsToPurchase: readonly AvatarItem[];
  readonly totalPurchasePrice: number;
  readonly remainingPoints: number;
  readonly showPurchaseModal: boolean;
  readonly showInsufficientPointsAlert: boolean;
  readonly isLoading: boolean;

  // Actions
  selectCategory: (index: number) => void;
  selectItem: (item: AvatarItem) => void;
  isItemSelected: (itemId: number) => boolean;
  attemptPurchase: () => void;
  confirmPurchase: () => Promise<void>;
  confirmChanges: () => Promise<void>;
  cancelChanges: () => void;
  setShowPurchaseModal: (show: boolean) => void;
  setShowInsufficientPointsAlert: (show: boolean) => void;

  // Pagination
  fetchNextPage: () => void;
  hasNextPage: boolean | undefined;
}

/**
 * 아바타 ViewModel Hook
 *
 * iOS AvatarManagementViewModel의 로직 구현
 */
export function useAvatarViewModel(): AvatarViewModel {
  // ===================================
  // Global State (Zustand)
  // ===================================
  const avatarId = useUserStore((state) => state.avatarId);
  const globalEquippedItems = useUserStore((state) => state.equippedItems);
  const totalPoint = useUserStore((state) => state.totalPoint);
  const setEquippedItems = useUserStore((state) => state.setEquippedItems);
  const deductPoints = useUserStore((state) => state.deductPoints);

  // 전역 equippedItems를 항상 Map으로 정규화해 사용
  const globalEquippedMap = useMemo<EquippedItemsMap>(() => normalizeEquippedMap(globalEquippedItems), [globalEquippedItems]);

  // ===================================
  // Local State
  // ===================================
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [pendingEquippedItems, setPendingEquippedItems] = useState<EquippedItemsMap>(() => normalizeEquippedMap(globalEquippedItems));
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showInsufficientPointsAlert, setShowInsufficientPointsAlert] = useState(false);
  const [unityService] = useState(() => getUnityService());

  // 카테고리 정의
  const categories = ITEM_CATEGORIES;

  // selectedCategoryIndex가 범위를 벗어나는 것을 방지
  const selectedCategory = useMemo(() => {
    if (
      Array.isArray(categories) &&
      selectedCategoryIndex >= 0 &&
      selectedCategoryIndex < categories.length
    ) {
      return categories[selectedCategoryIndex].type;
    }
    // fallback: 첫 번째 카테고리 타입 또는 undefined
    return categories?.[0]?.type;
  }, [categories, selectedCategoryIndex]);

  // ===================================
  // React Query
  // ===================================
  const {
    data: itemsData,
    fetchNextPage,
    hasNextPage,
    isFetching,
  } = useAvatarItems(selectedCategory);

  const purchaseMutation = usePurchaseItems();
  const updateEquippedMutation = useUpdateEquippedItems();

  // ===================================
  // Computed Values
  // ===================================

  // 전체 아이템 리스트 (페이지 합치기)
  const allItems = useMemo(() => {
    if (!itemsData) return [];
    return itemsData.pages.flatMap((page) =>
      toAvatarItems(page.content, pendingEquippedItems)
    );
  }, [itemsData, pendingEquippedItems]);

  // 현재 카테고리 아이템만
  const currentCategoryItems = useMemo(() => {
    return allItems.filter((item) => item.itemType === selectedCategory);
  }, [allItems, selectedCategory]);

  // Unity 프리뷰용 아이템
  const previewItems = useMemo(() => pendingEquippedItems, [pendingEquippedItems]);

  // 변경 여부 확인
  const hasChanges = useMemo(() => {
    for (const [itemType, item] of pendingEquippedItems.entries()) {
      const globalItem = globalEquippedMap.get(itemType);
      if (item?.id !== globalItem?.id) {
        return true;
      }
    }
    return false;
  }, [pendingEquippedItems, globalEquippedMap]);

  // 구매해야 할 아이템
  const itemsToPurchase = useMemo(() => {
    const items: AvatarItem[] = [];
    for (const [, item] of pendingEquippedItems.entries()) {
      if (!item) continue;
      const originalItem = allItems.find((i) => i.id === item.id);
      if (originalItem && originalItem.status === "NOT_OWNED") {
        items.push(originalItem);
      }
    }
    return items;
  }, [pendingEquippedItems, allItems]);

  const shouldShowPurchaseButton = itemsToPurchase.length > 0;

  // 총 구매 가격
  const totalPurchasePrice = useMemo(() => {
    return itemsToPurchase.reduce((sum, item) => sum + (item.price || 0), 0);
  }, [itemsToPurchase]);

  // 잔여 포인트
  const remainingPoints = totalPoint - totalPurchasePrice;

  const isLoading = purchaseMutation.isPending || updateEquippedMutation.isPending;

  // ===================================
  // Effects
  // ===================================

  // Global 상태가 변경되면 Pending 상태 동기화
  useEffect(() => {
    setPendingEquippedItems(normalizeEquippedMap(globalEquippedItems));
  }, [globalEquippedItems]);

  // ===================================
  // Actions
  // ===================================

  /**
   * 카테고리 선택
   */
  const selectCategory = useCallback((index: number) => {
    setSelectedCategoryIndex(index);
  }, []);

  /**
   * 아이템 선택
   * iOS: selectItem(_ itemViewModel: AvatarItemViewModel)
   */
  const selectItem = useCallback(
    (item: AvatarItem) => {
      // 같은 아이템 재선택 시 무시
      if (pendingEquippedItems.get(item.itemType)?.id === item.id) {
        return;
      }

      // Unity 프리뷰 즉시 업데이트
      unityService.changeAvatar([item]);

      // Pending 상태 업데이트 (Map 불변 업데이트)
      setPendingEquippedItems((prev) => {
        const next = new Map(prev);
        next.set(item.itemType, item);
        return next as EquippedItemsMap;
      });
    },
    [pendingEquippedItems]
  );

  /**
   * 아이템 선택 여부 확인
   */
  const isItemSelected = useCallback(
    (itemId: number) => {
      return Array.from(pendingEquippedItems.values()).some((item) => item?.id === itemId);
    },
    [pendingEquippedItems]
  );

  /**
   * 구매 시도
   * iOS: attemptPurchase()
   */
  const attemptPurchase = useCallback(() => {
    if (totalPoint < totalPurchasePrice) {
      setShowInsufficientPointsAlert(true);
      return;
    }
    setShowPurchaseModal(true);
  }, [totalPoint, totalPurchasePrice]);

  /**
   * 구매 확인
   * iOS: confirmPurchase()
   */
  const confirmPurchase = useCallback(async () => {
    try {
      // 1. 아이템 구매
      await purchaseMutation.mutateAsync({
        itemIds: itemsToPurchase.map((i) => i.id),
      });

      // 2. 착용 상태 업데이트
      const itemIds = toItemIds(pendingEquippedItems);
      await updateEquippedMutation.mutateAsync({
        avatarId,
        itemIds,
      });

      // 3. 포인트 차감
      deductPoints(totalPurchasePrice);

      // 4. 전역 상태 동기화
      setEquippedItems(pendingEquippedItems);

      // 5. 모달 닫기
      setShowPurchaseModal(false);

      // TODO: 성공 토스트 표시
      console.log('✅ 구매 및 착용 완료');
    } catch (error) {
      console.error('❌ 구매 실패:', error);
      // TODO: 에러 토스트 표시
    }
  }, [
    itemsToPurchase,
    pendingEquippedItems,
    avatarId,
    totalPurchasePrice,
    purchaseMutation,
    updateEquippedMutation,
    deductPoints,
    setEquippedItems,
  ]);

  /**
   * 변경사항 확인
   * iOS: confirmChanges()
   */
  const confirmChanges = useCallback(async () => {
    if (shouldShowPurchaseButton) {
      // 구매 필요
      attemptPurchase();
    } else {
      // 착용만 업데이트
      try {
        const itemIds = toItemIds(pendingEquippedItems);
        await updateEquippedMutation.mutateAsync({
          avatarId,
          itemIds,
        });

        // 전역 상태 동기화
        setEquippedItems(pendingEquippedItems);

        // TODO: 성공 토스트 표시
        console.log('✅ 착용 완료');
      } catch (error) {
        console.error('❌ 착용 실패:', error);
        // TODO: 에러 토스트 표시
      }
    }
  }, [
    shouldShowPurchaseButton,
    attemptPurchase,
    pendingEquippedItems,
    avatarId,
    updateEquippedMutation,
    setEquippedItems,
  ]);

  /**
   * 취소
   * iOS: cancelChanges()
   */
  const cancelChanges = useCallback(() => {
    setPendingEquippedItems(normalizeEquippedMap(globalEquippedItems));
  }, [globalEquippedItems]);

  // ===================================
  // Return ViewModel
  // ===================================
  return {
    // State
    categories,
    selectedCategoryIndex,
    selectedCategory,
    currentCategoryItems,
    previewItems,
    totalPoint,
    hasChanges,
    shouldShowPurchaseButton,
    itemsToPurchase,
    totalPurchasePrice,
    remainingPoints,
    showPurchaseModal,
    showInsufficientPointsAlert,
    isLoading,

    // Actions
    selectCategory,
    selectItem,
    isItemSelected,
    attemptPurchase,
    confirmPurchase,
    confirmChanges,
    cancelChanges,
    setShowPurchaseModal,
    setShowInsufficientPointsAlert,

    // Pagination
    fetchNextPage,
    hasNextPage,
  };
}
