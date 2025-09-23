import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseApi';
import {
  StatisticsSummary,
  ChartDataPoint,
  MonthlyStatistics,
  WeeklyStatistics,
  YearlyStatistics,
  PersonalRecords,
  Period,
} from '../../features/statistics/models';

/**
 * Statistics API
 * Swift StatisticViewModel과 RunningChartService를 RTK Query로 마이그레이션
 */
export const statisticApi = createApi({
  reducerPath: 'statisticApi',
  baseQuery,
  tagTypes: ['Statistics', 'Chart', 'PersonalRecords'],
  endpoints: (builder) => ({
    /**
     * 기간별 통계 요약 조회
     * Swift StatisticViewModel.statistics 대응
     */
    getStatisticsSummary: builder.query<StatisticsSummary, {
      period: Period;
      startDate?: string;
      endDate?: string;
    }>({
      query: (params) => ({
        url: '/statistics/summary',
        params,
      }),
      providesTags: ['Statistics'],
    }),

    /**
     * 차트 데이터 조회
     * Swift RunningChartViewModel 데이터 대응
     */
    getChartData: builder.query<ChartDataPoint[], {
      period: Period;
      startDate?: string;
      endDate?: string;
    }>({
      query: (params) => ({
        url: '/statistics/chart',
        params,
      }),
      providesTags: ['Chart'],
    }),

    /**
     * 월별 통계 조회
     * Swift MonthlyStatistics 대응
     */
    getMonthlyStatistics: builder.query<MonthlyStatistics[], {
      year?: number;
      limit?: number;
    }>({
      query: (params) => ({
        url: '/statistics/monthly',
        params,
      }),
      providesTags: ['Statistics'],
    }),

    /**
     * 주별 통계 조회
     * Swift WeeklyStatistics 대응
     */
    getWeeklyStatistics: builder.query<WeeklyStatistics[], {
      year?: number;
      month?: number;
      limit?: number;
    }>({
      query: (params) => ({
        url: '/statistics/weekly',
        params,
      }),
      providesTags: ['Statistics'],
    }),

    /**
     * 연간 통계 조회
     * Swift YearlyStatistics 대응
     */
    getYearlyStatistics: builder.query<YearlyStatistics[], {
      limit?: number;
    }>({
      query: (params) => ({
        url: '/statistics/yearly',
        params,
      }),
      providesTags: ['Statistics'],
    }),

    /**
     * 개인 기록 조회
     * Swift PersonalRecords 대응
     */
    getPersonalRecords: builder.query<PersonalRecords, void>({
      query: () => '/statistics/records',
      providesTags: ['PersonalRecords'],
    }),

    /**
     * 트렌드 분석
     * Swift 트렌드 계산 로직 대응
     */
    getTrends: builder.query<{
      distanceTrend: number;
      durationTrend: number;
      paceTrend: number;
      caloriesTrend: number;
      runCountTrend: number;
    }, {
      currentPeriod: Period;
      startDate?: string;
      endDate?: string;
    }>({
      query: (params) => ({
        url: '/statistics/trends',
        params,
      }),
      providesTags: ['Statistics'],
    }),

    /**
     * 목표 대비 진행률 조회
     * Swift 목표 달성률 계산 대응
     */
    getGoalProgress: builder.query<{
      weeklyDistanceProgress: number;
      monthlyDistanceProgress: number;
      yearlyDistanceProgress: number;
      weeklyRunsProgress: number;
      monthlyRunsProgress: number;
    }, {
      weeklyDistance?: number;
      monthlyDistance?: number;
      yearlyDistance?: number;
      weeklyRuns?: number;
      monthlyRuns?: number;
    }>({
      query: (params) => ({
        url: '/statistics/goals',
        params,
      }),
      providesTags: ['Statistics'],
    }),

    /**
     * 성과 비교 (이전 기간 대비)
     * Swift 기간 비교 로직 대응
     */
    getPerformanceComparison: builder.query<{
      currentPeriod: StatisticsSummary;
      previousPeriod: StatisticsSummary;
      improvement: {
        distance: number;
        duration: number;
        pace: number;
        calories: number;
        runCount: number;
      };
    }, {
      period: Period;
      startDate?: string;
      endDate?: string;
    }>({
      query: (params) => ({
        url: '/statistics/comparison',
        params,
      }),
      providesTags: ['Statistics'],
    }),

    /**
     * 러닝 일관성 분석
     * Swift 러닝 패턴 분석 대응
     */
    getConsistencyAnalysis: builder.query<{
      consistencyScore: number;
      weeklyVariance: number;
      longestStreak: number;
      currentStreak: number;
      averageGapDays: number;
      recommendations: string[];
    }, {
      period: Period;
      startDate?: string;
      endDate?: string;
    }>({
      query: (params) => ({
        url: '/statistics/consistency',
        params,
      }),
      providesTags: ['Statistics'],
    }),

    /**
     * 시간대별 러닝 패턴 분석
     * Swift 시간대 분석 대응
     */
    getTimePatternAnalysis: builder.query<{
      hourlyDistribution: { hour: number; count: number; avgDistance: number }[];
      preferredTimeSlot: string;
      weekdayPattern: { day: string; count: number; avgDistance: number }[];
      recommendations: string[];
    }, {
      startDate?: string;
      endDate?: string;
    }>({
      query: (params) => ({
        url: '/statistics/time-patterns',
        params,
      }),
      providesTags: ['Statistics'],
    }),

    /**
     * 상세 통계 대시보드 데이터
     * Swift 종합 대시보드 데이터 대응
     */
    getDashboardData: builder.query<{
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
    }, {
      period: Period;
    }>({
      query: (params) => ({
        url: '/statistics/dashboard',
        params,
      }),
      providesTags: ['Statistics', 'Chart', 'PersonalRecords'],
    }),
  }),
});

export const {
  useGetStatisticsSummaryQuery,
  useGetChartDataQuery,
  useGetMonthlyStatisticsQuery,
  useGetWeeklyStatisticsQuery,
  useGetYearlyStatisticsQuery,
  useGetPersonalRecordsQuery,
  useGetTrendsQuery,
  useGetGoalProgressQuery,
  useGetPerformanceComparisonQuery,
  useGetConsistencyAnalysisQuery,
  useGetTimePatternAnalysisQuery,
  useGetDashboardDataQuery,
} = statisticApi;