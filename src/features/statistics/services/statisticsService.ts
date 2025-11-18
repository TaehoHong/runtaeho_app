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
 * LocalDateTime 형식으로 변환
 * 예: "2024-01-01T00:00:00"
 */
const formatToLocalDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

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