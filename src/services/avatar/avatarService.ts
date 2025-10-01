/**
 * Avatar Service
 * 기존 avatarApi.ts에서 마이그레이션
 * RTK Query → Axios
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/config';
import type {
  Avatar,
  AvatarItemRequest,
  PurchaseItemRequest,
  Item,
  ItemSearch,
  ItemListResponse,
  UserItem,
} from '../../features/avatar/models';

/**
 * Avatar API Service
 * 기존 avatarApi.endpoints를 함수로 변환
 */
export const avatarService = {
  /**
   * 메인 아바타 조회
   * 기존: getMainAvatar query
   * Swift getMainAvatar 메서드 대응
   */
  getMainAvatar: async (): Promise<Avatar> => {
    const { data } = await apiClient.get<Avatar>(API_ENDPOINTS.AVATAR.MAIN);
    return data;
  },

  /**
   * 아바타 아이템 변경
   * 기존: updateAvatarItems mutation
   * Swift updateAvatarItems 메서드 대응
   */
  updateAvatarItems: async (params: {
    avatarId: number;
    itemIds: number[];
  }): Promise<Avatar> => {
    const { data } = await apiClient.put<Avatar>(
      API_ENDPOINTS.AVATAR.DETAIL(params.avatarId),
      { itemIds: params.itemIds }
    );
    return data;
  },

  /**
   * 아이템 구매 후 바로 장착
   * 기존: purchaseAndEquipItem mutation
   * Swift purchaseAndEquipItem 메서드 대응
   */
  purchaseAndEquipItem: async (params: {
    avatarId: number;
    itemIds: number[];
  }): Promise<Avatar> => {
    const { data } = await apiClient.post<Avatar>(
      API_ENDPOINTS.AVATAR.ITEMS(params.avatarId),
      { itemIds: params.itemIds }
    );
    return data;
  },

  /**
   * 아바타 아이템 제거
   * 기존: removeAvatarItem mutation
   * Swift removeAvatarItem 메서드 대응
   */
  removeAvatarItem: async (params: { avatarId: number; itemId: number }): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.AVATAR.REMOVE_ITEM(params.avatarId, params.itemId));
  },

  /**
   * 아바타의 모든 아이템 제거
   * 기존: removeAllAvatarItems mutation
   * Swift removeAllAvatarItems 메서드 대응
   */
  removeAllAvatarItems: async (avatarId: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.AVATAR.ITEMS(avatarId));
  },

  /**
   * 전체 아이템 목록 조회
   * 기존: getAllItems query
   * Swift getAllItems 메서드 대응
   */
  getAllItems: async (params: ItemSearch): Promise<ItemListResponse> => {
    const { data } = await apiClient.get<ItemListResponse>(API_ENDPOINTS.ITEMS.BASE, {
      params,
    });
    return data;
  },

  /**
   * 아이템 타입별 조회
   * 기존: getItemsByType query
   * Swift getItemsByType 메서드 대응
   */
  getItemsByType: async (itemTypeId: number): Promise<Item[]> => {
    const { data } = await apiClient.get<Item[]>(API_ENDPOINTS.ITEMS.BY_TYPE(itemTypeId));
    return data;
  },

  /**
   * 아이템 상세 조회
   * 기존: getItemDetail query
   * Swift getItemDetail 메서드 대응
   */
  getItemDetail: async (itemId: number): Promise<Item> => {
    const { data } = await apiClient.get<Item>(API_ENDPOINTS.ITEMS.DETAIL(itemId));
    return data;
  },

  /**
   * 아이템 구매
   * 기존: purchaseItem mutation
   * Swift purchaseItem 메서드 대응
   */
  purchaseItem: async (body: PurchaseItemRequest): Promise<UserItem> => {
    const { data } = await apiClient.post<UserItem>(API_ENDPOINTS.USER_ITEMS.BASE, body);
    return data;
  },

  /**
   * 사용자 보유 아이템 목록 조회
   * 기존: getUserItems query
   * Swift getUserItems 메서드 대응
   */
  getUserItems: async (): Promise<UserItem[]> => {
    const { data } = await apiClient.get<UserItem[]>(API_ENDPOINTS.USER_ITEMS.BASE);
    return data;
  },

  /**
   * 사용자 아이템 활성화/비활성화
   * 기존: toggleUserItem mutation
   * Swift toggleUserItem 메서드 대응
   */
  toggleUserItem: async (params: {
    userItemId: number;
    isEnabled: boolean;
  }): Promise<UserItem> => {
    const { data } = await apiClient.patch<UserItem>(
      API_ENDPOINTS.USER_ITEMS.DETAIL(params.userItemId),
      { isEnabled: params.isEnabled }
    );
    return data;
  },

  /**
   * 사용자 아이템 삭제
   * 기존: deleteUserItem mutation
   * Swift deleteUserItem 메서드 대응
   */
  deleteUserItem: async (userItemId: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.USER_ITEMS.DETAIL(userItemId));
  },

  /**
   * 아이템 타입 목록 조회
   * 기존: getItemTypes query
   * Swift getItemTypes 메서드 대응
   */
  getItemTypes: async (): Promise<{ id: number; name: string }[]> => {
    const { data } = await apiClient.get<{ id: number; name: string }[]>(
      API_ENDPOINTS.ITEMS.TYPES
    );
    return data;
  },

  /**
   * 아이템 검색
   * 기존: searchItems query
   * Swift searchItems 메서드 대응
   */
  searchItems: async (params: ItemSearch & { query: string }): Promise<ItemListResponse> => {
    const { data } = await apiClient.get<ItemListResponse>(API_ENDPOINTS.ITEMS.SEARCH, {
      params,
    });
    return data;
  },

  /**
   * 인기 아이템 조회
   * 기존: getPopularItems query
   * Swift getPopularItems 메서드 대응
   */
  getPopularItems: async (params?: { limit?: number }): Promise<Item[]> => {
    const { data } = await apiClient.get<Item[]>(API_ENDPOINTS.ITEMS.POPULAR, {
      params: { limit: params?.limit || 10 },
    });
    return data;
  },

  /**
   * 신규 아이템 조회
   * 기존: getNewItems query
   * Swift getNewItems 메서드 대응
   */
  getNewItems: async (params?: { limit?: number }): Promise<Item[]> => {
    const { data } = await apiClient.get<Item[]>(API_ENDPOINTS.ITEMS.NEW, {
      params: { limit: params?.limit || 10 },
    });
    return data;
  },

  /**
   * 사용자별 추천 아이템 조회
   * 기존: getRecommendedItems query
   * Swift getRecommendedItems 메서드 대응
   */
  getRecommendedItems: async (params?: { limit?: number }): Promise<Item[]> => {
    const { data } = await apiClient.get<Item[]>(API_ENDPOINTS.ITEMS.RECOMMENDED, {
      params: { limit: params?.limit || 10 },
    });
    return data;
  },
};
