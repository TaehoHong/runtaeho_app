/**
 * Statistics React Query Hooks
 * 기존 statisticApi.ts의 RTK Query hooks를 React Query로 마이그레이션
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '../../../services/queryClient';
import type {
  Period,
  StatisticsSummary,
} from '../models';
import { statisticsService } from './statisticsService';

/**
 * Date를 ISO 문자열로 변환 (Query Key 안정화용)
 */
const dateToISOString = (date: Date): string => date.toISOString();

/**
 * 기간별 통계 요약 조회
 */
export const useGetStatisticsSummary = (
  params: {
    startDateTime: Date;
    endDateTime: Date;
    statisticType: Period;
  },
  options?: { enabled?: boolean }
) => {
  // Date를 ISO 문자열로 변환하여 안정적인 Query Key 생성
  const startDateString = dateToISOString(params.startDateTime);
  const endDateString = dateToISOString(params.endDateTime);

  return useQuery<StatisticsSummary>({
    queryKey: queryKeys.statistics.summary(
      params.statisticType,
      startDateString,
      endDateString
    ),
    queryFn: () => statisticsService.getStatisticsSummary(params),
    enabled: options?.enabled ?? true,
    // 이전 데이터 유지로 스와이프 시 깜빡임 방지
    placeholderData: keepPreviousData,
  });
};
