import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseApi';
import {
  Avatar,
  AvatarItemRequest,
  PurchaseItemRequest,
  Item,
  ItemSearch,
  ItemListResponse,
  UserItem,
} from '../../features/avatar/models';

/**
 * Avatar API
 * Swift Avatar 관련 네트워크 로직을 RTK Query로 마이그레이션
 */
export const avatarApi = createApi({
  reducerPath: 'avatarApi',
  baseQuery,
  tagTypes: ['Avatar', 'Item', 'UserItem'],
  endpoints: (builder) => ({
    /**
     * 메인 아바타 조회
     * Swift getMainAvatar 메서드 대응
     */
    getMainAvatar: builder.query<Avatar, void>({
      query: () => '/avatars/main',
      providesTags: ['Avatar'],
    }),

    /**
     * 아바타 아이템 변경
     * Swift updateAvatarItems 메서드 대응
     */
    updateAvatarItems: builder.mutation<Avatar, { avatarId: number; itemIds: number[] }>({
      query: ({ avatarId, itemIds }) => ({
        url: `/avatars/${avatarId}`,
        method: 'PUT',
        body: { itemIds },
      }),
      invalidatesTags: ['Avatar'],
    }),

    /**
     * 아이템 구매 후 바로 장착
     * Swift purchaseAndEquipItem 메서드 대응
     */
    purchaseAndEquipItem: builder.mutation<Avatar, { avatarId: number; itemIds: number[] }>({
      query: ({ avatarId, itemIds }) => ({
        url: `/avatars/${avatarId}/items`,
        method: 'POST',
        body: { itemIds },
      }),
      invalidatesTags: ['Avatar', 'UserItem'],
    }),

    /**
     * 아바타 아이템 제거
     * Swift removeAvatarItem 메서드 대응
     */
    removeAvatarItem: builder.mutation<void, { avatarId: number; itemId: number }>({
      query: ({ avatarId, itemId }) => ({
        url: `/avatars/${avatarId}/items/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Avatar'],
    }),

    /**
     * 아바타의 모든 아이템 제거
     * Swift removeAllAvatarItems 메서드 대응
     */
    removeAllAvatarItems: builder.mutation<void, number>({
      query: (avatarId) => ({
        url: `/avatars/${avatarId}/items`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Avatar'],
    }),

    /**
     * 전체 아이템 목록 조회
     * Swift getAllItems 메서드 대응
     */
    getAllItems: builder.query<ItemListResponse, ItemSearch>({
      query: (params) => ({
        url: '/items',
        params,
      }),
      providesTags: ['Item'],
    }),

    /**
     * 아이템 타입별 조회
     * Swift getItemsByType 메서드 대응
     */
    getItemsByType: builder.query<Item[], number>({
      query: (itemTypeId) => `/items/type/${itemTypeId}`,
      providesTags: ['Item'],
    }),

    /**
     * 아이템 상세 조회
     * Swift getItemDetail 메서드 대응
     */
    getItemDetail: builder.query<Item, number>({
      query: (itemId) => `/items/${itemId}`,
      providesTags: ['Item'],
    }),

    /**
     * 아이템 구매
     * Swift purchaseItem 메서드 대응
     */
    purchaseItem: builder.mutation<UserItem, PurchaseItemRequest>({
      query: (body) => ({
        url: '/user-items',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserItem', 'Avatar'],
    }),

    /**
     * 사용자 보유 아이템 목록 조회
     * Swift getUserItems 메서드 대응
     */
    getUserItems: builder.query<UserItem[], void>({
      query: () => '/user-items',
      providesTags: ['UserItem'],
    }),

    /**
     * 사용자 아이템 활성화/비활성화
     * Swift toggleUserItem 메서드 대응
     */
    toggleUserItem: builder.mutation<UserItem, { userItemId: number; isEnabled: boolean }>({
      query: ({ userItemId, isEnabled }) => ({
        url: `/user-items/${userItemId}`,
        method: 'PATCH',
        body: { isEnabled },
      }),
      invalidatesTags: ['UserItem', 'Avatar'],
    }),

    /**
     * 사용자 아이템 삭제
     * Swift deleteUserItem 메서드 대응
     */
    deleteUserItem: builder.mutation<void, number>({
      query: (userItemId) => ({
        url: `/user-items/${userItemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['UserItem', 'Avatar'],
    }),

    /**
     * 아이템 타입 목록 조회
     * Swift getItemTypes 메서드 대응
     */
    getItemTypes: builder.query<{ id: number; name: string }[], void>({
      query: () => '/items/types',
      providesTags: ['Item'],
    }),

    /**
     * 아이템 검색
     * Swift searchItems 메서드 대응
     */
    searchItems: builder.query<ItemListResponse, ItemSearch & { query: string }>({
      query: (params) => ({
        url: '/items/search',
        params,
      }),
      providesTags: ['Item'],
    }),

    /**
     * 인기 아이템 조회
     * Swift getPopularItems 메서드 대응
     */
    getPopularItems: builder.query<Item[], { limit?: number }>({
      query: ({ limit = 10 }) => ({
        url: '/items/popular',
        params: { limit },
      }),
      providesTags: ['Item'],
    }),

    /**
     * 신규 아이템 조회
     * Swift getNewItems 메서드 대응
     */
    getNewItems: builder.query<Item[], { limit?: number }>({
      query: ({ limit = 10 }) => ({
        url: '/items/new',
        params: { limit },
      }),
      providesTags: ['Item'],
    }),

    /**
     * 사용자별 추천 아이템 조회
     * Swift getRecommendedItems 메서드 대응
     */
    getRecommendedItems: builder.query<Item[], { limit?: number }>({
      query: ({ limit = 10 }) => ({
        url: '/items/recommended',
        params: { limit },
      }),
      providesTags: ['Item'],
    }),
  }),
});

export const {
  useGetMainAvatarQuery,
  useUpdateAvatarItemsMutation,
  usePurchaseAndEquipItemMutation,
  useRemoveAvatarItemMutation,
  useRemoveAllAvatarItemsMutation,
  useGetAllItemsQuery,
  useGetItemsByTypeQuery,
  useGetItemDetailQuery,
  usePurchaseItemMutation,
  useGetUserItemsQuery,
  useToggleUserItemMutation,
  useDeleteUserItemMutation,
  useGetItemTypesQuery,
  useSearchItemsQuery,
  useGetPopularItemsQuery,
  useGetNewItemsQuery,
  useGetRecommendedItemsQuery,
} = avatarApi;
