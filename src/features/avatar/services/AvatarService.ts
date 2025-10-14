/**
 * 아바타 API 서비스 구현
 *
 * 원칙:
 * - SRP: API 호출만 담당 (데이터 변환은 Mapper에 위임)
 * - DIP: 인터페이스 구현
 * - 백엔드 API 엔드포인트와 1:1 매칭
 *
 * 백엔드 API 매핑:
 * - GET  /api/v1/items                 → getItems()
 * - POST /api/v1/user-items            → purchaseItems()
 * - PUT  /api/v1/avatars/{id}          → updateEquippedItems()
 * - GET  /api/v1/avatars/main          → getMainAvatar()
 */

import { apiClient } from '~/services/api/client';
import type { CursorResult } from '~/shared/utils/dto/CursorResult';
import { API_ENDPOINTS } from '../../../services/api/config';
import { AVATAR_API_ENDPOINTS, PAGINATION_CONFIG } from '../models/avatarConstants';
import type {
  AvatarDto,
  GetItemsRequest,
  ItemDto,
  PurchaseItemsRequest,
  UpdateEquippedItemsRequest,
} from '../models/avatarTypes';



/**
 * 아바타 API 서비스 구현체
 */
export const avatarService = {
  /**
   * 아이템 목록 조회
   *
   * 백엔드 API: GET /api/v1/items
   * Query Params: cursor, size, itemType
   */
   getItems: async (request: GetItemsRequest): Promise<CursorResult<ItemDto>> => {
      const { cursor, itemType, size = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE } = request;
      const { data } = await apiClient.get<CursorResult<ItemDto>>(API_ENDPOINTS.ITEMS.BASE, {
        params: {
          cursor: cursor ?? undefined, // null을 undefined로 변환 (query에서 제외)
          itemType,
          size,
        },
      });
      return data;
  },

  /**
   * 아이템 구매
   *
   * 백엔드 API: POST /api/v1/user-items
   * Request Body: { itemIds: number[] }
   */
  purchaseItems: async (request: PurchaseItemsRequest): Promise<void> => {
    await apiClient.post(AVATAR_API_ENDPOINTS.PURCHASE_ITEMS, {
      itemIds: request.itemIds,
    });
  },

  /**
   * 착용 아이템 업데이트
   *
   * 백엔드 API: PUT /api/v1/avatars/{avatarId}
   * Request Body: { itemIds: number[] }
   *
   * 주의: PUT이므로 전체 착용 아이템 목록을 전송해야 함
   */
  updateEquippedItems: async (request: UpdateEquippedItemsRequest): Promise<AvatarDto> => {
    const { avatarId, itemIds } = request;

    const { data } = await apiClient.put<AvatarDto>(
      AVATAR_API_ENDPOINTS.UPDATE_EQUIPPED_ITEMS(avatarId),
      {
        itemIds: itemIds,
      }
    );
    
    return data;
  },

  /**
   * 메인 아바타 조회
   *
   * 백엔드 API: GET /api/v1/avatars/main
   */
  getMainAvatar: async (): Promise<AvatarDto> => {
    const { data } = await apiClient.get<AvatarDto>(AVATAR_API_ENDPOINTS.GET_MAIN_AVATAR);

    return data;
  }
}
