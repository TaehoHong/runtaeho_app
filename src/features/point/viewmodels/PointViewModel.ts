import { useCallback, useEffect, useState, useMemo } from 'react';
import { useGetPointHistories, useGetRecentPointHistories } from '../services';
import { useUserStore } from '~/stores/user/userStore';
import {
  PointFilter,
  type PointHistory,
  type PointHistoryViewModel,
  createPointHistoryViewModel,
  filterPointHistories,
  getIsEarnedFromFilter,
  getThreeMonthsAgo,
  calculatePointStatistics,
} from '../models';

/**
 * Point ViewModel
 */
export const usePointViewModel = (pointOverride?: number) => {
  // Store에서 포인트 가져오기 (Hook은 최상위에서 호출)
  const storePoint = useUserStore(state => state.totalPoint);
  const point = pointOverride ?? storePoint;

  // 상태 관리
  const [selectedFilter, setSelectedFilter] = useState<PointFilter>(PointFilter.ALL);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPoints, setCurrentPoints] = useState(point);

  // 하이브리드 방식을 위한 상태 (Swift와 동일)
  const [allRecentHistories, setAllRecentHistories] = useState<PointHistoryViewModel[]>([]);
  const [olderHistories, setOlderHistories] = useState<PointHistoryViewModel[]>([]);
  const [lastPointHistoryId, setLastPointHistoryId] = useState<number | undefined>();

  /**
   * 최근 3개월 포인트 히스토리 조회 (필터 없이)
   * Swift loadInitialData의 최근 3개월 데이터 로드 부분
   */
  const {
    data: recentHistoriesData,
    error: recentError,
    isLoading: isLoadingRecent,
    refetch: refetchRecent,
  } = useGetRecentPointHistories({
    startDate: getThreeMonthsAgo(),
  });

  /**
   * 필터링된 이전 히스토리 조회
   * Swift loadOlderHistories 메서드 대응
   */
  // 필터에서 isEarned 값 가져오기
  const isEarnedFilter = getIsEarnedFromFilter(selectedFilter);

  const {
    data: olderHistoriesData,
    error: olderError,
    isLoading: isLoadingOlder,
    isFetching: isFetchingOlder,
    refetch: refetchOlder,
  } = useGetPointHistories(
    {
      ...(lastPointHistoryId !== undefined && { cursor: lastPointHistoryId }),
      ...(isEarnedFilter !== undefined && { isEarned: isEarnedFilter }),
      size: 30,
    },
    {
      skip: !lastPointHistoryId,
    }
  );

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
    if (point !== undefined) {
      setCurrentPoints(point);
    }
  }, [point]);

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
    setOlderHistories([]);

    const result = await refetchRecent();

    if (result.data?.content) {
      const viewModels = result.data.content.map(createPointHistoryViewModel);
      setAllRecentHistories(viewModels);
      setLastPointHistoryId(result.data.cursor);
    } else {
      setAllRecentHistories([]);
      setLastPointHistoryId(undefined);
    }
  }, [refetchRecent]);

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
    point,

    // Loading states
    isLoading: isLoadingRecent,
    isLoadingMore: isLoadingOlder || isFetchingOlder,
    hasMoreData: olderHistoriesData?.hasNext || false,

    // Error states
    recentError,
    olderError,

    // Actions
    selectFilter,
    toggleDropdown,
    refreshPointHistory,
    loadMoreHistories,

    // Utility functions
    debugLoadingState,

    // Computed values
    hasError: !!recentError || !!olderError,
    canLoadMore: !isLoadingOlder && (olderHistoriesData?.hasNext || false),
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