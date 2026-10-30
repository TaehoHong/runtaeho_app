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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ITEM_CATEGORIES,
  ItemStatus,
  useAvatarItems,
  usePurchaseItems,
  useUpdateEquippedItems,
  type Item,
  type EquippedItemsMap,
  type HairColor,
} from '~/features/avatar';
import { t } from '~/i18n';
import { unityService } from '~/features/unity/services/UnityService';
import { useUserStore } from '~/stores/user/userStore';
import { isSessionCurrent, useAuthStore, type SessionSnapshot } from '~/features/auth/stores/authStore';
import { SessionSupersededError } from '~/utils/storage/errors';

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
export type OwnershipFilter = 'owned' | 'all';

export interface AvatarViewModel {
  // State
  readonly ownershipFilter: OwnershipFilter;
  readonly actionError: string | null;
  readonly isItemsLoading: boolean;
  readonly isItemsFetching: boolean;
  readonly itemsError: boolean;
  retryItems: () => void;
  selectOwnershipFilter: (filter: OwnershipFilter) => void;
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
  const sessionGeneration = useAuthStore((state) => state.sessionGeneration);
  const userId = useUserStore((state) => state.currentUser?.id);
  const viewSession = useMemo<SessionSnapshot>(() => ({
    generation: sessionGeneration, userId: userId ?? null,
  }), [sessionGeneration, userId]);

  // 전역 equippedItems를 항상 Map으로 정규화해 사용
  const globalEquippedMap = useMemo<EquippedItemsMap>(() => normalizeEquippedMap(globalEquippedItems), [globalEquippedItems]);

