/**
 * Shoe Service
 * 기존 shoeApi.ts에서 마이그레이션
 * RTK Query → Axios
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/config';
import type {
  Shoe,
  AddShoeDto,
  PatchShoeDto,
  ShoeListRequest,
  CursorResult,
} from '../../features/shoes/models';

/**
 * Shoe API Service
 * 기존 shoeApi.endpoints를 함수로 변환
 */
export const shoeService = {
  /**
   * 신발 목록 조회 (커서 기반)
   * 기존: getShoesCursor query
   * Swift ShoeApiService.fetchShoesCursor 메서드 대응
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
   * 모든 신발 목록 조회
   * 기존: getAllShoes query
   * Swift getAllShoes 메서드 대응
   */
  getAllShoes: async (params?: { isEnabled?: boolean }): Promise<Shoe[]> => {
    const { data } = await apiClient.get<Shoe[]>(API_ENDPOINTS.SHOE.ALL, { params });
    return data;
  },

  /**
   * 신발 상세 조회
   * 기존: getShoeDetail query
   * Swift getShoeDetail 메서드 대응
   */
  getShoeDetail: async (shoeId: number): Promise<Shoe> => {
    const { data } = await apiClient.get<Shoe>(API_ENDPOINTS.SHOE.DETAIL(shoeId));
    return data;
  },

  /**
   * 메인 신발 조회
   * 기존: getMainShoe query
   * Swift getMainShoe 메서드 대응
   */
  getMainShoe: async (): Promise<Shoe | null> => {
    const { data } = await apiClient.get<Shoe | null>(API_ENDPOINTS.SHOE.MAIN);
    return data;
  },

  /**
   * 신발 추가
   * 기존: addShoe mutation
   * Swift ShoeApiService.addShoe 메서드 대응
   */
  addShoe: async (addShoeDto: AddShoeDto): Promise<Shoe> => {
    const { data } = await apiClient.post<Shoe>(API_ENDPOINTS.SHOE.BASE, addShoeDto);
    return data;
  },

  /**
   * 신발 수정
   * 기존: patchShoe mutation
   * Swift ShoeApiService.patchShoe 메서드 대응
   */
  patchShoe: async (patchShoeDto: PatchShoeDto): Promise<Shoe> => {
    const { data } = await apiClient.patch<Shoe>(
      API_ENDPOINTS.SHOE.DETAIL(patchShoeDto.id),
      patchShoeDto
    );
    return data;
  },

  /**
   * 신발 삭제
   * 기존: deleteShoe mutation
   * Swift deleteShoe 메서드 대응
   */
  deleteShoe: async (shoeId: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.SHOE.DETAIL(shoeId));
  },

  /**
   * 메인 신발 설정
   * 기존: setMainShoe mutation
   * Swift setMainShoe 메서드 대응
   */
  setMainShoe: async (shoeId: number): Promise<Shoe> => {
    const { data } = await apiClient.patch<Shoe>(API_ENDPOINTS.SHOE.SET_MAIN(shoeId));
    return data;
  },

  /**
   * 신발 활성화/비활성화
   * 기존: toggleShoeEnabled mutation
   * Swift toggleShoeEnabled 메서드 대응
   */
  toggleShoeEnabled: async (params: {
    shoeId: number;
    isEnabled: boolean;
  }): Promise<Shoe> => {
    const { data } = await apiClient.patch<Shoe>(
      API_ENDPOINTS.SHOE.DETAIL(params.shoeId),
      { isEnabled: params.isEnabled }
    );
    return data;
  },

  /**
   * 신발 거리 업데이트
   * 기존: updateShoeDistance mutation
   * Swift updateShoeDistance 메서드 대응
   */
  updateShoeDistance: async (params: {
    shoeId: number;
    distance: number;
  }): Promise<Shoe> => {
    const { data } = await apiClient.patch<Shoe>(
      API_ENDPOINTS.SHOE.DISTANCE(params.shoeId),
      { distance: params.distance }
    );
    return data;
  },

  /**
   * 신발 목표 거리 설정
   * 기존: setShoeTarget mutation
   * Swift setShoeTarget 메서드 대응
   */
  setShoeTarget: async (params: {
    shoeId: number;
    targetDistance: number;
  }): Promise<Shoe> => {
    const { data } = await apiClient.patch<Shoe>(
      API_ENDPOINTS.SHOE.TARGET(params.shoeId),
      { targetDistance: params.targetDistance }
    );
    return data;
  },

  /**
   * 신발 은퇴 처리
   * 기존: retireShoe mutation
   * Swift retireShoe 메서드 대응
   */
  retireShoe: async (shoeId: number): Promise<Shoe> => {
    const { data } = await apiClient.patch<Shoe>(API_ENDPOINTS.SHOE.RETIRE(shoeId));
    return data;
  },

  /**
   * 신발 통계 조회
   * 기존: getShoeStatistics query
   * Swift getShoeStatistics 메서드 대응
   */
  getShoeStatistics: async (): Promise<{
    totalShoes: number;
    activeShoes: number;
    retiredShoes: number;
    totalDistance: number;
    averageDistance: number;
    achievedGoals: number;
    shoesWithGoals: number;
    achievementRate: number;
  }> => {
    const { data } = await apiClient.get<{
      totalShoes: number;
      activeShoes: number;
      retiredShoes: number;
      totalDistance: number;
      averageDistance: number;
      achievedGoals: number;
      shoesWithGoals: number;
      achievementRate: number;
    }>(API_ENDPOINTS.SHOE.STATISTICS);
    return data;
  },
};
