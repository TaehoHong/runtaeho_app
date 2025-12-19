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
  ItemStatus,
  useAvatarItems,
  usePurchaseItems,
  useUpdateEquippedItems,
  type Item,
  type EquippedItemsMap,
  type HairColor,
  DEFAULT_HAIR_COLOR,
} from '~/features/avatar';
import { unityService } from '~/features/unity/services/UnityService';
import { useUserStore } from '~/stores/user/userStore';

// ===================================
// Helper Functions (로컬 유틸리티)
// ===================================

/**
 * 입력을 EquippedItemsMap (Record)로 정규화
 */
function normalizeEquippedMap(input: unknown): EquippedItemsMap {
  if (!input) return {} as EquippedItemsMap;

  // Map 객체인 경우 Record로 변환
  if (input instanceof Map) {
    const record: Record<number, Item | undefined> = {};
    for (const [key, value] of input.entries()) {
      record[key as number] = value;
    }
    return record as EquippedItemsMap;
  }

  // 이미 Record인 경우
  return input as EquippedItemsMap;
}

function toItems(
  items: any[],
  equippedMap: EquippedItemsMap
): Item[] {
  return items.map((item) => {
    // equippedMap에 해당 itemType.id의 아이템이 있고, 그 ID가 현재 item.id와 같으면 EQUIPPED
    const equippedValues = Object.values(equippedMap);
    const isEquipped = equippedValues.some(
      (equippedItem) => equippedItem?.id === item.id
    );

    // 상태 결정 로직
    let status: ItemStatus;
    if (isEquipped) {
      status = ItemStatus.EQUIPPED;      // 착용 중
    } else if (item.isOwned === true) {
      status = ItemStatus.OWNED;         // 보유했지만 미착용
    } else {
      status = ItemStatus.NOT_OWNED;     // 미보유
    }

    return {
      id: item.id,
      name: item.name,
      itemType: item.itemType, // 백엔드 구조 그대로 사용 {id, name}
      filePath: item.filePath,
      unityFilePath: item.unityFilePath,
      point: item.point,
      createdAt: item.createdAt,
      isOwned: item.isOwned,             // 백엔드 값 유지
      status,                             // 계산된 상태
    };
  });
}

/**
 * EquippedItemsMap에서 아이템 ID 배열만 추출
 */
function toItemIds(equippedMap: EquippedItemsMap): readonly number[] {
  const ids: number[] = [];
  for (const item of Object.values(equippedMap)) {
    if (item?.id) {
      ids.push(item.id);
    }
  }
  return ids;
}

/**
 * ViewModel 반환 타입
 */
export interface AvatarViewModel {
  // State
  readonly categories: typeof ITEM_CATEGORIES;
  readonly selectedCategoryIndex: number;
  readonly selectedCategory: number;
  readonly currentCategoryItems: readonly Item[];
  readonly previewItems: EquippedItemsMap;
  readonly totalPoint: number;
  readonly hasChanges: boolean;
  readonly shouldShowPurchaseButton: boolean;
  readonly itemsToPurchase: readonly Item[];
  readonly totalPurchasePrice: number;
  readonly remainingPoints: number;
  readonly showPurchaseModal: boolean;
  readonly showInsufficientPointsAlert: boolean;
  readonly isLoading: boolean;

  // Hair Color State
  readonly pendingHairColor: string;
  readonly hasHairColorChanged: boolean;
  readonly isHairCategory: boolean;

  // Actions
  selectCategory: (index: number) => void;
  selectItem: (item: Item) => void;
  isItemSelected: (itemId: number) => boolean;
  attemptPurchase: () => void;
  confirmPurchase: () => Promise<void>;
  confirmChanges: () => Promise<void>;
  cancelChanges: () => void;
  setShowPurchaseModal: (show: boolean) => void;
  setShowInsufficientPointsAlert: (show: boolean) => void;
  selectHairColor: (color: HairColor) => void;

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
  const globalHairColor = useUserStore((state) => state.hairColor);
  const setEquippedItems = useUserStore((state) => state.setEquippedItems);
  const setGlobalHairColor = useUserStore((state) => state.setHairColor);

