/**
 * Point React Query Hooks
 * 기존 pointApi.ts의 RTK Query hooks를 React Query로 마이그레이션
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pointService } from './pointService';
import { queryKeys } from '../queryClient';
import type { PointHistoryRequest } from '../../features/point/models';

/**
 * 포인트 히스토리 조회
 * 기존: useGetPointHistoriesQuery()
 */
export const useGetPointHistories = (
  params: PointHistoryRequest,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.point.history(params),
    queryFn: () => pointService.getPointHistories(params),
    enabled: options?.enabled,
  });
};

/**
 * 사용자 포인트 잔액 조회
 * 기존: useGetUserPointQuery()
 */
export const useGetUserPoint = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.point.balance,
    queryFn: () => pointService.getUserPoint(),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
};

/**
 * 포인트 적립/차감
 * 기존: useUpdateUserPointMutation()
 */
export const useUpdateUserPoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      pointTypeId: number;
      point: number;
      runningRecordId?: number;
      itemId?: number;
    }) => pointService.updateUserPoint(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.point.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
  });
};

/**
 * 러닝 완료 시 포인트 적립
 * 기존: useEarnRunningPointsMutation()
 */
export const useEarnRunningPoints = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      runningRecordId: number;
      distance: number;
      duration: number;
    }) => pointService.earnRunningPoints(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.point.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.running.all });
    },
  });
};

/**
 * 아이템 구매 시 포인트 차감
 * 기존: useSpendPointsForItemMutation()
 */
export const useSpendPointsForItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      itemId: number;
      itemPrice: number;
    }) => pointService.spendPointsForItem(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.point.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.all });
    },
  });
};

/**
 * 일일 보너스 포인트 적립
 * 기존: useEarnDailyBonusMutation()
 */
export const useEarnDailyBonus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { consecutiveDays: number }) => pointService.earnDailyBonus(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.point.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
  });
};

/**
 * 포인트 히스토리 무한 스크롤 로드
 * 기존: useLoadMorePointHistoriesQuery()
 */
export const useLoadMorePointHistories = (
  params: PointHistoryRequest,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.point.history(params),
    queryFn: () => pointService.loadMorePointHistories(params),
    enabled: options?.enabled,
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
    queryFn: () => pointService.getRecentPointHistories(params),
    enabled: options?.enabled,
  });
};

/**
 * 포인트 통계 조회
 * 기존: useGetPointStatisticsQuery()
 */
export const useGetPointStatistics = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.point.statistics,
    queryFn: () => pointService.getPointStatistics(),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
};
