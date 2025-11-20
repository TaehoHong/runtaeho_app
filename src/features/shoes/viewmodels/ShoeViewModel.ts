import { useCallback, useMemo, useState } from 'react';
import { useInfiniteShoes, useAddShoe, usePatchShoe, useUpdateToMain } from '../services';
import {
  type Shoe,
  type PatchShoeDto,
  type ShoeViewModel as ShoeViewModelType,
  createShoeViewModel,
  createAddShoeDto,
  createPatchShoeDto,
  validateShoe,
  filterShoes,
  analyzeShoeStatus,
} from '../models';

/**
 * Shoe ViewModel
 * Swift ShoeViewModel을 React Hook으로 마이그레이션
 */
export const useShoeViewModel = () => {
  // 필터 상태
  const [shoeFilters, setShoeFilters] = useState<{
    isEnabled?: boolean;
    isMain?: boolean;
    brand?: string;
    hasTarget?: boolean;
    isAchieved?: boolean;
  }>({});

  /**
   * 신발 목록 조회 (무한 스크롤)
   */
  const {
    data: infiniteShoesData,
    error: shoesError,
    isLoading: isLoadingShoes,
    isFetching: isFetchingShoes,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchShoes,
  } = useInfiniteShoes({
    isEnabled: shoeFilters.isEnabled,
    size: 20,
  });


  // Mutations
  const { mutateAsync: addShoe, isPending: isAddingShoe } = useAddShoe();
  const { mutateAsync: patchShoe, isPending: isPatchingShoe } = usePatchShoe();
  const { mutateAsync: updateToMain, isPending: isUpdatingToMain } = useUpdateToMain();
  /**
   * 신발 추가
   */
  const handleAddShoe = useCallback(async (
    brand: string,
    model: string,
    targetDistance: number,
    isMain: boolean = false
  ) => {
    try {
      const addShoeDto = createAddShoeDto(brand, model, targetDistance, isMain);
      const result = await addShoe(addShoeDto);
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
      const result = await patchShoe(patchShoeDto);
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
  const deleteShoe = useCallback(async (shoeId: number) => {
    try {
      const patchShoeDto = createPatchShoeDto(shoeId, { isDeleted: true });
      const result = await patchShoe(patchShoeDto);
      return result;
    } catch (error) {
      console.error('Failed to delete shoe:', error);
      throw error;
    }
  }, [patchShoe]);

  /**
   * 메인 신발 설정
   * Swift setMainShoe 메서드 대응
   */
  const handleSetMainShoe = useCallback(async (shoeId: number) => {
    try {
      return await updateToMain(shoeId);
    } catch (error) {
      console.error('Failed to set main shoe:', error);
      throw error;
    }
  }, [updateToMain]);

  /**
   * 신발 활성화
   */
  const enableShoe = useCallback(async (shoeId: number) => {
    try {
      var isMain = false
      if(!mainShoe) isMain = true
      const patchShoeDto = createPatchShoeDto(shoeId, { isMain: isMain, isEnabled: true });
      return await patchShoe(patchShoeDto);
    } catch (error) {
      console.error('Failed to toggle shoe enabled:', error);
      throw error;
    }
  }, [patchShoe]);



  const disableShoe = useCallback(async (shoeId: number) => {
    try {
      const patchShoeDto = createPatchShoeDto(shoeId, { isMain: false, isEnabled: false });
      return await patchShoe(patchShoeDto);
    } catch (error) {
      console.error('Failed to toggle shoe enabled:', error);
      throw error;
    }
  }, [patchShoe]);

  /**
   * 필터 업데이트
   */
  const updateFilters = useCallback((newFilters: Partial<typeof shoeFilters>) => {
    setShoeFilters(prev => ({ ...prev, ...newFilters }));
  }, []);


  /**
   * 신발 유효성 검증
   */
  const validateShoeData = useCallback((shoe: Partial<Shoe>) => {
    return validateShoe(shoe);
  }, []);

  /**
   * 무한 스크롤된 신발 목록 결합
   */
  const shoes = useMemo(() => {
    if (!infiniteShoesData?.pages) return [];
    return infiniteShoesData.pages.flatMap(page => page.content);
  }, [infiniteShoesData]);

  /**
   * 메인 신발 (infiniteShoes에서 찾기)
   */
  const mainShoe = useMemo(() => {
    return shoes.find(shoe => shoe.isMain && shoe.isEnabled) || null;
  }, [shoes]);

  /**
   * 필터링된 신발 목록
   */
  const filteredShoes = useMemo(() => {
    return filterShoes(shoes, shoeFilters);
  }, [shoes, shoeFilters]);

  /**
   * 신발 뷰모델 목록
   */
  const shoeViewModels = useMemo(() => {
    return filteredShoes.map(createShoeViewModel);
  }, [filteredShoes]);

  /**
   * 메인 신발 뷰모델
   */
  const mainShoeViewModel = useMemo(() => {
    return mainShoe ? createShoeViewModel(mainShoe) : null;
  }, [mainShoe]);

  /**
   * 더 많은 신발 로드 (무한 스크롤)
   */
  const loadMoreShoes = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /**
   * 신발 새로고침
   */
  const refreshShoes = useCallback(async () => {
    await refetchShoes();
  }, [refetchShoes]);

  return {
    // Data
    shoes,
    filteredShoes,
    shoeViewModels,
    mainShoe,
    mainShoeViewModel,

    // Filters
    shoeFilters,

    // Loading states
    isLoadingShoes,
    isFetchingShoes,
    isFetchingNextPage,
    hasMoreShoes: hasNextPage || false,
    isAddingShoe,
    isPatchingShoe,

    // Error states
    shoesError,

    // Actions
    handleAddShoe,
    handlePatchShoe,
    deleteShoe,
    handleSetMainShoe,
    enableShoe,
    disableShoe,
    updateFilters,
    loadMoreShoes,
    refreshShoes,

    // Utility functions
    validateShoeData,

    // Computed values
    isLoading: isLoadingShoes,
    hasError: !!shoesError,
    canAddShoe: !isAddingShoe,
    canModifyShoes: !isPatchingShoe,
    totalShoes: shoes.length,
    activeShoes: shoes.filter(shoe => shoe.isEnabled).length,
    retiredShoes: shoes.filter(shoe => !shoe.isEnabled).length,
  };
};