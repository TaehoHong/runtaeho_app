/**
 * Statistics React Query Hooks
 * 기존 statisticApi.ts의 RTK Query hooks를 React Query로 마이그레이션
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../services/queryClient';
import type {
  Period,
  StatisticsSummary,
} from '../models';
import { statisticsService } from './statisticsService';

/**
 * 기간별 통계 요약 조회
 * 기존: useGetStatisticsSummaryQuery()
 * 백엔드 API: GET /api/v1/running/statistics?statisticType=WEEKLY
 */
export const useGetStatisticsSummary = (
  params: {
    statisticType: Period;
    timezone?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery<StatisticsSummary>({
    queryKey: queryKeys.statistics.summary(params),
    queryFn: () => statisticsService.getStatisticsSummary(params),
    enabled: options?.enabled ?? true,
  });
};
