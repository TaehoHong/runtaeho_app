import { useCallback, useMemo, useState } from 'react';
import {
  useGetAllItems,
  useGetItemsByType,
  useGetItemDetail,
  usePurchaseItem,
  useGetUserItems,
  useToggleUserItem,
  useDeleteUserItem,
  useGetItemTypes,
  useSearchItems,
  useGetPopularItems,
  useGetNewItems,
  useGetRecommendedItems,
} from '../../../services/avatar';
import type {
  Item,
  // UserItem, // TODO: 향후 사용자 아이템 데이터 처리용
  ItemSearch,
} from '../models';
import {
  formatItem,
  formatUserItem,
  validateItem,
  filterItemsByType,
  filterItemsByPrice,
  sortItems,
} from '../models';

/**
 * Item ViewModel
 * Swift Item 관련 비즈니스 로직을 React Hook으로 마이그레이션
 */
export const useItemViewModel = () => {
  // 검색 상태
  const [searchParams, setSearchParams] = useState<ItemSearch>({
    page: 0,
    size: 20,
  });
  const [sortConfig, setSortConfig] = useState<{
    sortBy: 'name' | 'point' | 'createdAt';
    order: 'asc' | 'desc';
  }>({
    sortBy: 'name',
    order: 'asc',
  });

  /**
   * 전체 아이템 목록 조회
   * Swift getAllItems 메서드 대응
   */
  const {
    data: itemListResponse,
    error: itemsError,
    isLoading: isLoadingItems,
    isFetching: isFetchingItems,
    refetch: refetchItems,
  } = useGetAllItems(searchParams);

  /**
   * 아이템 타입 목록 조회
   * Swift getItemTypes 메서드 대응
   */
  const {
    data: itemTypes,
    isLoading: isLoadingItemTypes,
  } = useGetItemTypes();

  /**
   * 사용자 보유 아이템 목록 조회
   * Swift getUserItems 메서드 대응
   */
  const {
    data: userItems,
    error: userItemsError,
    isLoading: isLoadingUserItems,
    refetch: refetchUserItems,
  } = useGetUserItems();

  /**
   * 인기 아이템 조회
   * Swift getPopularItems 메서드 대응
   */
  const {
    data: popularItems,
    isLoading: isLoadingPopularItems,
  } = useGetPopularItems({ limit: 10 });

  /**
   * 신규 아이템 조회
   * Swift getNewItems 메서드 대응
   */
  const {
    data: newItems,
    isLoading: isLoadingNewItems,
  } = useGetNewItems({ limit: 10 });

  /**
   * 추천 아이템 조회
   * Swift getRecommendedItems 메서드 대응
   */
  const {
    data: recommendedItems,
    isLoading: isLoadingRecommendedItems,
  } = useGetRecommendedItems({ limit: 10 });

  // Mutations
  const { mutateAsync: purchaseItem, isPending: isPurchasing } = usePurchaseItem();
  const { mutateAsync: toggleUserItem, isPending: isToggling } = useToggleUserItem();
  const { mutateAsync: deleteUserItem, isPending: isDeleting } = useDeleteUserItem();

  /**
   * 아이템 구매
   * Swift purchaseItem 메서드 대응
   */
  const handlePurchaseItem = useCallback(async (itemId: number, avatarId?: number) => {
    try {
      const result = await purchaseItem({ itemId, avatarId });
      return result;
    } catch (error) {
      console.error('Failed to purchase item:', error);
      throw error;
    }
  }, [purchaseItem]);

  /**
   * 사용자 아이템 활성화/비활성화
   * Swift toggleUserItem 메서드 대응
   */
  const handleToggleUserItem = useCallback(async (userItemId: number, isEnabled: boolean) => {
    try {
      const result = await toggleUserItem({ userItemId, isEnabled });
      return result;
    } catch (error) {
      console.error('Failed to toggle user item:', error);
      throw error;
    }
  }, [toggleUserItem]);

  /**
   * 사용자 아이템 삭제
   * Swift deleteUserItem 메서드 대응
   */
  const handleDeleteUserItem = useCallback(async (userItemId: number) => {
    try {
      await deleteUserItem(userItemId);
    } catch (error) {
      console.error('Failed to delete user item:', error);
      throw error;
    }
  }, [deleteUserItem]);

  /**
   * 검색 파라미터 업데이트
   * Swift updateSearchParams 메서드 대응
   */
  const updateSearchParams = useCallback((newParams: Partial<ItemSearch>) => {
    setSearchParams(prev => ({ ...prev, ...newParams }));
  }, []);

  /**
   * 정렬 설정 업데이트
   * Swift updateSortConfig 메서드 대응
   */
  const updateSortConfig = useCallback((
    sortBy: 'name' | 'point' | 'createdAt',
    order: 'asc' | 'desc' = 'asc'
  ) => {
    setSortConfig({ sortBy, order });
  }, []);

  /**
   * 아이템 유효성 검증
   * Swift validateItem 메서드 대응
   */
  const isValidItem = useCallback((item: Item): boolean => {
    return validateItem(item);
  }, []);

  /**
   * 포맷팅된 아이템 목록
   * Swift formatItems 메서드 대응
   */
  const formattedItems = useMemo(() => {
    if (!itemListResponse?.content) return [];
    return itemListResponse.content.map(item => formatItem(item));
  }, [itemListResponse]);

  /**
   * 포맷팅된 사용자 아이템 목록
   * Swift formatUserItems 메서드 대응
   */
  const formattedUserItems = useMemo(() => {
    if (!userItems) return [];
    return userItems.map(userItem => formatUserItem(userItem));
  }, [userItems]);

  /**
   * 정렬된 아이템 목록
   * Swift sortedItems 메서드 대응
   */
  const sortedItems = useMemo(() => {
    if (!itemListResponse?.content) return [];
    return sortItems(itemListResponse.content, sortConfig.sortBy, sortConfig.order);
  }, [itemListResponse, sortConfig]);

  /**
   * 타입별 필터링된 아이템
   * Swift filteredItemsByType 메서드 대응
   */
  const getItemsByType = useCallback((itemTypeId: number) => {
    if (!itemListResponse?.content) return [];
    return filterItemsByType(itemListResponse.content, itemTypeId);
  }, [itemListResponse]);

  /**
   * 가격 범위별 필터링된 아이템
   * Swift filteredItemsByPrice 메서드 대응
   */
  const getItemsByPriceRange = useCallback((minPoint: number, maxPoint: number) => {
    if (!itemListResponse?.content) return [];
    return filterItemsByPrice(itemListResponse.content, minPoint, maxPoint);
  }, [itemListResponse]);

  /**
   * 아이템 상태 정보
   */
  const itemStatus = useMemo(() => {
    return {
      totalItems: itemListResponse?.totalElements || 0,
      currentPage: itemListResponse?.page || 0,
      totalPages: itemListResponse?.totalPages || 0,
      hasNext: itemListResponse?.hasNext || false,
      userItemsCount: userItems?.length || 0,
      activeUserItemsCount: userItems?.filter(item => item.isEnabled && !item.isExpired).length || 0,
      availableItemTypes: itemTypes?.length || 0,
    };
  }, [itemListResponse, userItems, itemTypes]);

  return {
    // Data
    items: itemListResponse?.content || [],
    formattedItems,
    sortedItems,
    userItems: userItems || [],
    formattedUserItems,
    itemTypes: itemTypes || [],
    popularItems: popularItems || [],
    newItems: newItems || [],
    recommendedItems: recommendedItems || [],
    itemStatus,

    // Search & Filter
    searchParams,
    sortConfig,

    // Loading states
    isLoadingItems,
    isFetchingItems,
    isLoadingUserItems,
    isLoadingItemTypes,
    isLoadingPopularItems,
    isLoadingNewItems,
    isLoadingRecommendedItems,
    isPurchasing,
    isToggling,
    isDeleting,

    // Error states
    itemsError,
    userItemsError,

    // Actions
    handlePurchaseItem,
    handleToggleUserItem,
    handleDeleteUserItem,
    updateSearchParams,
    updateSortConfig,
    refetchItems,
    refetchUserItems,

    // Utility functions
    isValidItem,
    getItemsByType,
    getItemsByPriceRange,

    // Computed values
    isLoading: isLoadingItems || isFetchingItems || isLoadingUserItems,
    hasError: !!itemsError || !!userItemsError,
    canPurchase: !isPurchasing,
    canToggle: !isToggling,
    canDelete: !isDeleting,
    hasItems: (itemListResponse?.content?.length || 0) > 0,
    hasUserItems: (userItems?.length || 0) > 0,
  };
};

