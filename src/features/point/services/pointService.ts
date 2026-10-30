/**
 * Point Service
 */

import { apiClient } from '../../../services/api/client';
import { API_ENDPOINTS } from '../../../services/api/config';
import type { PointHistory, PointHistoryRequest } from '../models';
import type { CursorResult } from '~/shared/utils/dto/CursorResult';
import { getSessionSnapshot, isSessionCurrent, type SessionSnapshot } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { SessionSupersededError } from '~/utils/storage/errors';
// Profile/point reads share ordering with completed balance mutations.
let balanceRevision = 0;

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
  getUserPoint: async (sessionSnapshot?: SessionSnapshot): Promise<{ userId: number; point: number }> => {
    const { data } = await apiClient.get<{ userId: number; point: number }>(
      API_ENDPOINTS.POINT.BASE,
      sessionSnapshot ? { sessionSnapshot } : undefined
    );
    return data;
  },

  beginUserPointRead: (): number => ++balanceRevision,

  // A whole-profile response may update metadata without replacing a newer balance.
  completeUserPointRead: (revision: number, point: number): number => {
    if (revision !== balanceRevision) return useUserStore.getState().totalPoint;
    // An already pending GET can commit while END is in flight as well.
    balanceRevision += 1;
    return point;
  },

  captureUserPointRevision: (): number => balanceRevision,

  reconcileCompletedPoint: async (point: number, revision: number, snapshot: SessionSnapshot): Promise<void> => {
    if (!isSessionCurrent(snapshot)) return;
    if (revision === balanceRevision) {
      // Completion invalidates older reads even when END started after those reads.
      balanceRevision += 1;
      useUserStore.getState().setTotalPoint(point);
    } else {
      // Request-start order cannot date a mutation's server commit. Read again
      // after completion instead of applying or dropping a possibly stale DTO.
      await pointService.refreshUserPoint(snapshot);
    }
  },

  /** 서버 잔액을 현재 세션의 표시 상태에 반영한다. */
  refreshUserPoint: async (snapshot = getSessionSnapshot()): Promise<void> => {
    if (snapshot.userId === null || !isSessionCurrent(snapshot)) throw new SessionSupersededError();
    const refresh = pointService.beginUserPointRead();
    const { userId, point } = await pointService.getUserPoint(snapshot);
    if (!isSessionCurrent(snapshot) || userId !== snapshot.userId) throw new SessionSupersededError();
    useUserStore.getState().setTotalPoint(pointService.completeUserPointRead(refresh, point));
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
