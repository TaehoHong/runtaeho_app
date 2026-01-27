/**
 * Statistics Service
 */

import { apiClient } from '../../../services/api/client';
import { API_ENDPOINTS } from '../../../services/api/config';
import { formatToLocalDateTime } from '~/shared/utils/dateUtils';
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
   */
  getStatisticsSummary: async (params: {
    startDateTime: Date;
    endDateTime: Date;
    statisticType: Period;
  }): Promise<StatisticsSummary> => {
    const requestParams = {
      startDateTime: formatToLocalDateTime(params.startDateTime),
      endDateTime: formatToLocalDateTime(params.endDateTime),
      statisticType: params.statisticType,
    };

    console.log('[STATISTICS_SERVICE] Request params:', requestParams);

    const { data } = await apiClient.get<StatisticsSummary>(
      API_ENDPOINTS.STATISTICS.SUMMARY,
      {
        params: requestParams
      }
    );
    return data;
  },
};