/**
 * Avatar React Query Hooks
 * 기존 avatarApi.ts의 RTK Query hooks를 React Query로 마이그레이션
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { avatarService } from './avatarService';
import { queryKeys } from '../queryClient';
import type {
  AvatarItemRequest,
  PurchaseItemRequest,
  ItemSearch,
} from '../../features/avatar/models';

/**
 * 메인 아바타 조회
 * 기존: useGetMainAvatarQuery()
 */
export const useGetMainAvatar = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.avatar.main,
    queryFn: () => avatarService.getMainAvatar(),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
};

/**
 * 아바타 아이템 변경
 * 기존: useUpdateAvatarItemsMutation()
 */
export const useUpdateAvatarItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { avatarId: number; itemIds: number[] }) =>
      avatarService.updateAvatarItems(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.all });
    },
  });
};

/**
 * 아이템 구매 후 바로 장착
 * 기존: usePurchaseAndEquipItemMutation()
 */
export const usePurchaseAndEquipItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { avatarId: number; itemIds: number[] }) =>
      avatarService.purchaseAndEquipItem(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.userItems });
    },
  });
};

/**
 * 아바타 아이템 제거
 * 기존: useRemoveAvatarItemMutation()
 */
export const useRemoveAvatarItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { avatarId: number; itemId: number }) =>
      avatarService.removeAvatarItem(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.all });
    },
  });
};

/**
 * 아바타의 모든 아이템 제거
 * 기존: useRemoveAllAvatarItemsMutation()
 */
export const useRemoveAllAvatarItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (avatarId: number) => avatarService.removeAllAvatarItems(avatarId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.all });
    },
  });
};

/**
 * 전체 아이템 목록 조회
 * 기존: useGetAllItemsQuery()
 */
export const useGetAllItems = (params: ItemSearch, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.avatar.items,
    queryFn: () => avatarService.getAllItems(params),
    enabled: options?.enabled,
  });
};

/**
 * 아이템 타입별 조회
 * 기존: useGetItemsByTypeQuery()
 */
export const useGetItemsByType = (itemTypeId: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.avatar.itemsByType(itemTypeId),
    queryFn: () => avatarService.getItemsByType(itemTypeId),
    enabled: options?.enabled,
  });
};

/**
 * 아이템 상세 조회
 * 기존: useGetItemDetailQuery()
 */
export const useGetItemDetail = (itemId: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.avatar.itemDetail(itemId),
    queryFn: () => avatarService.getItemDetail(itemId),
    enabled: options?.enabled,
  });
};

/**
 * 아이템 구매
 * 기존: usePurchaseItemMutation()
 */
export const usePurchaseItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PurchaseItemRequest) => avatarService.purchaseItem(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.userItems });
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.point.all });
    },
  });
};

/**
 * 사용자 보유 아이템 목록 조회
 * 기존: useGetUserItemsQuery()
 */
export const useGetUserItems = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.avatar.userItems,
    queryFn: () => avatarService.getUserItems(),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
};

/**
 * 사용자 아이템 활성화/비활성화
 * 기존: useToggleUserItemMutation()
 */
export const useToggleUserItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { userItemId: number; isEnabled: boolean }) =>
      avatarService.toggleUserItem(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.userItems });
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.all });
    },
  });
};

/**
 * 사용자 아이템 삭제
 * 기존: useDeleteUserItemMutation()
 */
export const useDeleteUserItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userItemId: number) => avatarService.deleteUserItem(userItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.userItems });
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.all });
    },
  });
};

/**
 * 아이템 타입 목록 조회
 * 기존: useGetItemTypesQuery()
 */
export const useGetItemTypes = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.avatar.itemTypes,
    queryFn: () => avatarService.getItemTypes(),
    enabled: options?.enabled,
    staleTime: 30 * 60 * 1000, // 30분간 캐시 유지 (거의 변하지 않는 데이터)
  });
};

/**
 * 아이템 검색
 * 기존: useSearchItemsQuery()
 */
export const useSearchItems = (
  params: ItemSearch & { query: string },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [...queryKeys.avatar.items, 'search', params],
    queryFn: () => avatarService.searchItems(params),
    enabled: options?.enabled,
  });
};

/**
 * 인기 아이템 조회
 * 기존: useGetPopularItemsQuery()
 */
export const useGetPopularItems = (
  params?: { limit?: number },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.avatar.popular(params?.limit),
    queryFn: () => avatarService.getPopularItems(params),
    enabled: options?.enabled,
    staleTime: 10 * 60 * 1000, // 10분간 캐시 유지
  });
};

/**
 * 신규 아이템 조회
 * 기존: useGetNewItemsQuery()
 */
export const useGetNewItems = (
  params?: { limit?: number },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.avatar.new(params?.limit),
    queryFn: () => avatarService.getNewItems(params),
    enabled: options?.enabled,
    staleTime: 10 * 60 * 1000, // 10분간 캐시 유지
  });
};

/**
 * 사용자별 추천 아이템 조회
 * 기존: useGetRecommendedItemsQuery()
 */
export const useGetRecommendedItems = (
  params?: { limit?: number },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.avatar.recommended(params?.limit),
    queryFn: () => avatarService.getRecommendedItems(params),
    enabled: options?.enabled,
    staleTime: 10 * 60 * 1000, // 10분간 캐시 유지
  });
};
