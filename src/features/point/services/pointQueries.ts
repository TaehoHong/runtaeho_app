/**
 * Point React Query Hooks
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import type { PointHistoryRequest } from '../models';
import { pointService } from './pointService';
import { queryKeys } from '../../../services/queryClient';

/**
 * 포인트 히스토리 조회 (일반)
 * 기존: useGetPointHistoriesQuery()
 */
export const useGetPointHistories = (
  params: PointHistoryRequest,
  options?: { enabled?: boolean; skip?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.point.history(params),
    queryFn: () => pointService.getPointHistories(params),
    enabled: options?.enabled !== false && !options?.skip,
  });
};

/**
 * 포인트 히스토리 무한 스크롤
 * useInfiniteQuery를 사용하여 커서 기반 페이지네이션 구현
 */
export const useInfinitePointHistories = (
  params: Omit<PointHistoryRequest, 'cursor'>,
  options?: { enabled?: boolean }
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.point.infiniteHistory(params),
    queryFn: ({ pageParam }) => {
      const queryParams: PointHistoryRequest = {
        ...params,
        ...(pageParam !== undefined && { cursor: pageParam }),
      };
      return pointService.getPointHistories(queryParams);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNext && lastPage.cursor !== undefined ? lastPage.cursor : undefined;
    },
    ...options,
  });
};

/**
 * 최근 3개월 포인트 히스토리 조회
 * 기존: useGetRecentPointHistoriesQuery()
 */
export const useGetRecentPointHistories = (
  params: { startDate: Date },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.point.recentHistory(params.startDate),
    queryFn: () =>
      pointService.getPointHistories({
        startCreatedTimestamp: Math.floor(params.startDate.getTime() / 1000),
        size: 100,
      }),
    ...options,
  });
};

/**
 * 사용자 포인트 잔액 조회
 */
export const useGetUserPoint = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.point.balance(),
    queryFn: () => pointService.getUserPoint(),
    ...options,
  });
};