  // 전역 equippedItems를 항상 Map으로 정규화해 사용
  const globalEquippedMap = useMemo<EquippedItemsMap>(() => normalizeEquippedMap(globalEquippedItems), [globalEquippedItems]);

  // ===================================
  // Local State
  // ===================================
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [pendingEquippedItems, setPendingEquippedItems] = useState<EquippedItemsMap>(() => normalizeEquippedMap(globalEquippedItems));
  const [pendingHairColor, setPendingHairColor] = useState<string>(() => globalHairColor || DEFAULT_HAIR_COLOR.hex);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showInsufficientPointsAlert, setShowInsufficientPointsAlert] = useState(false);

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
      toItems(page.content, pendingEquippedItems)
    );
  }, [itemsData, pendingEquippedItems]);

  // 현재 카테고리 아이템만
  const currentCategoryItems = useMemo(() => {
    return allItems.filter((item) => item.itemType.id === selectedCategory);
  }, [allItems, selectedCategory]);

  // Unity 프리뷰용 아이템
  const previewItems = pendingEquippedItems;

  // 헤어 카테고리 여부 (카테고리 type 1 = 머리)
  const isHairCategory = selectedCategory === 1;

  // 헤어 색상 변경 여부
  const hasHairColorChanged = pendingHairColor.toLowerCase() !== (globalHairColor || DEFAULT_HAIR_COLOR.hex).toLowerCase();

  // 변경 여부 확인 (아이템 + 헤어 색상)
  const hasChanges = useMemo(() => {
    // 헤어 색상 변경 확인
    if (hasHairColorChanged) {
      return true;
    }

    // 아이템 변경 확인
    for (const [itemTypeId, item] of Object.entries(pendingEquippedItems)) {
      const globalItem = globalEquippedMap[itemTypeId as unknown as number];
      if (item?.id !== globalItem?.id) {
        return true;
      }
    }
    return false;
  }, [pendingEquippedItems, globalEquippedMap, hasHairColorChanged]);

  // 구매해야 할 아이템
  const itemsToPurchase = useMemo(() => {
    const items: Item[] = [];
    for (const item of Object.values(pendingEquippedItems)) {
      if (!item) continue;
      const originalItem = allItems.find((i) => i.id === item.id);
      if (originalItem && !originalItem.isOwned) {
        items.push(originalItem);
      }
    }
    return items;
  }, [pendingEquippedItems, allItems]);

  const shouldShowPurchaseButton = itemsToPurchase.length > 0;

  // 총 구매 가격
  const totalPurchasePrice = useMemo(() => {
    return itemsToPurchase.reduce((sum, item) => sum + (item.point || 0), 0);
  }, [itemsToPurchase]);

  // 잔여 포인트
  const remainingPoints = totalPoint - totalPurchasePrice;

  const isLoading = purchaseMutation.isPending || updateEquippedMutation.isPending;

  // ===================================
  // Effects
  // ===================================

  // 아바타 화면 마운트 시 Unity에 현재 장착 아이템과 헤어 색상 전송
  useEffect(() => {
    const items = Object.values(globalEquippedMap).filter((item): item is Item => !!item);
    const hairColor = globalHairColor || DEFAULT_HAIR_COLOR.hex;

    if (items.length > 0) {
      unityService.changeAvatar(items, hairColor);
      if (__DEV__) {
        console.log('🎨 [AvatarViewModel] Initial avatar sync to Unity:', items.length, 'items, hairColor:', hairColor);
      }
    }
  }, []); // 마운트 시 1회만 실행

  // Global 상태가 변경되면 Pending 상태 동기화
  useEffect(() => {
    setPendingEquippedItems(normalizeEquippedMap(globalEquippedItems));
  }, [globalEquippedItems]);

  // Global 헤어 색상이 변경되면 Pending 상태 동기화
  useEffect(() => {
    setPendingHairColor(globalHairColor || DEFAULT_HAIR_COLOR.hex);
  }, [globalHairColor]);

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
   * 헤어 색상 선택
   */
  const selectHairColor = useCallback(
    (color: HairColor) => {
      // 같은 색상 재선택 시 무시
      if (pendingHairColor.toLowerCase() === color.hex.toLowerCase()) {
        return;
      }

      // Pending 상태 업데이트
      setPendingHairColor(color.hex);

      // Unity 프리뷰 즉시 업데이트 (현재 장착된 아이템과 함께)
      const items = Object.values(pendingEquippedItems).filter((item): item is Item => !!item);
      unityService.changeAvatar(items, color.hex);

      if (__DEV__) {
        console.log(`🎨 [AvatarViewModel] Hair color selected: ${color.name} (${color.hex})`);
      }
    },
    [pendingHairColor, pendingEquippedItems]
  );

  /**
   * 아이템 선택
   */
  const selectItem = useCallback(
    (item: Item) => {
      // 같은 아이템 재선택 시 무시
      if (pendingEquippedItems[item.itemType.id]?.id === item.id) {
        return;
      }

      // Unity 프리뷰 즉시 업데이트 (헤어 색상 포함)
      unityService.changeAvatar([item], pendingHairColor);

      // Pending 상태 업데이트 (Record 불변 업데이트)
      setPendingEquippedItems((prev) => ({
        ...prev,
        [item.itemType.id]: item,
      }));
    },
    [pendingEquippedItems, pendingHairColor]
  );

  /**
   * 아이템 선택 여부 확인
   */
  const isItemSelected = useCallback(
    (itemId: number) => {
      return Object.values(pendingEquippedItems).some((item) => item?.id === itemId);
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
   *
   * 포인트 동기화는 usePurchaseItems의 onSuccess에서 서버 조회로 처리됨
   */
  const confirmPurchase = useCallback(async () => {
    try {
      // 1. 아이템 구매 (포인트 동기화는 mutation onSuccess에서 처리)
      await purchaseMutation.mutateAsync({
        itemIds: itemsToPurchase.map((i) => i.id),
      });

      // 2. 착용 상태 업데이트 (헤어 색상 포함)
      const itemIds = toItemIds(pendingEquippedItems);
      await updateEquippedMutation.mutateAsync({
        avatarId,
        itemIds,
        hairColor: pendingHairColor,
      });

      // 3. 전역 상태 동기화 (아이템 + 헤어 색상)
      setEquippedItems(pendingEquippedItems);
      setGlobalHairColor(pendingHairColor);

      // 4. 모달 닫기
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
    pendingHairColor,
    avatarId,
    purchaseMutation,
    updateEquippedMutation,
    setEquippedItems,
    setGlobalHairColor,
  ]);

  /**
   * 변경사항 확인
   */
  const confirmChanges = useCallback(async () => {
    if (shouldShowPurchaseButton) {
      // 구매 필요
      attemptPurchase();
    } else {
      // 착용만 업데이트 (헤어 색상 포함)
      try {
        const itemIds = toItemIds(pendingEquippedItems);
        await updateEquippedMutation.mutateAsync({
          avatarId,
          itemIds,
          hairColor: pendingHairColor,
        });

        // 전역 상태 동기화 (아이템 + 헤어 색상)
        setEquippedItems(pendingEquippedItems);
        setGlobalHairColor(pendingHairColor);

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
    pendingHairColor,
    avatarId,
    updateEquippedMutation,
    setEquippedItems,
    setGlobalHairColor,
  ]);

  /**
   * 취소
   */
  const cancelChanges = useCallback(() => {
    // 아이템 상태 복원
    setPendingEquippedItems(normalizeEquippedMap(globalEquippedItems));

    // 헤어 색상 복원
    setPendingHairColor(globalHairColor || DEFAULT_HAIR_COLOR.hex);

    // Unity 프리뷰 복원 (원래 상태로)
    const items = Object.values(globalEquippedItems).filter((item): item is Item => !!item);
    unityService.changeAvatar(items, globalHairColor || DEFAULT_HAIR_COLOR.hex);

  }, [globalEquippedItems, globalHairColor]);

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

    // Hair Color State
    pendingHairColor,
    hasHairColorChanged,
    isHairCategory,

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
    selectHairColor,

    // Pagination
    fetchNextPage,
    hasNextPage,
  };
}
