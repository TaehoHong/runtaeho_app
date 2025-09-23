import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  useGetPointHistoriesQuery,
  useGetUserPointQuery,
  useUpdateUserPointMutation,
  useEarnRunningPointsMutation,
  useSpendPointsForItemMutation,
  useEarnDailyBonusMutation,
  useGetRecentPointHistoriesQuery,
  useGetPointStatisticsQuery,
} from '../../../store/api/pointApi';
import {
  PointFilter,
  PointHistory,
  PointHistoryViewModel,
  createPointHistoryViewModel,
  filterPointHistories,
  getIsEarnedFromFilter,
  getThreeMonthsAgo,
  calculatePointStatistics,
} from '../models';

/**
 * Point ViewModel
 * Swift PointViewModel을 React Hook으로 마이그레이션
 */
export const usePointViewModel = (initialPoints: number = 0) => {
  // 상태 관리
  const [selectedFilter, setSelectedFilter] = useState<PointFilter>(PointFilter.ALL);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPoints, setCurrentPoints] = useState(initialPoints);

  // 하이브리드 방식을 위한 상태 (Swift와 동일)
  const [allRecentHistories, setAllRecentHistories] = useState<PointHistoryViewModel[]>([]);
  const [olderHistories, setOlderHistories] = useState<PointHistoryViewModel[]>([]);
  const [lastPointHistoryId, setLastPointHistoryId] = useState<number | undefined>();

  /**
   * 사용자 포인트 조회
   * Swift currentPoints 대응
   */
  const {
    data: userPoint,
    error: pointError,
    isLoading: isLoadingPoint,
    refetch: refetchUserPoint,
  } = useGetUserPointQuery();

  /**
   * 최근 3개월 포인트 히스토리 조회 (필터 없이)
   * Swift loadInitialData의 최근 3개월 데이터 로드 부분
   */
  const {
    data: recentHistoriesData,
    error: recentError,
    isLoading: isLoadingRecent,
    refetch: refetchRecent,
  } = useGetRecentPointHistoriesQuery({
    startDate: getThreeMonthsAgo(),
  });

  /**
   * 필터링된 이전 히스토리 조회
   * Swift loadOlderHistories 메서드 대응
   */
  const {
    data: olderHistoriesData,
    error: olderError,
    isLoading: isLoadingOlder,
    isFetching: isFetchingOlder,
    refetch: refetchOlder,
  } = useGetPointHistoriesQuery(
    {
      cursor: lastPointHistoryId,
      isEarned: getIsEarnedFromFilter(selectedFilter),
      size: 30,
    },
    {
      skip: !lastPointHistoryId,
    }
  );

  /**
   * 포인트 통계 조회
   */
  const {
    data: pointStatistics,
    isLoading: isLoadingStatistics,
  } = useGetPointStatisticsQuery();

  // Mutations
  const [updateUserPoint, { isLoading: isUpdatingPoint }] = useUpdateUserPointMutation();
  const [earnRunningPoints, { isLoading: isEarningPoints }] = useEarnRunningPointsMutation();
  const [spendPointsForItem, { isLoading: isSpendingPoints }] = useSpendPointsForItemMutation();
  const [earnDailyBonus, { isLoading: isEarningBonus }] = useEarnDailyBonusMutation();

  /**
   * 최근 히스토리 데이터 처리
   * Swift allRecentHistories 업데이트 로직
   */
  useEffect(() => {
    if (recentHistoriesData?.content) {
      const viewModels = recentHistoriesData.content.map(createPointHistoryViewModel);
      setAllRecentHistories(viewModels);
      setLastPointHistoryId(recentHistoriesData.cursor);
    }
  }, [recentHistoriesData]);

  /**
   * 이전 히스토리 데이터 처리
   * Swift olderHistories 업데이트 로직
   */
  useEffect(() => {
    if (olderHistoriesData?.content) {
      const viewModels = olderHistoriesData.content.map(createPointHistoryViewModel);
      setOlderHistories(prev => [...prev, ...viewModels]);
    }
  }, [olderHistoriesData]);

  /**
   * 사용자 포인트 업데이트
   */
  useEffect(() => {
    if (userPoint?.point !== undefined) {
      setCurrentPoints(userPoint.point);
    }
  }, [userPoint]);

  /**
   * 필터링된 포인트 히스토리
   * Swift filteredPointHistory computed property 대응
   */
  const filteredPointHistory = useMemo(() => {
    const recentFiltered = filterPointHistories(allRecentHistories, selectedFilter);
    return [...recentFiltered, ...olderHistories];
  }, [allRecentHistories, olderHistories, selectedFilter]);

  /**
   * 필터 변경
   * Swift selectFilter 메서드 대응
   */
  const selectFilter = useCallback((filter: PointFilter) => {
    const previousFilter = selectedFilter;
    setSelectedFilter(filter);
    setShowFilterDropdown(false);

    // 3개월 이전 데이터는 필터가 변경될 때만 다시 로드
    if (previousFilter !== filter && olderHistories.length > 0) {
      setOlderHistories([]);
      refetchOlder();
    }
  }, [selectedFilter, olderHistories.length, refetchOlder]);

  /**
   * 드롭다운 토글
   * Swift toggleDropdown 메서드 대응
   */
  const toggleDropdown = useCallback(() => {
    setShowFilterDropdown(prev => !prev);
  }, []);

  /**
   * 포인트 히스토리 새로고침
   * Swift refreshPointHistory 메서드 대응
   */
  const refreshPointHistory = useCallback(async () => {
    setAllRecentHistories([]);
    setOlderHistories([]);
    setLastPointHistoryId(undefined);

    await Promise.all([
      refetchUserPoint(),
      refetchRecent(),
    ]);
  }, [refetchUserPoint, refetchRecent]);

  /**
   * 더 많은 히스토리 로드
   * Swift loadOlderHistories 메서드 대응
   */
  const loadMoreHistories = useCallback(async () => {
    if (lastPointHistoryId) {
      await refetchOlder();
    }
  }, [lastPointHistoryId, refetchOlder]);

  /**
   * 러닝 포인트 적립
   * Swift earnRunningPoints 메서드 대응
   */
  const handleEarnRunningPoints = useCallback(async (
    runningRecordId: number,
    distance: number,
    duration: number
  ) => {
    try {
      const result = await earnRunningPoints({
        runningRecordId,
        distance,
        duration,
      }).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to earn running points:', error);
      throw error;
    }
  }, [earnRunningPoints]);

  /**
   * 아이템 구매로 포인트 차감
   * Swift spendPointsForItem 메서드 대응
   */
  const handleSpendPointsForItem = useCallback(async (
    itemId: number,
    itemPrice: number
  ) => {
    try {
      const result = await spendPointsForItem({
        itemId,
        itemPrice,
      }).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to spend points for item:', error);
      throw error;
    }
  }, [spendPointsForItem]);

  /**
   * 일일 보너스 적립
   * Swift earnDailyBonus 메서드 대응
   */
  const handleEarnDailyBonus = useCallback(async (consecutiveDays: number) => {
    try {
      const result = await earnDailyBonus({ consecutiveDays }).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to earn daily bonus:', error);
      throw error;
    }
  }, [earnDailyBonus]);

  /**
   * 포인트 업데이트
   * Swift updateUserPoint 메서드 대응
   */
  const handleUpdateUserPoint = useCallback(async (
    pointTypeId: number,
    point: number,
    runningRecordId?: number,
    itemId?: number
  ) => {
    try {
      const result = await updateUserPoint({
        pointTypeId,
        point,
        runningRecordId,
        itemId,
      }).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to update user point:', error);
      throw error;
    }
  }, [updateUserPoint]);

  /**
   * 로딩 상태 디버깅
   * Swift debugLoadingState 메서드 대응
   */
  const debugLoadingState = useCallback(() => {
    const hasMoreData = olderHistoriesData?.hasNext || false;
    console.log('[PointViewModel] hasMoreData:', hasMoreData, ', isLoadingMore:', isLoadingOlder);
    console.log('[PointViewModel] Total items:', filteredPointHistory.length);
    console.log('[PointViewModel] Recent items:', allRecentHistories.length, ', Older items:', olderHistories.length);
  }, [olderHistoriesData?.hasNext, isLoadingOlder, filteredPointHistory.length, allRecentHistories.length, olderHistories.length]);

  /**
   * 포인트 통계 계산 (로컬)
   */
  const localStatistics = useMemo(() => {
    return calculatePointStatistics(filteredPointHistory);
  }, [filteredPointHistory]);

  return {
    // State
    selectedFilter,
    showFilterDropdown,
    currentPoints,
    filteredPointHistory,
    allRecentHistories,
    olderHistories,

    // Data
    userPoint,
    pointStatistics: pointStatistics || localStatistics,

    // Loading states
    isLoading: isLoadingPoint || isLoadingRecent,
    isLoadingMore: isLoadingOlder || isFetchingOlder,
    isLoadingStatistics,
    hasMoreData: olderHistoriesData?.hasNext || false,
    isUpdatingPoint,
    isEarningPoints,
    isSpendingPoints,
    isEarningBonus,

    // Error states
    pointError,
    recentError,
    olderError,

    // Actions
    selectFilter,
    toggleDropdown,
    refreshPointHistory,
    loadMoreHistories,
    handleEarnRunningPoints,
    handleSpendPointsForItem,
    handleEarnDailyBonus,
    handleUpdateUserPoint,

    // Utility functions
    debugLoadingState,

    // Computed values
    hasError: !!pointError || !!recentError || !!olderError,
    canLoadMore: !isLoadingOlder && (olderHistoriesData?.hasNext || false),
    canEarnPoints: !isEarningPoints && !isUpdatingPoint,
    canSpendPoints: !isSpendingPoints && !isUpdatingPoint,
    totalHistoryCount: filteredPointHistory.length,
  };
};

