/**
 * 아바타 React Query Hooks
 *
 * 원칙:
 * - SRP: 각 Hook은 하나의 API 호출만 담당
 * - 선언적 API: Hook 이름만으로 기능 파악 가능
 * - 캐싱 전략: Query Key 체계적 관리
 *
 * 네이밍 규칙:
 * - useXxx: 조회 (Query)
 * - useXxxMutation: 변경 (Mutation)
 */

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { QUERY_KEY_PREFIX, QUERY_OPTIONS } from '../models/avatarConstants';
import type { Item, Avatar, PurchaseItemsRequest, UpdateEquippedItemsRequest } from '../models/';
import { avatarService } from './avatarService';
import type { CursorResult } from '~/shared/utils/dto/CursorResult';
import { pointService } from '~/features/point/services/pointService';
import { useUserStore } from '~/stores/user/userStore';

// ===================================
// Query Keys (캐시 키 관리)
// ===================================

/**
 * Query Key 팩토리
 *
 * 장점:
 * - 타입 안정성
 * - 중복 방지
 * - 계층적 무효화 가능
 */
export const avatarQueryKeys = {
  all: [QUERY_KEY_PREFIX.AVATAR] as const,

  // 아이템 관련
  items: () => [...avatarQueryKeys.all, QUERY_KEY_PREFIX.ITEMS] as const,
  itemsByType: (itemTypeId: number) =>
    [...avatarQueryKeys.items(), itemTypeId] as const,

  // 아바타 관련
  avatars: () => [...avatarQueryKeys.all, 'avatars'] as const,
  mainAvatar: () => [...avatarQueryKeys.avatars(), QUERY_KEY_PREFIX.MAIN_AVATAR] as const,
};

// ===================================
// Queries (조회)
// ===================================

/**
 * 아이템 목록 조회 (무한 스크롤)
 *
 * @param itemType - 조회할 아이템 카테고리
 * @returns InfiniteQuery Result
 *
 * 사용 예시:
 * ```tsx
 * const { data, fetchNextPage, hasNextPage } = useAvatarItems(ItemType.HAIR);
 * ```
 */
export function useAvatarItems(
  itemTypeId: number
): UseInfiniteQueryResult<InfiniteData<CursorResult<Item>>, Error> {
  return useInfiniteQuery({
    queryKey: avatarQueryKeys.itemsByType(itemTypeId),
    queryFn: ({ pageParam }) =>
      avatarService.getItems({
        cursor: pageParam,
        itemTypeId,
      }),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNext ? lastPage.cursor : undefined;
    },
    staleTime: QUERY_OPTIONS.STALE_TIME,
    gcTime: QUERY_OPTIONS.GC_TIME,
  });
}

/**
 * 메인 아바타 조회
 *
 * @returns Query Result
 *
 * 사용 예시:
 * ```tsx
 * const { data: avatar, isLoading } = useMainAvatar();
 * ```
 */
export function useMainAvatar(): UseQueryResult<Avatar, Error> {
  return useQuery({
    queryKey: avatarQueryKeys.mainAvatar(),
    queryFn: () => avatarService.getMainAvatar(),
    staleTime: QUERY_OPTIONS.STALE_TIME,
    gcTime: QUERY_OPTIONS.GC_TIME,
  });
}

// ===================================
// Mutations (변경)
// ===================================

/**
 * 아이템 구매 Mutation
 *
 * 성공 시:
 * - 서버에서 최신 포인트를 조회하여 전역 상태 동기화
 * - 모든 아이템 캐시 무효화 (isOwned 상태 변경되므로)
 *
 * @returns Mutation Result
 *
 * 사용 예시:
 * ```tsx
 * const purchaseMutation = usePurchaseItems();
 *
 * const handlePurchase = async () => {
 *   await purchaseMutation.mutateAsync({ itemIds: [1, 2, 3] });
 * };
 * ```
 */
export function usePurchaseItems(): UseMutationResult<
  void,
  Error,
  PurchaseItemsRequest,
  unknown
