/**
 * Running Record List Hook
 *
 * 책임:
 * - 러닝 기록 데이터 fetching (무한 스크롤)
 * - 상태 관리 (loading, error, pagination)
 */

import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { RunningRecord } from '../../running/models';
import { runningService } from '../../running/services/runningService';

/**
 * Hook 파라미터 타입
 */
export interface UseRunningRecordListParams {
  startDate?: Date;
  endDate?: Date;
  pageSize?: number;
}

/**
 * Hook 반환 타입
 */
export interface RunningRecordListState {
  // 데이터
  records: RunningRecord[];

  // 상태
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;

  // 액션
  fetchNextPage: () => void;

  // 에러
  error: Error | null;
}

/**
 * Running Record List Hook
 *
 * @param params - 조회 파라미터 (기간, 페이지 크기)
 * @returns 러닝 기록 리스트 상태 및 액션
 */
export const useRunningRecordList = (
  params: UseRunningRecordListParams = {}
): RunningRecordListState => {
  const { startDate, endDate, pageSize = 20 } = params;

  // Query Key에 필터 조건 포함 (캐시 무효화 개선)
  const queryKey = useMemo(() => [
    'runningRecords',
    'infinite',
    {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    }
  ], [startDate, endDate]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const result = await runningService.getRunningRecords({
        ...(pageParam !== undefined && { cursor: pageParam }),
        size: pageSize,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });
      return result;
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.cursor : undefined,
    initialPageParam: undefined as number | undefined,
  });

  // 전체 기록 리스트 (모든 페이지 병합)
  const records = useMemo(() => {
    return data?.pages.flatMap((page) => page.content) || [];
  }, [data]);

  return {
    records,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    error: error as Error | null,
  };
};
