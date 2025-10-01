/**
 * Shoe React Query Hooks
 * 기존 shoeApi.ts의 RTK Query hooks를 React Query로 마이그레이션
 */

import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { shoeService } from './shoeService';
import { queryKeys } from '../queryClient';
import type { AddShoeDto, PatchShoeDto, ShoeListRequest } from '../../features/shoes/models';

/**
 * 신발 목록 조회 (커서 기반)
 * 기존: useGetShoesCursorQuery()
 */
export const useGetShoesCursor = (
  params: ShoeListRequest,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.shoe.list(params),
    queryFn: () => shoeService.getShoesCursor(params),
    enabled: options?.enabled,
  });
};

/**
 * 신발 무한 스크롤
 * 기존 getShoesCursor의 merge 로직을 useInfiniteQuery로 구현
 */
export const useInfiniteShoes = (
  params: {
    isEnabled?: boolean;
    size?: number;
  },
  options?: { enabled?: boolean }
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.shoe.list(params),
    queryFn: ({ pageParam }) =>
      shoeService.getShoesCursor({
        cursor: pageParam,
        isEnabled: params.isEnabled,
        size: params.size || 10,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.cursor : undefined),
    enabled: options?.enabled,
  });
};

/**
 * 모든 신발 목록 조회
 * 기존: useGetAllShoesQuery()
 */
export const useGetAllShoes = (
  params?: { isEnabled?: boolean },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.shoe.allShoes(params?.isEnabled),
    queryFn: () => shoeService.getAllShoes(params),
    enabled: options?.enabled,
  });
};

/**
 * 신발 상세 조회
 * 기존: useGetShoeDetailQuery()
 */
export const useGetShoeDetail = (shoeId: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.shoe.detail(shoeId),
    queryFn: () => shoeService.getShoeDetail(shoeId),
    enabled: options?.enabled,
  });
};

/**
 * 메인 신발 조회
 * 기존: useGetMainShoeQuery()
 */
export const useGetMainShoe = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.shoe.main,
    queryFn: () => shoeService.getMainShoe(),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
};

/**
 * 신발 추가
 * 기존: useAddShoeMutation()
 */
export const useAddShoe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addShoeDto: AddShoeDto) => shoeService.addShoe(addShoeDto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.all });
    },
  });
};

/**
 * 신발 수정
 * 기존: usePatchShoeMutation()
 */
export const usePatchShoe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patchShoeDto: PatchShoeDto) => shoeService.patchShoe(patchShoeDto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.detail(variables.id) });
    },
  });
};

/**
 * 신발 삭제
 * 기존: useDeleteShoeMutation()
 */
export const useDeleteShoe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shoeId: number) => shoeService.deleteShoe(shoeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.all });
    },
  });
};

/**
 * 메인 신발 설정
 * 기존: useSetMainShoeMutation()
 */
export const useSetMainShoe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shoeId: number) => shoeService.setMainShoe(shoeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.main });
    },
  });
};

/**
 * 신발 활성화/비활성화
 * 기존: useToggleShoeEnabledMutation()
 */
export const useToggleShoeEnabled = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { shoeId: number; isEnabled: boolean }) =>
      shoeService.toggleShoeEnabled(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.detail(variables.shoeId) });
    },
  });
};

/**
 * 신발 거리 업데이트
 * 기존: useUpdateShoeDistanceMutation()
 */
export const useUpdateShoeDistance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { shoeId: number; distance: number }) =>
      shoeService.updateShoeDistance(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.detail(variables.shoeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.statistics });
    },
  });
};

/**
 * 신발 목표 거리 설정
 * 기존: useSetShoeTargetMutation()
 */
export const useSetShoeTarget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { shoeId: number; targetDistance: number }) =>
      shoeService.setShoeTarget(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.detail(variables.shoeId) });
    },
  });
};

/**
 * 신발 은퇴 처리
 * 기존: useRetireShoeMutation()
 */
export const useRetireShoe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shoeId: number) => shoeService.retireShoe(shoeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.statistics });
    },
  });
};

/**
 * 신발 통계 조회
 * 기존: useGetShoeStatisticsQuery()
 */
export const useGetShoeStatistics = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.shoe.statistics,
    queryFn: () => shoeService.getShoeStatistics(),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
};
