/**
 * Statistics React Query Hooks
 * 기존 statisticApi.ts의 RTK Query hooks를 React Query로 마이그레이션
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { statisticsService } from './statisticsService';
import { queryKeys } from '../queryClient';
import type { Period } from '../../features/statistics/models';

/**
 * 기간별 통계 요약 조회
 * 기존: useGetStatisticsSummaryQuery()
 */
export const useGetStatisticsSummary = (
  params: {
    period: Period;
    startDate?: string;
    endDate?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.statistics.summary(params),
    queryFn: () => statisticsService.getStatisticsSummary(params),
    enabled: options?.enabled,
  });
};

/**
 * 차트 데이터 조회
 * 기존: useGetChartDataQuery()
 */
export const useGetChartData = (
  params: {
    period: Period;
    startDate?: string;
    endDate?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.statistics.chart(params),
    queryFn: () => statisticsService.getChartData(params),
    enabled: options?.enabled,
  });
};

/**
 * 월별 통계 조회
 * 기존: useGetMonthlyStatisticsQuery()
 */
export const useGetMonthlyStatistics = (
  params?: {
    year?: number;
    limit?: number;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.statistics.monthly(params),
    queryFn: () => statisticsService.getMonthlyStatistics(params),
    enabled: options?.enabled,
  });
};

/**
 * 주별 통계 조회
 * 기존: useGetWeeklyStatisticsQuery()
 */
export const useGetWeeklyStatistics = (
  params?: {
    year?: number;
    month?: number;
    limit?: number;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.statistics.weekly(params),
    queryFn: () => statisticsService.getWeeklyStatistics(params),
    enabled: options?.enabled,
  });
};

/**
 * 연간 통계 조회
 * 기존: useGetYearlyStatisticsQuery()
 */
export const useGetYearlyStatistics = (
  params?: {
    limit?: number;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.statistics.yearly(params?.limit),
    queryFn: () => statisticsService.getYearlyStatistics(params),
    enabled: options?.enabled,
  });
};

/**
 * 개인 기록 조회
 * 기존: useGetPersonalRecordsQuery()
 */
export const useGetPersonalRecords = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.statistics.records,
    queryFn: () => statisticsService.getPersonalRecords(),
    enabled: options?.enabled,
    staleTime: 10 * 60 * 1000, // 10분간 캐시 유지
  });
};

/**
 * 트렌드 분석
 * 기존: useGetTrendsQuery()
 */
export const useGetTrends = (
  params: {
    currentPeriod: Period;
    startDate?: string;
    endDate?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.statistics.trends(params),
    queryFn: () => statisticsService.getTrends(params),
    enabled: options?.enabled,
  });
};

/**
 * 목표 대비 진행률 조회
 * 기존: useGetGoalProgressQuery()
 */
export const useGetGoalProgress = (
  params: {
    weeklyDistance?: number;
    monthlyDistance?: number;
    yearlyDistance?: number;
    weeklyRuns?: number;
    monthlyRuns?: number;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.statistics.goals(params),
    queryFn: () => statisticsService.getGoalProgress(params),
    enabled: options?.enabled,
  });
};

/**
 * 성과 비교 (이전 기간 대비)
 * 기존: useGetPerformanceComparisonQuery()
 */
export const useGetPerformanceComparison = (
  params: {
    period: Period;
    startDate?: string;
    endDate?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.statistics.comparison(params),
    queryFn: () => statisticsService.getPerformanceComparison(params),
    enabled: options?.enabled,
  });
};

/**
 * 러닝 일관성 분석
 * 기존: useGetConsistencyAnalysisQuery()
 */
export const useGetConsistencyAnalysis = (
  params: {
    period: Period;
    startDate?: string;
    endDate?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.statistics.consistency(params),
    queryFn: () => statisticsService.getConsistencyAnalysis(params),
    enabled: options?.enabled,
  });
};

/**
 * 시간대별 러닝 패턴 분석
 * 기존: useGetTimePatternAnalysisQuery()
 */
export const useGetTimePatternAnalysis = (
  params?: {
    startDate?: string;
    endDate?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.statistics.timePatterns(params),
    queryFn: () => statisticsService.getTimePatternAnalysis(params),
    enabled: options?.enabled,
  });
};

/**
 * 상세 통계 대시보드 데이터
 * 기존: useGetDashboardDataQuery()
 */
export const useGetDashboardData = (
  params: {
    period: Period;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.statistics.dashboard(params.period),
    queryFn: () => statisticsService.getDashboardData(params),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
};
