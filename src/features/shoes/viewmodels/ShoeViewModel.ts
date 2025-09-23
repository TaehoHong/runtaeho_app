import { useCallback, useMemo, useState } from 'react';
import {
  useGetShoesCursorQuery,
  useGetAllShoesQuery,
  useGetShoeDetailQuery,
  useGetMainShoeQuery,
  useAddShoeMutation,
  usePatchShoeMutation,
  useDeleteShoeMutation,
  useSetMainShoeMutation,
  useToggleShoeEnabledMutation,
  useUpdateShoeDistanceMutation,
  useSetShoeTargetMutation,
  useRetireShoeMutation,
  useGetShoeStatisticsQuery,
} from '../../../store/api/shoeApi';
import {
  Shoe,
  AddShoeDto,
  PatchShoeDto,
  ShoeViewModel as ShoeViewModelType,
  createShoeViewModel,
  createAddShoeDto,
  createPatchShoeDto,
  validateShoe,
  filterShoes,
  sortShoes,
  findMainShoe,
  calculateShoeStatistics,
  analyzeShoeStatus,
} from '../models';

/**
 * Shoe ViewModel
 * Swift ShoeViewModel을 React Hook으로 마이그레이션
 */
export const useShoeViewModel = () => {
  // 필터 및 정렬 상태
  const [shoeFilters, setShoeFilters] = useState<{
    isEnabled?: boolean;
    isMain?: boolean;
    brand?: string;
    hasTarget?: boolean;
    isAchieved?: boolean;
  }>({});

  const [sortConfig, setSortConfig] = useState<{
    sortBy: 'brand' | 'model' | 'totalDistance' | 'targetDistance' | 'createdAt';
    order: 'asc' | 'desc';
  }>({
    sortBy: 'createdAt',
    order: 'desc',
  });

  /**
   * 신발 목록 조회 (커서 기반)
   * Swift ShoeApiService.fetchShoesCursor 대응
   */
  const {
    data: shoesData,
    error: shoesError,
    isLoading: isLoadingShoes,
    isFetching: isFetchingShoes,
    refetch: refetchShoes,
  } = useGetShoesCursorQuery({
    isEnabled: shoeFilters.isEnabled,
    size: 20,
  });

  /**
   * 모든 신발 조회
   * Swift getAllShoes 대응
   */
  const {
    data: allShoes,
    error: allShoesError,
    isLoading: isLoadingAllShoes,
    refetch: refetchAllShoes,
  } = useGetAllShoesQuery({
    isEnabled: shoeFilters.isEnabled,
  });

  /**
   * 메인 신발 조회
   * Swift getMainShoe 대응
   */
  const {
    data: mainShoe,
    error: mainShoeError,
    isLoading: isLoadingMainShoe,
    refetch: refetchMainShoe,
  } = useGetMainShoeQuery();

  /**
   * 신발 통계 조회
   * Swift calculateShoeStatistics 대응
   */
  const {
    data: shoeStatistics,
    isLoading: isLoadingStatistics,
  } = useGetShoeStatisticsQuery();

  // Mutations
  const [addShoe, { isLoading: isAddingShoe }] = useAddShoeMutation();
  const [patchShoe, { isLoading: isPatchingShoe }] = usePatchShoeMutation();
  const [deleteShoe, { isLoading: isDeletingShoe }] = useDeleteShoeMutation();
  const [setMainShoe, { isLoading: isSettingMainShoe }] = useSetMainShoeMutation();
  const [toggleShoeEnabled, { isLoading: isTogglingShoe }] = useToggleShoeEnabledMutation();
  const [updateShoeDistance, { isLoading: isUpdatingDistance }] = useUpdateShoeDistanceMutation();
  const [setShoeTarget, { isLoading: isSettingTarget }] = useSetShoeTargetMutation();
  const [retireShoe, { isLoading: isRetiringShoe }] = useRetireShoeMutation();

  /**
   * 신발 추가
   * Swift addShoe 메서드 대응
   */
  const handleAddShoe = useCallback(async (
    brand: string,
    model: string,
    targetDistance: number,
    isMain: boolean = false
  ) => {
    try {
      const addShoeDto = createAddShoeDto(brand, model, targetDistance, isMain);
      const result = await addShoe(addShoeDto).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to add shoe:', error);
      throw error;
    }
  }, [addShoe]);

  /**
   * 신발 수정
   * Swift patchShoe 메서드 대응
   */
  const handlePatchShoe = useCallback(async (
    id: number,
    updates: Partial<Omit<PatchShoeDto, 'id'>>
  ) => {
    try {
      const patchShoeDto = createPatchShoeDto(id, updates);
      const result = await patchShoe(patchShoeDto).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to patch shoe:', error);
      throw error;
    }
  }, [patchShoe]);

  /**
   * 신발 삭제
   * Swift deleteShoe 메서드 대응
   */
  const handleDeleteShoe = useCallback(async (shoeId: number) => {
    try {
      await deleteShoe(shoeId).unwrap();
    } catch (error) {
      console.error('Failed to delete shoe:', error);
      throw error;
    }
  }, [deleteShoe]);

  /**
   * 메인 신발 설정
   * Swift setMainShoe 메서드 대응
   */
  const handleSetMainShoe = useCallback(async (shoeId: number) => {
    try {
      const result = await setMainShoe(shoeId).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to set main shoe:', error);
      throw error;
    }
  }, [setMainShoe]);

  /**
   * 신발 활성화/비활성화
   * Swift toggleShoeEnabled 메서드 대응
   */
  const handleToggleShoeEnabled = useCallback(async (shoeId: number, isEnabled: boolean) => {
    try {
      const result = await toggleShoeEnabled({ shoeId, isEnabled }).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to toggle shoe enabled:', error);
      throw error;
    }
  }, [toggleShoeEnabled]);

  /**
   * 신발 거리 업데이트
   * Swift updateShoeDistance 메서드 대응
   */
  const handleUpdateShoeDistance = useCallback(async (shoeId: number, distance: number) => {
    try {
      const result = await updateShoeDistance({ shoeId, distance }).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to update shoe distance:', error);
      throw error;
    }
  }, [updateShoeDistance]);

  /**
   * 신발 목표 설정
   * Swift setShoeTarget 메서드 대응
   */
  const handleSetShoeTarget = useCallback(async (shoeId: number, targetDistance: number) => {
    try {
      const result = await setShoeTarget({ shoeId, targetDistance }).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to set shoe target:', error);
      throw error;
    }
  }, [setShoeTarget]);

  /**
   * 신발 은퇴 처리
   * Swift retireShoe 메서드 대응
   */
  const handleRetireShoe = useCallback(async (shoeId: number) => {
    try {
      const result = await retireShoe(shoeId).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to retire shoe:', error);
      throw error;
    }
  }, [retireShoe]);

  /**
   * 필터 업데이트
   */
  const updateFilters = useCallback((newFilters: Partial<typeof shoeFilters>) => {
    setShoeFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * 정렬 설정 업데이트
   */
  const updateSortConfig = useCallback((
    sortBy: typeof sortConfig.sortBy,
    order: 'asc' | 'desc' = 'asc'
  ) => {
    setSortConfig({ sortBy, order });
  }, []);

  /**
   * 신발 유효성 검증
   */
  const validateShoeData = useCallback((shoe: Partial<Shoe>) => {
    return validateShoe(shoe);
  }, []);

  /**
   * 필터링 및 정렬된 신발 목록
   */
  const processedShoes = useMemo(() => {
    if (!allShoes) return [];

    const filtered = filterShoes(allShoes, shoeFilters);
    return sortShoes(filtered, sortConfig.sortBy, sortConfig.order);
  }, [allShoes, shoeFilters, sortConfig]);

  /**
   * 신발 뷰모델 목록
   * Swift ShoeViewModel 배열 대응
   */
  const shoeViewModels = useMemo(() => {
    return processedShoes.map(createShoeViewModel);
  }, [processedShoes]);

  /**
   * 메인 신발 뷰모델
   */
  const mainShoeViewModel = useMemo(() => {
    return mainShoe ? createShoeViewModel(mainShoe) : null;
  }, [mainShoe]);

  /**
   * 로컬 통계 계산
   */
  const localStatistics = useMemo(() => {
    if (!allShoes) return null;
    return calculateShoeStatistics(allShoes);
  }, [allShoes]);

  /**
   * 신발 상태 분석
   */
  const analyzeShoe = useCallback((shoe: Shoe) => {
    return analyzeShoeStatus(shoe);
  }, []);

  /**
   * 더 많은 신발 로드
   */
  const loadMoreShoes = useCallback(async () => {
    if (shoesData?.cursor) {
      // 커서 기반 페이지네이션 로직은 RTK Query에서 자동 처리
      await refetchShoes();
    }
  }, [shoesData?.cursor, refetchShoes]);

  /**
   * 신발 새로고침
   */
  const refreshShoes = useCallback(async () => {
    await Promise.all([
      refetchShoes(),
      refetchAllShoes(),
      refetchMainShoe(),
    ]);
  }, [refetchShoes, refetchAllShoes, refetchMainShoe]);

  return {
    // Data
    shoes: shoesData?.content || [],
    allShoes: allShoes || [],
    processedShoes,
    shoeViewModels,
    mainShoe,
    mainShoeViewModel,
    shoeStatistics: shoeStatistics || localStatistics,

    // Filters and sorting
    shoeFilters,
    sortConfig,

    // Loading states
    isLoadingShoes,
    isFetchingShoes,
    isLoadingAllShoes,
    isLoadingMainShoe,
    isLoadingStatistics,
    hasMoreShoes: shoesData?.hasNext || false,
    isAddingShoe,
    isPatchingShoe,
    isDeletingShoe,
    isSettingMainShoe,
    isTogglingShoe,
    isUpdatingDistance,
    isSettingTarget,
    isRetiringShoe,

    // Error states
    shoesError,
    allShoesError,
    mainShoeError,

    // Actions
    handleAddShoe,
    handlePatchShoe,
    handleDeleteShoe,
    handleSetMainShoe,
    handleToggleShoeEnabled,
    handleUpdateShoeDistance,
    handleSetShoeTarget,
    handleRetireShoe,
    updateFilters,
    updateSortConfig,
    loadMoreShoes,
    refreshShoes,

    // Utility functions
    validateShoeData,
    analyzeShoe,

    // Computed values
    isLoading: isLoadingShoes || isLoadingAllShoes || isLoadingMainShoe,
    hasError: !!shoesError || !!allShoesError || !!mainShoeError,
    canAddShoe: !isAddingShoe,
    canModifyShoes: !isPatchingShoe && !isDeletingShoe && !isTogglingShoe,
    canSetMain: !isSettingMainShoe,
    totalShoes: allShoes?.length || 0,
    activeShoes: allShoes?.filter(shoe => shoe.isEnabled).length || 0,
    retiredShoes: allShoes?.filter(shoe => !shoe.isEnabled).length || 0,
  };
};

/**
 * 개별 신발 상세 조회를 위한 Hook
 * Swift getShoeDetail 대응
 */
export const useShoeDetailViewModel = (shoeId: number) => {
  const {
    data: shoe,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetShoeDetailQuery(shoeId);

  const shoeViewModel = useMemo(() => {
    return shoe ? createShoeViewModel(shoe) : null;
  }, [shoe]);

  const shoeStatus = useMemo(() => {
    return shoe ? analyzeShoeStatus(shoe) : null;
  }, [shoe]);

  return {
    shoe,
    shoeViewModel,
    shoeStatus,
    error,
    isLoading,
    isFetching,
    refetch,
    hasShoe: !!shoe,
    hasError: !!error,
  };
};

/**
 * 현재 메인 신발을 위한 Hook
 * Swift CurrentShoeViewModel 대응
 */
export const useCurrentShoeViewModel = () => {
  const {
    data: mainShoe,
    error,
    isLoading,
    refetch,
  } = useGetMainShoeQuery();

  const [setMainShoe, { isLoading: isSettingMain }] = useSetMainShoeMutation();
  const [updateDistance, { isLoading: isUpdatingDistance }] = useUpdateShoeDistanceMutation();

  const mainShoeViewModel = useMemo(() => {
    return mainShoe ? createShoeViewModel(mainShoe) : null;
  }, [mainShoe]);

  const shoeStatus = useMemo(() => {
    return mainShoe ? analyzeShoeStatus(mainShoe) : null;
  }, [mainShoe]);

  const handleSetAsMain = useCallback(async (shoeId: number) => {
    try {
      const result = await setMainShoe(shoeId).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to set main shoe:', error);
      throw error;
    }
  }, [setMainShoe]);

  const handleUpdateDistance = useCallback(async (distance: number) => {
    if (!mainShoe) return;

    try {
      const result = await updateDistance({ shoeId: mainShoe.id, distance }).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to update main shoe distance:', error);
      throw error;
    }
  }, [mainShoe, updateDistance]);

  return {
    mainShoe,
    mainShoeViewModel,
    shoeStatus,
    error,
    isLoading,
    isSettingMain,
    isUpdatingDistance,
    handleSetAsMain,
    handleUpdateDistance,
    refetch,
    hasMainShoe: !!mainShoe,
    hasError: !!error,
    canUpdate: !!mainShoe && !isUpdatingDistance,
  };
};