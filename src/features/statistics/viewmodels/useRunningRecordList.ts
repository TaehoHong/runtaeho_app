/**
 * Running Record List Hook
 *
 * 책임:
 * - 러닝 기록 데이터 fetching (무한 스크롤)
 * - 기간별 날짜 계산
 * - 상태 관리 (loading, error, pagination)
 * - 비즈니스 로직 (필터링, 정렬 등)
 */

import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Period, getStartOfWeek, getStartOfMonth, getStartOfYear } from '../models';
import type { RunningRecord } from '../../running/models';
import { runningService } from '../../running/api/runningApiClient';

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
 * @param period - 조회 기간 (주/월/년)
 * @returns 러닝 기록 리스트 상태 및 액션
 */
export const useRunningRecordList = (
  period: Period
): RunningRecordListState => {
  // 기간에 따른 시작/종료 날짜 계산
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date;

    switch (period) {
      case Period.WEEK:
        start = getStartOfWeek(now);
        break;
      case Period.MONTH:
        start = getStartOfMonth(now);
        break;
      case Period.YEAR:
        start = getStartOfYear(now);
        break;
      default:
        start = getStartOfMonth(now);
    }

    return {
      startDate: start,
      endDate: now,
    };
  }, [period]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['runningRecords', period],
    queryFn: async ({ pageParam }) => {
      const result = await runningService.getRunningRecords({
        ...(pageParam !== undefined && { cursor: pageParam }),
        size: 20,
        startDate,
        endDate,
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
