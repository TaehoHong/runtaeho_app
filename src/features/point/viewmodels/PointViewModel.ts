import { useCallback, useEffect, useState, useMemo } from 'react';
import { useInfinitePointHistories, useGetRecentPointHistories } from '../services';
import { useUserStore } from '~/stores/user/userStore';
import {
  PointFilter, type PointHistory, createPointHistoryViewModel,
  filterPointHistories, getIsEarnedFromFilter, getThreeMonthsAgo,
} from '../models';

export const usePointViewModel = (pointOverride?: number) => {
  const storePoint = useUserStore(state => state.totalPoint);
  const point = pointOverride ?? storePoint;
  const [selectedFilter, setSelectedFilter] = useState<PointFilter>(PointFilter.ALL);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPoints, setCurrentPoints] = useState(point);
  const [recentStartDate] = useState(getThreeMonthsAgo);
  const recent = useGetRecentPointHistories({ startDate: recentStartDate });
  const seedCursor = recent.data?.cursor;
  const isEarned = getIsEarnedFromFilter(selectedFilter);
  const older = useInfinitePointHistories({
    ...(isEarned !== undefined && {
      isEarned,
    }),
    size: 30,
  }, {
    enabled: recent.data !== undefined,
    initialCursor: seedCursor,
  });

  const allRecentHistories = useMemo(() =>
    (recent.data?.content ?? []).map(createPointHistoryViewModel), [recent.data]);
  const olderHistories = useMemo(() => {
    const seen = new Set(allRecentHistories.map(history => history.id));
    return (older.data?.pages.flatMap(page => page.content) ?? [])
      .filter(history => {
        if (seen.has(history.id)) return false;
        seen.add(history.id);
        return true;
      }).map(createPointHistoryViewModel);
  }, [allRecentHistories, older.data]);
  const filteredPointHistory = useMemo(() => [
    ...filterPointHistories(allRecentHistories, selectedFilter),
    ...filterPointHistories(olderHistories, selectedFilter),
  ], [allRecentHistories, olderHistories, selectedFilter]);

  useEffect(() => { setCurrentPoints(point); }, [point]);
  const selectFilter = useCallback((filter: PointFilter) => {
    setSelectedFilter(filter);
    setShowFilterDropdown(false);
  }, []);
  const toggleDropdown = useCallback(() => setShowFilterDropdown(prev => !prev), []);
  const { refetch: refetchRecent } = recent;
  const { refetch: refetchOlder, hasNextPage, isFetching, fetchNextPage } = older;
  const refreshPointHistory = useCallback(async () => {
    const refreshed = await refetchRecent();
    if (refreshed.data && refreshed.data.cursor === seedCursor) await refetchOlder();
  }, [refetchRecent, refetchOlder, seedCursor]);
  const loadMoreHistories = useCallback(async () => {
    if (hasNextPage && !isFetching) await fetchNextPage();
  }, [hasNextPage, isFetching, fetchNextPage]);
  const debugLoadingState = useCallback(() => {
    console.log('[PointViewModel] Total items:', filteredPointHistory.length);
  }, [filteredPointHistory.length]);

  return {
    selectedFilter, showFilterDropdown, currentPoints, filteredPointHistory,
    allRecentHistories, olderHistories, point,
    isLoading: recent.isLoading,
    isLoadingMore: older.isLoading || older.isFetching,
    hasMoreData: older.hasNextPage ?? false,
    recentError: recent.error, olderError: older.error,
    selectFilter, toggleDropdown, refreshPointHistory, loadMoreHistories,
    debugLoadingState,
    hasError: !!recent.error || !!older.error,
    canLoadMore: !older.isFetching && (older.hasNextPage ?? false),
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
