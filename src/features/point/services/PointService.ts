/**
 * Point Service
 */

import { apiClient } from '../../../services/api/client';
import { API_ENDPOINTS } from '../../../services/api/config';
import type {
  CursorResult,
  PointHistory,
  PointHistoryRequest,
} from '../models';

/**
 * Point API Service
 */
export const pointService = {
  /**
   * 포인트 히스토리 조회
   */
  getPointHistories: async (params: PointHistoryRequest): Promise<CursorResult<PointHistory>> => {
    const { data } = await apiClient.get<CursorResult<PointHistory>>(
      API_ENDPOINTS.POINT.HISTORIES,
      {
        params: {
          cursor: params.cursor,
          isEarned: params.isEarned,
          startCreatedTimestamp: params.startCreatedTimestamp,
          size: params.size || 30,
        },
      }
    );
    return data;
  },

  /**
   * 사용자 포인트 잔액 조회
   */
  getUserPoint: async (): Promise<{ userId: number; point: number }> => {
    const { data } = await apiClient.get<{ userId: number; point: number }>(
      API_ENDPOINTS.POINT.BASE
    );
    return data;
  },

  /**
   * 포인트 통계 조회
   */
  getPointStatistics: async (): Promise<{
    totalEarned: number;
    totalSpent: number;
    todayEarned: number;
    weeklyEarned: number;
    transactionCount: number;
  }> => {
    // TODO: 백엔드에 통계 API가 있으면 사용, 없으면 클라이언트에서 계산
    // 임시로 빈 데이터 반환
    return {
      totalEarned: 0,
      totalSpent: 0,
      todayEarned: 0,
      weeklyEarned: 0,
      transactionCount: 0,
    };
  },

  /**
   * 포인트 업데이트
   */
  updateUserPoint: async (params: {
    pointTypeId: number;
    point: number;
    runningRecordId?: number;
    itemId?: number;
  }): Promise<{ userId: number; point: number }> => {
    const { data } = await apiClient.post<{ userId: number; point: number }>(
      API_ENDPOINTS.POINT.BASE,
      params
    );
    return data;
  },

  /**
   * 러닝 포인트 적립
   */
  earnRunningPoints: async (params: {
    runningRecordId: number;
    distance: number;
    duration: number;
  }): Promise<{ userId: number; point: number; earnedPoints: number }> => {
    const { data } = await apiClient.post<{ userId: number; point: number; earnedPoints: number }>(
      `${API_ENDPOINTS.POINT.BASE}/running`,
      params
    );
    return data;
  },

  /**
   * 아이템 구매로 포인트 차감
   */
  spendPointsForItem: async (params: {
    itemId: number;
    itemPrice: number;
  }): Promise<{ userId: number; point: number; spentPoints: number }> => {
    const { data } = await apiClient.post<{ userId: number; point: number; spentPoints: number }>(
      `${API_ENDPOINTS.POINT.BASE}/spend`,
      params
    );
    return data;
  },

  /**
   * 일일 보너스 적립
   */
  earnDailyBonus: async (params: {
    consecutiveDays: number;
  }): Promise<{ userId: number; point: number; bonusPoints: number }> => {
    const { data } = await apiClient.post<{ userId: number; point: number; bonusPoints: number }>(
      `${API_ENDPOINTS.POINT.BASE}/daily-bonus`,
      params
    );
    return data;
  },
};
