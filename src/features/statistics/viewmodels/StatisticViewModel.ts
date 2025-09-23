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
  calculatePersonalRecords,
  calculateTrends,
  calculateGoalProgress,
  getStartOfWeek,
  getStartOfMonth,
  getStartOfYear,
  formatDate,
} from '../models';
import { RunningRecord } from '../../running/models';

/**
 * Statistics ViewModel
 * Swift StatisticViewModel을 React Hook으로 마이그레이션
 */
export const useStatisticViewModel = () => {
  // 상태 관리
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(Period.MONTH);
  const [startDate, setStartDate] = useState<Date>(getStartOfMonth(new Date()));
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<RunningRecord[]>([]);

  /**
   * 러닝 기록 조회
   * Swift StatisticViewModel.loadRuningRecords 대응
   */
  const {
    data: runningRecordsData,
    error: recordsError,
    isLoading: isLoadingRecords,
    isFetching: isFetchingRecords,
    refetch: refetchRecords,
  } = useGetRunningRecordsQuery({
    startDate: startDate,
    endDate: new Date(),
    size: 100,
  });

  /**
   * 통계 요약 조회
   * Swift StatisticViewModel.statistics 대응
   */
  const {
    data: statisticsSummary,
    error: statsError,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useGetStatisticsSummaryQuery({
    period: selectedPeriod,
    startDate: formatDate(startDate, 'YYYY-MM-DD'),
    endDate: formatDate(new Date(), 'YYYY-MM-DD'),
  });

  /**
   * 차트 데이터 조회
   * Swift RunningChartViewModel 대응
   */
  const {
    data: chartData,
    error: chartError,
    isLoading: isLoadingChart,
    refetch: refetchChart,
  } = useGetChartDataQuery({
    period: selectedPeriod,
    startDate: formatDate(startDate, 'YYYY-MM-DD'),
    endDate: formatDate(new Date(), 'YYYY-MM-DD'),
  });

  /**
   * 개인 기록 조회
   */
  const {
    data: personalRecords,
    isLoading: isLoadingRecords,
  } = useGetPersonalRecordsQuery();

  /**
   * 대시보드 데이터 조회
   */
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    refetch: refetchDashboard,
  } = useGetDashboardDataQuery({
    period: selectedPeriod,
  });

  /**
   * 러닝 기록 업데이트 처리
   * Swift StatisticViewModel.records didSet 대응
   */
  useEffect(() => {
    if (runningRecordsData?.content) {
      // 중복 제거 로직
      const newRecords = runningRecordsData.content;
      const uniqueRecords: RunningRecord[] = [];

      newRecords.forEach(record => {
        if (!records.find(existing => existing.id === record.id)) {
          uniqueRecords.push(record);
        }
      });

      if (uniqueRecords.length > 0) {
        setRecords(prev => [...prev, ...uniqueRecords].sort((a, b) => b.startTimestamp - a.startTimestamp));
      }
    }
  }, [runningRecordsData, records]);

  /**
   * 기간 변경 처리
   * Swift StatisticViewModel.selectedPeriod didSet 대응
   */
  const handlePeriodChange = useCallback((newPeriod: Period) => {
    if (newPeriod === selectedPeriod) return;

    setSelectedPeriod(newPeriod);
    setRecords([]); // 기록 초기화

    // 시작 날짜 설정
    let newStartDate: Date;
    switch (newPeriod) {
      case Period.WEEK:
        newStartDate = getStartOfWeek(new Date());
        break;
      case Period.MONTH:
        newStartDate = getStartOfMonth(new Date());
        break;
      case Period.YEAR:
        newStartDate = getStartOfYear(new Date());
        break;
      default:
        newStartDate = getStartOfMonth(new Date());
    }

    setStartDate(newStartDate);
  }, [selectedPeriod]);

  /**
   * 데이터 새로고침
   * Swift StatisticViewModel.loadRuningRecords 대응
   */
  const refreshData = useCallback(async () => {
    setIsLoading(true);

    try {
      await Promise.all([
        refetchRecords(),
        refetchStats(),
        refetchChart(),
        refetchDashboard(),
      ]);
    } catch (error) {
      console.error('Failed to refresh statistics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refetchRecords, refetchStats, refetchChart, refetchDashboard]);

  /**
   * 더 많은 기록 로드
   * Swift StatisticViewModel.loadMoreRecords 대응
   */
  const loadMoreRecords = useCallback(async () => {
    // RTK Query의 페이지네이션 로직에 의해 자동 처리됨
    if (runningRecordsData?.hasNext) {
      await refetchRecords();
    }
  }, [runningRecordsData?.hasNext, refetchRecords]);

  /**
   * 필터링된 기록
   * Swift StatisticViewModel.filteredRecords 대응
   */
  const filteredRecords = useMemo(() => {
    return filterRecordsByPeriod(records, selectedPeriod);
  }, [records, selectedPeriod]);

  /**
   * 로컬 통계 계산
   * Swift StatisticViewModel.statistics 대응
   */
  const localStatistics = useMemo(() => {
    return calculateStatistics(filteredRecords);
  }, [filteredRecords]);

  /**
   * 로컬 차트 데이터 생성
   */
  const localChartData = useMemo(() => {
    return generateChartData(filteredRecords, selectedPeriod);
  }, [filteredRecords, selectedPeriod]);

  /**
   * 로컬 개인 기록 계산
   */
  const localPersonalRecords = useMemo(() => {
    return calculatePersonalRecords(records);
  }, [records]);

  /**
   * 기간별 시작 날짜 포맷팅
   */
  const formattedPeriod = useMemo(() => {
    const now = new Date();
    switch (selectedPeriod) {
      case Period.WEEK:
        return `${formatDate(getStartOfWeek(now), 'YYYY-MM-DD')} ~ ${formatDate(now, 'YYYY-MM-DD')}`;
      case Period.MONTH:
        return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
      case Period.YEAR:
        return `${now.getFullYear()}년`;
      default:
        return '';
    }
  }, [selectedPeriod]);

  /**
   * 로딩 상태 종합
   */
  const isLoadingData = useMemo(() => {
    return isLoading ||
           isLoadingRecords ||
           isFetchingRecords ||
           isLoadingStats ||
           isLoadingChart ||
           isLoadingDashboard;
  }, [isLoading, isLoadingRecords, isFetchingRecords, isLoadingStats, isLoadingChart, isLoadingDashboard]);

  /**
   * 에러 상태 종합
   */
  const hasError = useMemo(() => {
    return !!recordsError || !!statsError || !!chartError;
  }, [recordsError, statsError, chartError]);

  /**
   * 데이터 유효성 확인
   */
  const hasData = useMemo(() => {
    return records.length > 0 || (statisticsSummary && statisticsSummary.runCount > 0);
  }, [records.length, statisticsSummary]);

  return {
    // State
    selectedPeriod,
    startDate,
    records,
    filteredRecords,

    // API Data
    statisticsSummary: statisticsSummary || localStatistics,
    chartData: chartData || localChartData,
    personalRecords: personalRecords || localPersonalRecords,
    dashboardData,

    // Local computed data
    localStatistics,
    localChartData,
    localPersonalRecords,

    // Loading states
    isLoadingData,
    isLoadingRecords,
    isLoadingStats,
    isLoadingChart,
    isLoadingDashboard,
    hasMoreData: runningRecordsData?.hasNext || false,

    // Error states
    hasError,
    recordsError,
    statsError,
    chartError,

    // Actions
    handlePeriodChange,
    refreshData,
    loadMoreRecords,

    // Computed values
    formattedPeriod,
    hasData,
    canLoadMore: runningRecordsData?.hasNext && !isLoadingData,
    totalRecords: records.length,
    filteredRecordsCount: filteredRecords.length,
  };
};

/**
 * 차트 전용 ViewModel
 * Swift RunningChartViewModel 대응
 */
export const useChartViewModel = (period: Period = Period.MONTH) => {
  const [chartPeriod, setChartPeriod] = useState(period);

  const {
    data: chartData,
    error,
    isLoading,
    refetch,
  } = useGetChartDataQuery({
    period: chartPeriod,
  });

  const updatePeriod = useCallback((newPeriod: Period) => {
    setChartPeriod(newPeriod);
  }, []);

  return {
    chartData: chartData || [],
    period: chartPeriod,
    error,
    isLoading,
    updatePeriod,
    refetch,
    hasData: (chartData?.length || 0) > 0,
    hasError: !!error,
  };
};

/**
 * 개인 기록 전용 ViewModel
 */
export const usePersonalRecordsViewModel = () => {
  const {
    data: personalRecords,
    error,
    isLoading,
    refetch,
  } = useGetPersonalRecordsQuery();

  const formattedRecords = useMemo(() => {
    if (!personalRecords) return null;

    return {
      ...personalRecords,
      longestDistance: {
        ...personalRecords.longestDistance,
        formattedValue: `${(personalRecords.longestDistance.value / 1000).toFixed(2)}km`,
        formattedDate: new Date(personalRecords.longestDistance.date).toLocaleDateString('ko-KR'),
      },
      longestDuration: {
        ...personalRecords.longestDuration,
        formattedValue: `${Math.floor(personalRecords.longestDuration.value / 3600)}시간 ${Math.floor((personalRecords.longestDuration.value % 3600) / 60)}분`,
        formattedDate: new Date(personalRecords.longestDuration.date).toLocaleDateString('ko-KR'),
      },
      fastestPace: {
        ...personalRecords.fastestPace,
        formattedValue: `${personalRecords.fastestPace.value.toFixed(2)}분/km`,
        formattedDate: new Date(personalRecords.fastestPace.date).toLocaleDateString('ko-KR'),
      },
      mostCalories: {
        ...personalRecords.mostCalories,
        formattedValue: `${personalRecords.mostCalories.value}kcal`,
        formattedDate: new Date(personalRecords.mostCalories.date).toLocaleDateString('ko-KR'),
      },
    };
  }, [personalRecords]);

  return {
    personalRecords,
    formattedRecords,
    error,
    isLoading,
    refetch,
    hasRecords: !!personalRecords,
    hasError: !!error,
  };
};

/**
 * 트렌드 분석 전용 ViewModel
 */
export const useTrendsViewModel = (period: Period = Period.MONTH) => {
  const {
    data: trends,
    error,
    isLoading,
    refetch,
  } = useGetTrendsQuery({
    currentPeriod: period,
  });

  const formattedTrends = useMemo(() => {
    if (!trends) return null;

    const formatTrend = (value: number) => {
      const prefix = value >= 0 ? '+' : '';
      return `${prefix}${value.toFixed(1)}%`;
    };

    return {
      distanceTrend: {
        value: trends.distanceTrend,
        formatted: formatTrend(trends.distanceTrend),
        isPositive: trends.distanceTrend >= 0,
      },
      durationTrend: {
        value: trends.durationTrend,
        formatted: formatTrend(trends.durationTrend),
        isPositive: trends.durationTrend >= 0,
      },
      paceTrend: {
        value: trends.paceTrend,
        formatted: formatTrend(trends.paceTrend),
        isPositive: trends.paceTrend <= 0, // 페이스는 낮을수록 좋음
      },
      caloriesTrend: {
        value: trends.caloriesTrend,
        formatted: formatTrend(trends.caloriesTrend),
        isPositive: trends.caloriesTrend >= 0,
      },
      runCountTrend: {
        value: trends.runCountTrend,
        formatted: formatTrend(trends.runCountTrend),
        isPositive: trends.runCountTrend >= 0,
      },
    };
  }, [trends]);

  return {
    trends,
    formattedTrends,
    error,
    isLoading,
    refetch,
    hasTrends: !!trends,
    hasError: !!error,
  };
};