> {
  const queryClient = useQueryClient();
  const setTotalPoint = useUserStore((state) => state.setTotalPoint);

  return useMutation({
    mutationFn: (request: PurchaseItemsRequest) =>
      avatarService.purchaseItems(request),
    onSuccess: async () => {
      // 포인트 동기화 (재시도 로직: 실패 시 최대 3회 재시도)
      const MAX_RETRIES = 3;
      const RETRY_DELAY_MS = 1000;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const { point } = await pointService.getUserPoint();
          setTotalPoint(point);
          console.log(`💰 [usePurchaseItems] 포인트 동기화 성공: ${point}`);
          break; // 성공 시 루프 종료
        } catch (error) {
          console.warn(`⚠️ [usePurchaseItems] 포인트 동기화 실패 (${attempt}/${MAX_RETRIES}):`, error);
          if (attempt === MAX_RETRIES) {
            console.error('❌ [usePurchaseItems] 포인트 동기화 최종 실패 - 새로고침 필요');
            // TODO: Toast 연동 후 사용자 알림 추가
          } else {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          }
        }
      }

      // 모든 아이템 목록 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: avatarQueryKeys.items(),
      });
    },
    retry: QUERY_OPTIONS.RETRY_COUNT,
  });
}

/**
 * 착용 아이템 업데이트 Mutation
 *
 * 성공 시:
 * - 메인 아바타 캐시 무효화
 * - 모든 아이템 캐시 무효화 (상태 변경되므로)
 *
 * @returns Mutation Result
 *
 * 사용 예시:
 * ```tsx
 * const updateMutation = useUpdateEquippedItems();
 *
 * const handleUpdate = async () => {
 *   await updateMutation.mutateAsync({
 *     avatarId: 1,
 *     itemIds: [10, 20, 30],
 *   });
 * };
 * ```
 */
export function useUpdateEquippedItems(): UseMutationResult<
  Avatar,
  Error,
  UpdateEquippedItemsRequest,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateEquippedItemsRequest) =>
      avatarService.updateEquippedItems(request),
    onSuccess: (data) => {
      // 메인 아바타 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: avatarQueryKeys.mainAvatar(),
      });

      // 모든 아이템 캐시 무효화 (EQUIPPED 상태 변경)
      queryClient.invalidateQueries({
        queryKey: avatarQueryKeys.items(),
      });
    },
    retry: QUERY_OPTIONS.RETRY_COUNT,
  });
}

// ===================================
// Combined Mutations (복합 작업)
// ===================================

/**
 * 구매 + 착용 Combined Mutation
 *
 * 사용 사례: 미보유 아이템 구매 후 바로 착용
 *
 * @returns Mutation Result
 *
 * 사용 예시:
 * ```tsx
 * const purchaseAndEquipMutation = usePurchaseAndEquipItems();
 *
 * const handlePurchaseAndEquip = async () => {
 *   await purchaseAndEquipMutation.mutateAsync({
 *     itemIds: [1, 2, 3],
 *     avatarId: 1,
 *   });
 * };
 * ```
 */
export function usePurchaseAndEquipItems(): UseMutationResult<
  Avatar,
  Error,
  {
    itemIds: readonly number[];
    avatarId: number;
  },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemIds, avatarId }) => {
      // 1. 구매
      await avatarService.purchaseItems({ itemIds });

      // 2. 착용
      return await avatarService.updateEquippedItems({
        avatarId,
        itemIds,
      });
    },
    onSuccess: () => {
      // 모든 관련 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: avatarQueryKeys.all,
      });
    },
    retry: 0, // 복합 작업이므로 재시도 안 함 (롤백 복잡)
  });
}

// ===================================
// Cache Utilities (캐시 유틸리티)
// ===================================

/**
 * 특정 카테고리 아이템 캐시 무효화
 *
 * 사용 예시:
 * ```tsx
 * const queryClient = useQueryClient();
 * invalidateItemsByType(queryClient, ItemType.HAIR);
 * ```
 */
export function invalidateItemsByType(
  queryClient: ReturnType<typeof useQueryClient>,
  itemTypeId: number
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: avatarQueryKeys.itemsByType(itemTypeId),
  });
}

/**
 * 모든 아바타 관련 캐시 무효화
 *
 * 사용 예시: 로그아웃 시
 */
export function invalidateAllAvatarCache(
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: avatarQueryKeys.all,
  });
}

/**
 * 아이템 캐시 프리페치 (성능 최적화)
 *
 * 사용 예시: 화면 진입 전에 데이터 미리 로드
 * ```tsx
 * const queryClient = useQueryClient();
 * await prefetchItems(queryClient, ItemType.HAIR);
 * ```
 */
export async function prefetchItems(
  queryClient: ReturnType<typeof useQueryClient>,
  itemTypeId: number
): Promise<void> {
  await queryClient.prefetchInfiniteQuery({
    queryKey: avatarQueryKeys.itemsByType(itemTypeId),
    queryFn: ({ pageParam }) =>
      avatarService.getItems({
        cursor: pageParam,
        itemTypeId,
      }),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNext ? lastPage.cursor : undefined;
    },
    pages: 1, // 첫 페이지만 프리페치
  });
}
