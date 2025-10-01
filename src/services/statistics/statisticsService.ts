/**
 * Statistics Service
 * 기존 statisticApi.ts에서 마이그레이션
 * RTK Query → Axios
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/config';
import type {
  StatisticsSummary,
  ChartDataPoint,
  MonthlyStatistics,
  WeeklyStatistics,
  YearlyStatistics,
  PersonalRecords,
  Period,
} from '../../features/statistics/models';

/**
 * Statistics API Service
 * 기존 statisticApi.endpoints를 함수로 변환
 */
export const statisticsService = {
  /**
   * 기간별 통계 요약 조회
   * 기존: getStatisticsSummary query
   * Swift StatisticViewModel.statistics 대응
   */
  getStatisticsSummary: async (params: {
    period: Period;
    startDate?: string;
    endDate?: string;
  }): Promise<StatisticsSummary> => {
    const { data } = await apiClient.get<StatisticsSummary>(
      API_ENDPOINTS.STATISTICS.SUMMARY,
      { params }
    );
    return data;
  },

  /**
   * 차트 데이터 조회
   * 기존: getChartData query
   * Swift RunningChartViewModel 데이터 대응
   */
  getChartData: async (params: {
    period: Period;
    startDate?: string;
    endDate?: string;
  }): Promise<ChartDataPoint[]> => {
    const { data } = await apiClient.get<ChartDataPoint[]>(
      API_ENDPOINTS.STATISTICS.CHART,
      { params }
    );
    return data;
  },

  /**
   * 월별 통계 조회
   * 기존: getMonthlyStatistics query
   * Swift MonthlyStatistics 대응
   */
  getMonthlyStatistics: async (params?: {
    year?: number;
    limit?: number;
  }): Promise<MonthlyStatistics[]> => {
    const { data } = await apiClient.get<MonthlyStatistics[]>(
      API_ENDPOINTS.STATISTICS.MONTHLY,
      { params }
    );
    return data;
  },

  /**
   * 주별 통계 조회
   * 기존: getWeeklyStatistics query
   * Swift WeeklyStatistics 대응
   */
  getWeeklyStatistics: async (params?: {
    year?: number;
    month?: number;
    limit?: number;
  }): Promise<WeeklyStatistics[]> => {
    const { data } = await apiClient.get<WeeklyStatistics[]>(
      API_ENDPOINTS.STATISTICS.WEEKLY,
      { params }
    );
    return data;
  },

  /**
   * 연간 통계 조회
   * 기존: getYearlyStatistics query
   * Swift YearlyStatistics 대응
   */
  getYearlyStatistics: async (params?: {
    limit?: number;
  }): Promise<YearlyStatistics[]> => {
    const { data } = await apiClient.get<YearlyStatistics[]>(
      API_ENDPOINTS.STATISTICS.YEARLY,
      { params }
    );
    return data;
  },

  /**
   * 개인 기록 조회
   * 기존: getPersonalRecords query
   * Swift PersonalRecords 대응
   */
  getPersonalRecords: async (): Promise<PersonalRecords> => {
    const { data } = await apiClient.get<PersonalRecords>(
      API_ENDPOINTS.STATISTICS.RECORDS
    );
    return data;
  },

  /**
   * 트렌드 분석
   * 기존: getTrends query
   * Swift 트렌드 계산 로직 대응
   */
  getTrends: async (params: {
    currentPeriod: Period;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    distanceTrend: number;
    durationTrend: number;
    paceTrend: number;
    caloriesTrend: number;
    runCountTrend: number;
  }> => {
    const { data } = await apiClient.get<{
      distanceTrend: number;
      durationTrend: number;
      paceTrend: number;
      caloriesTrend: number;
      runCountTrend: number;
    }>(API_ENDPOINTS.STATISTICS.TRENDS, { params });
    return data;
  },

  /**
   * 목표 대비 진행률 조회
   * 기존: getGoalProgress query
   * Swift 목표 달성률 계산 대응
   */
  getGoalProgress: async (params: {
    weeklyDistance?: number;
    monthlyDistance?: number;
    yearlyDistance?: number;
    weeklyRuns?: number;
    monthlyRuns?: number;
  }): Promise<{
    weeklyDistanceProgress: number;
    monthlyDistanceProgress: number;
    yearlyDistanceProgress: number;
    weeklyRunsProgress: number;
    monthlyRunsProgress: number;
  }> => {
    const { data } = await apiClient.get<{
      weeklyDistanceProgress: number;
      monthlyDistanceProgress: number;
      yearlyDistanceProgress: number;
      weeklyRunsProgress: number;
      monthlyRunsProgress: number;
    }>(API_ENDPOINTS.STATISTICS.GOALS, { params });
    return data;
  },

  /**
   * 성과 비교 (이전 기간 대비)
   * 기존: getPerformanceComparison query
   * Swift 기간 비교 로직 대응
   */
  getPerformanceComparison: async (params: {
    period: Period;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    currentPeriod: StatisticsSummary;
    previousPeriod: StatisticsSummary;
    improvement: {
      distance: number;
      duration: number;
      pace: number;
      calories: number;
      runCount: number;
    };
  }> => {
    const { data } = await apiClient.get<{
      currentPeriod: StatisticsSummary;
      previousPeriod: StatisticsSummary;
      improvement: {
        distance: number;
        duration: number;
        pace: number;
        calories: number;
        runCount: number;
      };
    }>(API_ENDPOINTS.STATISTICS.COMPARISON, { params });
    return data;
  },

  /**
   * 러닝 일관성 분석
   * 기존: getConsistencyAnalysis query
   * Swift 러닝 패턴 분석 대응
   */
  getConsistencyAnalysis: async (params: {
    period: Period;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    consistencyScore: number;
    weeklyVariance: number;
    longestStreak: number;
    currentStreak: number;
    averageGapDays: number;
    recommendations: string[];
  }> => {
    const { data } = await apiClient.get<{
      consistencyScore: number;
      weeklyVariance: number;
      longestStreak: number;
      currentStreak: number;
      averageGapDays: number;
      recommendations: string[];
    }>(API_ENDPOINTS.STATISTICS.CONSISTENCY, { params });
    return data;
  },

  /**
   * 시간대별 러닝 패턴 분석
   * 기존: getTimePatternAnalysis query
   * Swift 시간대 분석 대응
   */
  getTimePatternAnalysis: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    hourlyDistribution: { hour: number; count: number; avgDistance: number }[];
    preferredTimeSlot: string;
    weekdayPattern: { day: string; count: number; avgDistance: number }[];
    recommendations: string[];
  }> => {
    const { data } = await apiClient.get<{
      hourlyDistribution: { hour: number; count: number; avgDistance: number }[];
      preferredTimeSlot: string;
      weekdayPattern: { day: string; count: number; avgDistance: number }[];
      recommendations: string[];
    }>(API_ENDPOINTS.STATISTICS.TIME_PATTERNS, { params });
    return data;
  },

  /**
   * 상세 통계 대시보드 데이터
   * 기존: getDashboardData query
   * Swift 종합 대시보드 데이터 대응
   */
  getDashboardData: async (params: {
    period: Period;
  }): Promise<{
    summary: StatisticsSummary;
    chartData: ChartDataPoint[];
    personalRecords: PersonalRecords;
    trends: {
      distanceTrend: number;
      paceTrend: number;
      consistencyTrend: number;
    };
    achievements: string[];
    nextGoals: string[];
  }> => {
    const { data } = await apiClient.get<{
      summary: StatisticsSummary;
      chartData: ChartDataPoint[];
      personalRecords: PersonalRecords;
      trends: {
        distanceTrend: number;
        paceTrend: number;
        consistencyTrend: number;
      };
      achievements: string[];
      nextGoals: string[];
    }>(API_ENDPOINTS.STATISTICS.DASHBOARD, { params });
    return data;
  },
};
