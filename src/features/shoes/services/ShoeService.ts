/**
 * Shoe Service
 */

import { apiClient } from '../../../services/api/client';
import { API_ENDPOINTS } from '../../../services/api/config';
import type {
  AddShoeDto,
  CursorResult,
  PatchShoeDto,
  Shoe,
  ShoeListRequest,
} from '../models';

export const shoeService = {
  /**
   * 신발 목록 조회 (커서 기반)
   */
  getShoesCursor: async (params: ShoeListRequest): Promise<CursorResult<Shoe>> => {
    const { data } = await apiClient.get<CursorResult<Shoe>>(API_ENDPOINTS.SHOE.BASE, {
      params: {
        cursor: params.cursor,
        isEnabled: params.isEnabled,
        size: params.size || 10,
      },
    });
    return data;
  },

  /**
   * 모든 신발 조회
   */
  getAllShoes: async (params?: { isEnabled?: boolean | undefined }): Promise<Shoe[]> => {
    const { data } = await apiClient.get<Shoe[]>(API_ENDPOINTS.SHOE.ALL, {
      params: params ? { isEnabled: params.isEnabled } : undefined,
    });
    return data;
  },

  /**
   * 신발 추가
   */
  addShoe: async (addShoeDto: AddShoeDto): Promise<Shoe> => {
    const { data } = await apiClient.post<Shoe>(API_ENDPOINTS.SHOE.BASE, addShoeDto);
    return data;
  },

  /**
   * 신발 수정
   */
  patchShoe: async (patchShoeDto: PatchShoeDto): Promise<Shoe> => {
    const { data } = await apiClient.patch<Shoe>(
      API_ENDPOINTS.SHOE.PATCH(patchShoeDto.id),
      patchShoeDto
    );
    return data;
  },
};