  // ===================================
  // Local State
  // ===================================
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [pendingEquippedItems, setPendingEquippedItems] = useState<EquippedItemsMap>(() => normalizeEquippedMap(globalEquippedItems));
  const [pendingHairColor, setPendingHairColor] = useState<string>(() => globalHairColor);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showInsufficientPointsAlert, setShowInsufficientPointsAlert] = useState(false);

  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('owned');
  const [purchasedIds, setPurchasedIds] = useState<ReadonlySet<number>>(() => new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef<SessionSnapshot | null>(null);

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
    isLoading: isItemsLoading,
    isFetching: isItemsFetching,
    isError: itemsError,
    refetch: retryItems,
  } = useAvatarItems(selectedCategory);

  const purchaseMutation = usePurchaseItems();
  const updateEquippedMutation = useUpdateEquippedItems();

  // ===================================
  // Computed Values
  // ===================================

  const isOwned = useCallback((item: Item) => (
    item.isOwned === true || purchasedIds.has(item.id)
    || Object.values(globalEquippedMap).some(equipped => equipped?.id === item.id)
  ), [purchasedIds, globalEquippedMap]);

  // 선택(미리보기)과 실제 착용 상태는 별도로 표시한다.
  const currentCategoryItems = useMemo(() => {
    const items = itemsData?.pages.flatMap(page => page.content) ?? [];
    return items
      .filter(item => item.itemType.id === selectedCategory)
      .map(item => ({
        ...item,
        isOwned: isOwned(item),
        status: globalEquippedMap[item.itemType.id]?.id === item.id
          ? ItemStatus.EQUIPPED
          : isOwned(item) ? ItemStatus.OWNED : ItemStatus.NOT_OWNED,
      }))
      .filter(item => ownershipFilter === 'all' || item.isOwned);
  }, [itemsData, selectedCategory, isOwned, globalEquippedMap, ownershipFilter]);

  // Unity 프리뷰용 아이템
  const previewItems = pendingEquippedItems;

  // 헤어 카테고리 여부 (카테고리 type 1 = 머리)
  const isHairCategory = selectedCategory === 1;

  // 헤어 색상 변경 여부
  const hasHairColorChanged = pendingHairColor.toLowerCase() !== globalHairColor.toLowerCase();

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
  const itemsToPurchase = useMemo(() => (
    Object.values(pendingEquippedItems).filter(item => item && !isOwned(item))
  ), [pendingEquippedItems, isOwned]);

  const shouldShowPurchaseButton = itemsToPurchase.length > 0;

  // 총 구매 가격
  const totalPurchasePrice = useMemo(() => {
    return itemsToPurchase.reduce((sum, item) => sum + (item.point || 0), 0);
  }, [itemsToPurchase]);

  // 잔여 포인트
  const remainingPoints = totalPoint - totalPurchasePrice;

  const isLoading = isSaving || purchaseMutation.isPending || updateEquippedMutation.isPending;

  // ===================================
  // Effects
  // ===================================

  // Global 상태가 변경되면 Pending 상태 동기화
  useEffect(() => {
    setPendingEquippedItems(normalizeEquippedMap(globalEquippedItems));
  }, [globalEquippedItems]);

  // Global 헤어 색상이 변경되면 Pending 상태 동기화
  useEffect(() => {
    setPendingHairColor(globalHairColor);
  }, [globalHairColor]);

  useEffect(() => {
    savingRef.current = null;
    setIsSaving(false);
    setPurchasedIds(new Set());
    setActionError(null);
    setShowPurchaseModal(false);
    setShowInsufficientPointsAlert(false);
  }, [viewSession]);

  // ===================================
  // Actions
  // ===================================

  /**
   * 카테고리 선택
   */
  const selectCategory = useCallback((index: number) => {
    if (!savingRef.current) setSelectedCategoryIndex(index);
  }, []);

  /**
   * 헤어 색상 선택
   * Unity 동기화는 AvatarPreview에서 처리 (SPOT 원칙)
   */
  const selectHairColor = useCallback(
    (color: HairColor) => {
      if (savingRef.current) return;
      setActionError(null);
      // 같은 색상 재선택 시 무시
      if (pendingHairColor.toLowerCase() === color.hex.toLowerCase()) {
        return;
      }

      // Pending 상태 업데이트 - Unity 동기화는 AvatarPreview에서 처리
      setPendingHairColor(color.hex);

      if (__DEV__) {
        console.log(`🎨 [AvatarViewModel] Hair color selected: ${color.name} (${color.hex})`);
      }
    },
    [pendingHairColor]
  );

  /**
   * 아이템 선택
   * Unity 동기화는 AvatarPreview에서 처리 (SPOT 원칙)
   */
  const selectItem = useCallback(
    (item: Item) => {
      if (savingRef.current) return;
      setActionError(null);
      // 같은 아이템 재선택 시 무시
      if (pendingEquippedItems[item.itemType.id]?.id === item.id) {
        return;
      }

      // Pending 상태 업데이트 - Unity 동기화는 AvatarPreview에서 처리
      setPendingEquippedItems((prev) => ({
        ...prev,
        [item.itemType.id]: item,
      }));
    },
    [pendingEquippedItems]
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
    if (savingRef.current) return;
    setActionError(null);
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
  const applySelection = useCallback(async (items: EquippedItemsMap, sessionSnapshot: SessionSnapshot) => {
    if (!isSessionCurrent(sessionSnapshot)) throw new SessionSupersededError();
    await updateEquippedMutation.mutateAsync({
      avatarId,
      itemIds: toItemIds(items),
      hairColor: pendingHairColor,
      sessionSnapshot,
    });
    if (!isSessionCurrent(sessionSnapshot)) throw new SessionSupersededError();
    setEquippedItems(items);
    setGlobalHairColor(pendingHairColor);
  }, [avatarId, pendingHairColor, updateEquippedMutation, setEquippedItems, setGlobalHairColor]);

  const confirmPurchase = useCallback(async () => {
    if (savingRef.current || !isSessionCurrent(viewSession) || itemsToPurchase.length === 0) return;
    if (totalPoint < totalPurchasePrice) {
      setShowPurchaseModal(false);
      setShowInsufficientPointsAlert(true);
      return;
    }
    const sessionSnapshot = viewSession;
    savingRef.current = sessionSnapshot;
    setIsSaving(true);
    setActionError(null);
    let purchased = false;
    try {
      await purchaseMutation.mutateAsync({ itemIds: itemsToPurchase.map(item => item.id), sessionSnapshot });
      if (!isSessionCurrent(sessionSnapshot)) return;
      purchased = true;
      // 구매와 착용은 별도 API이므로 착용 실패 시에도 구매 완료 상태를 유지한다.
      setPurchasedIds(previous => new Set([...previous, ...itemsToPurchase.map(item => item.id)]));
      const ownedSelection = Object.fromEntries(
        Object.entries(pendingEquippedItems).map(([type, item]) => [type, { ...item, isOwned: true }])
      );
      setPendingEquippedItems(ownedSelection);
      setShowPurchaseModal(false);
      await applySelection(ownedSelection, sessionSnapshot);
    } catch {
      if (!isSessionCurrent(sessionSnapshot)) return;
      setShowPurchaseModal(false);
      setActionError(purchased
        ? t('구매는 완료됐지만 적용하지 못했어요. 다시 적용해주세요.')
        : t('아이템 구매에 실패했습니다.'));
    } finally {
      if (savingRef.current === sessionSnapshot) {
        savingRef.current = null;
        setIsSaving(false);
      }
    }
  }, [itemsToPurchase, totalPoint, totalPurchasePrice, purchaseMutation, pendingEquippedItems, applySelection, viewSession]);

  const confirmChanges = useCallback(async () => {
    if (savingRef.current || !isSessionCurrent(viewSession) || !hasChanges) return;
    if (shouldShowPurchaseButton) {
      attemptPurchase();
      return;
    }
    const sessionSnapshot = viewSession;
    savingRef.current = sessionSnapshot;
    setIsSaving(true);
    setActionError(null);
    try {
      await applySelection(pendingEquippedItems, sessionSnapshot);
    } catch {
      if (!isSessionCurrent(sessionSnapshot)) return;
      setActionError(t('착용 상태 업데이트에 실패했습니다.'));
    } finally {
      if (savingRef.current === sessionSnapshot) {
        savingRef.current = null;
        setIsSaving(false);
      }
    }
  }, [hasChanges, shouldShowPurchaseButton, attemptPurchase, applySelection, pendingEquippedItems, viewSession]);

  /**
   * 취소
   */
  const cancelChanges = useCallback(() => {
    if (savingRef.current) return;
    setActionError(null);
    setShowPurchaseModal(false);
    setShowInsufficientPointsAlert(false);
    // 아이템 상태 복원
    setPendingEquippedItems(normalizeEquippedMap(globalEquippedItems));

    // 헤어 색상 복원
    setPendingHairColor(globalHairColor);

    // Unity 프리뷰 복원 (원래 상태로)
    const items = Object.values(globalEquippedItems).filter((item): item is Item => !!item);
    void unityService.syncAvatar(items, globalHairColor, { waitForReady: true });

  }, [globalEquippedItems, globalHairColor]);

  // ===================================
  // Return ViewModel
  // ===================================
  return {
    // State
    ownershipFilter,
    selectOwnershipFilter: setOwnershipFilter,
    actionError,
    isItemsLoading,
    isItemsFetching,
    itemsError,
    retryItems,
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
