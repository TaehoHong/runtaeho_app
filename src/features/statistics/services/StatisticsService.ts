/**
 * Statistics Service
 */

import { apiClient } from '../../../services/api/client';
import { API_ENDPOINTS } from '../../../services/api/config';
import type {
  Period,
  StatisticsSummary,
} from '../models';

/**
 * Statistics API Service
 */
export const statisticsService = {
  /**
   * 기간별 통계 요약 조회
   * 백엔드 API: GET /api/v1/running/statistics?statisticType=WEEKLY&timezone=UTC
   */
  getStatisticsSummary: async (params: {
    statisticType: Period;
    timezone?: string;
  }): Promise<StatisticsSummary> => {
    const requestParams = {
      statisticType: params.statisticType,
      timezone: params.timezone || 'UTC',
    };

    console.log('[STATISTICS_SERVICE] Request params:', requestParams);
    console.log('[STATISTICS_SERVICE] statisticType value:', params.statisticType);
    console.log('[STATISTICS_SERVICE] statisticType type:', typeof params.statisticType);

    const { data } = await apiClient.get<StatisticsSummary>(
      API_ENDPOINTS.STATISTICS.SUMMARY,
      {
        params: requestParams
      }
    );
    return data;
  },
};