/**
 * 포인트 히스토리 개별 아이템을 위한 Hook
 * Swift PointHistoryViewModel 대응
 */
export const usePointHistoryItemViewModel = (pointHistory: PointHistory) => {
  const viewModel = useMemo(() => {
    return createPointHistoryViewModel(pointHistory);
  }, [pointHistory]);

  return {
    ...viewModel,
    isValid: pointHistory.id > 0 && pointHistory.point !== 0,
  };
};

/**
 * 포인트 필터 관리를 위한 Hook
 * Swift PointFilter enum 관련 로직
 */
export const usePointFilterViewModel = () => {
  const [selectedFilter, setSelectedFilter] = useState<PointFilter>(PointFilter.ALL);
  const [showDropdown, setShowDropdown] = useState(false);

  const selectFilter = useCallback((filter: PointFilter) => {
    setSelectedFilter(filter);
    setShowDropdown(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    setShowDropdown(prev => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
  }, []);

  return {
    selectedFilter,
    showDropdown,
    selectFilter,
    toggleDropdown,
    closeDropdown,
    isEarnedFilter: selectedFilter === PointFilter.EARNED,
    isSpentFilter: selectedFilter === PointFilter.SPENT,
    isAllFilter: selectedFilter === PointFilter.ALL,
  };
};