/**
 * League Service
 * 리그 관련 API 호출
 */

import { apiClient } from '../../../services/api/client';
import { API_ENDPOINTS } from '../../../services/api/config';
import type { CurrentLeague, LeagueResult } from '../models';

/**
 * League API Service
 */
export const leagueService = {
  /**
   * 현재 리그 정보 조회
   * GET /api/v1/league/current
   */
  getCurrentLeague: async (): Promise<CurrentLeague | null> => {
    const { data } = await apiClient.get<CurrentLeague | null>(
      API_ENDPOINTS.LEAGUE.CURRENT
    );
    return data;
  },

  /**
   * 리그 참가
   * POST /api/v1/league/join
   */
  joinLeague: async (): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.LEAGUE.JOIN);
  },

  /**
   * 미확인 리그 결과 조회
   * GET /api/v1/league/result
   * @returns 미확인 결과가 없으면 null
   */
  getUncheckedResult: async (): Promise<LeagueResult | null> => {
    const { data } = await apiClient.get<LeagueResult | null>(
      API_ENDPOINTS.LEAGUE.RESULT
    );
    return data;
  },

  /**
   * 리그 결과 확인 완료 처리
   * POST /api/v1/league/result/confirm
   */
  confirmResult: async (): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.LEAGUE.RESULT_CONFIRM);
  },
};
