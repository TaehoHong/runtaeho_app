import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  useGetStatisticsSummaryQuery,
  useGetChartDataQuery,
  useGetPersonalRecordsQuery,
  useGetTrendsQuery,
  useGetGoalProgressQuery,
  useGetPerformanceComparisonQuery,
  useGetConsistencyAnalysisQuery,
  useGetTimePatternAnalysisQuery,
  useGetDashboardDataQuery,
} from '../../../store/api/statisticApi';
import { useGetRunningRecordsQuery } from '../../../store/api/runningApi';
import {
  Period,
  StatisticsSummary,
  ChartDataPoint,
  PersonalRecords,
  calculateStatistics,
  filterRecordsByPeriod,
  generateChartData,
} from '../models';

/**
 * 메인 Statistics ViewModel
 * 대시보드 및 통합 통계 정보를 관리
 */
export const useStatisticsViewModel = (period: Period = Period.MONTH) => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(period);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // API 호출들
  const {
    data: summary,
    error: summaryError,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useGetStatisticsSummaryQuery({ period: selectedPeriod });

  const {
    data: chartData,
    error: chartError,
    isLoading: chartLoading,
    refetch: refetchChart,
  } = useGetChartDataQuery({ period: selectedPeriod });

  const {
    data: dashboardData,
    error: dashboardError,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useGetDashboardDataQuery({ period: selectedPeriod });

  // 로컬 계산을 위한 running records
  const {
    data: runningRecords,
    error: recordsError,
    isLoading: recordsLoading,
  } = useGetRunningRecordsQuery({});

  // 전체 로딩 상태
  const isLoading = summaryLoading || chartLoading || dashboardLoading || recordsLoading;
  const hasError = !!(summaryError || chartError || dashboardError || recordsError);

  // 통계 요약 정보 포맷팅
  const formattedSummary = useMemo(() => {
    if (!summary) return null;

    return {
      ...summary,
      totalDistanceFormatted: `${(summary.totalDistance / 1000).toFixed(2)}km`,
      totalDurationFormatted: `${Math.floor(summary.totalDuration / 3600)}시간 ${Math.floor((summary.totalDuration % 3600) / 60)}분`,
      averagePaceFormatted: `${summary.averagePace.toFixed(2)}분/km`,
      totalCaloriesFormatted: `${summary.totalCalories}kcal`,
    };
  }, [summary]);

  // 차트 데이터 포맷팅
  const formattedChartData = useMemo(() => {
    if (!chartData) return null;

    return chartData.map((point: ChartDataPoint) => ({
      ...point,
      formattedDate: new Date(point.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      }),
      formattedDistance: `${(point.distance / 1000).toFixed(1)}km`,
      formattedDuration: `${Math.floor(point.duration / 60)}분`,
    }));
  }, [chartData]);

  // 로컬 통계 계산 (백업용)
  const localStats = useMemo(() => {
    if (!runningRecords) return null;

    // CursorResult<RunningRecord> 형태의 데이터에서 content 배열 추출
    const recordsArray = Array.isArray(runningRecords) ? runningRecords : runningRecords.content || [];
    const filteredRecords = filterRecordsByPeriod(recordsArray, selectedPeriod);
    return calculateStatistics(filteredRecords);
  }, [runningRecords, selectedPeriod]);

  // 기간 변경 핸들러
  const handlePeriodChange = useCallback((newPeriod: Period) => {
    setSelectedPeriod(newPeriod);
  }, []);

  // 새로고침 핸들러
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchSummary(),
        refetchChart(),
        refetchDashboard(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchSummary, refetchChart, refetchDashboard]);

  // 통계 데이터 유효성 검사
  const hasValidData = useMemo(() => {
    const hasRecords = runningRecords && (Array.isArray(runningRecords) ? runningRecords.length > 0 : runningRecords.content?.length > 0);
    return !!(summary || localStats) && !!(chartData || hasRecords);
  }, [summary, localStats, chartData, runningRecords]);

  return {
    // 데이터
    summary,
    formattedSummary,
    chartData,
    formattedChartData,
    dashboardData,
    localStats,

    // 상태
    selectedPeriod,
    isLoading,
    isRefreshing,
    hasError,
    hasValidData,

    // 에러 정보
    errors: {
      summary: summaryError,
      chart: chartError,
      dashboard: dashboardError,
      records: recordsError,
    },

    // 액션
    handlePeriodChange,
    handleRefresh,
    refetchSummary,
    refetchChart,
    refetchDashboard,
  };
};

/**
 * 목표 진행률 ViewModel
 */
export const useGoalProgressViewModel = (goals?: {
  weeklyDistance?: number;
  monthlyDistance?: number;
  yearlyDistance?: number;
  weeklyRuns?: number;
  monthlyRuns?: number;
}) => {
  const {
    data: goalProgress,
    error,
    isLoading,
    refetch,
  } = useGetGoalProgressQuery(goals || {});

  const formattedProgress = useMemo(() => {
    if (!goalProgress) return null;

    return {
      ...goalProgress,
      weeklyDistanceFormatted: `${goalProgress.weeklyDistanceProgress.toFixed(1)}%`,
      monthlyDistanceFormatted: `${goalProgress.monthlyDistanceProgress.toFixed(1)}%`,
      yearlyDistanceFormatted: `${goalProgress.yearlyDistanceProgress.toFixed(1)}%`,
      weeklyRunsFormatted: `${goalProgress.weeklyRunsProgress.toFixed(1)}%`,
      monthlyRunsFormatted: `${goalProgress.monthlyRunsProgress.toFixed(1)}%`,
    };
  }, [goalProgress]);

  return {
    goalProgress,
    formattedProgress,
    error,
    isLoading,
    refetch,
    hasGoals: !!goalProgress,
    hasError: !!error,
  };
};

/**
 * 성과 비교 ViewModel
 */
export const usePerformanceComparisonViewModel = (period: Period = Period.MONTH) => {
  const {
    data: comparison,
    error,
    isLoading,
    refetch,
  } = useGetPerformanceComparisonQuery({ period });

  const formattedComparison = useMemo(() => {
    if (!comparison) return null;

    const formatChange = (value: number) => {
      const prefix = value >= 0 ? '+' : '';
      const suffix = value >= 0 ? ' 향상' : ' 감소';
      return `${prefix}${Math.abs(value).toFixed(1)}%${suffix}`;
    };

    return {
      ...comparison,
      distance: {
        changePercentage: comparison.improvement.distance,
        formattedChange: formatChange(comparison.improvement.distance),
      },
      pace: {
        changePercentage: comparison.improvement.pace,
        formattedChange: formatChange(comparison.improvement.pace),
      },
      duration: {
        changePercentage: comparison.improvement.duration,
        formattedChange: formatChange(comparison.improvement.duration),
      },
      calories: {
        changePercentage: comparison.improvement.calories,
        formattedChange: formatChange(comparison.improvement.calories),
      },
      runCount: {
        changePercentage: comparison.improvement.runCount,
        formattedChange: formatChange(comparison.improvement.runCount),
      },
    };
  }, [comparison]);

  return {
    comparison,
    formattedComparison,
    error,
    isLoading,
    refetch,
    hasComparison: !!comparison,
    hasError: !!error,
  };
};

// PersonalRecordsViewModel과 TrendsViewModel은
// 별도 파일에서 더 자세하게 구현됩니다.