/**
 * 특정 아이템 상세 조회를 위한 Hook
 * Swift getItemDetail 메서드 대응
 */
export const useItemDetailViewModel = (itemId: number) => {
  const {
    data: item,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetItemDetail(itemId);

  const formattedItem = useMemo(() => {
    if (!item) return null;
    return formatItem(item);
  }, [item]);

  return {
    item,
    formattedItem,
    error,
    isLoading,
    isFetching,
    refetch,
    hasItem: !!item,
    hasError: !!error,
  };
};

/**
 * 특정 타입의 아이템 목록 조회를 위한 Hook
 * Swift getItemsByType 메서드 대응
 */
export const useItemsByTypeViewModel = (itemTypeId: number) => {
  const {
    data: items,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetItemsByType(itemTypeId);

  const formattedItems = useMemo(() => {
    if (!items) return [];
    return items.map(item => formatItem(item));
  }, [items]);

  return {
    items: items || [],
    formattedItems,
    error,
    isLoading,
    isFetching,
    refetch,
    hasItems: (items?.length || 0) > 0,
    hasError: !!error,
  };
};

/**
 * 아이템 검색을 위한 Hook
 * Swift searchItems 메서드 대응
 */
export const useItemSearchViewModel = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<ItemSearch>({});

  const {
    data: searchResults,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useSearchItems(
    { ...searchFilters, query: searchQuery },
    { skip: !searchQuery.trim() }
  );

  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const updateSearchFilters = useCallback((filters: Partial<ItemSearch>) => {
    setSearchFilters(prev => ({ ...prev, ...filters }));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchFilters({});
  }, []);

  return {
    searchQuery,
    searchFilters,
    searchResults: searchResults?.content || [],
    totalResults: searchResults?.totalElements || 0,
    error,
    isLoading,
    isFetching,
    updateSearchQuery,
    updateSearchFilters,
    clearSearch,
    refetch,
    hasResults: (searchResults?.content?.length || 0) > 0,
    hasError: !!error,
  };
};
