import { useCallback, useMemo, useState } from 'react';
import { useGetRunningRecords } from '../../../services/running';
import type { ChartDataPoint, StatisticsSummary, ExtendedStatisticsSummary, RunningChartDto } from '../models';
import { Period, calculateStatistics, filterRecordsByPeriod, getStartOfWeek, getStartOfMonth, getStartOfYear } from '../models';
import { useGetStatisticsSummary } from '../services';

/**
 * Period에 따라 시작/종료 날짜 계산
 */
const calculateDateRange = (period: Period, referenceDate: Date = new Date()): { startDateTime: Date; endDateTime: Date } => {
  const endDateTime = new Date(referenceDate);
  endDateTime.setHours(23, 59, 59, 999);

  let startDateTime: Date;

  switch (period) {
    case Period.WEEK:
      startDateTime = getStartOfWeek(referenceDate);
      break;
    case Period.MONTH:
      startDateTime = getStartOfMonth(referenceDate);
      break;
    case Period.YEAR:
      startDateTime = getStartOfYear(referenceDate);
      break;
  }

  startDateTime.setHours(0, 0, 0, 0);

  return { startDateTime, endDateTime };
};

/**
 * 백엔드 차트 데이터를 UI용 차트 데이터로 변환
 */
const convertChartData = (backendChartData: RunningChartDto[]): ChartDataPoint[] => {
  return backendChartData.map(item => ({
    datetime: item.datetime,
    distance: item.distance,
    durationSec: item.durationSec,
    paceSec: item.paceSec,
    speed: item.durationSec > 0 ? (item.distance / 1000) / (item.durationSec / 3600) : 0, // km/h
    calories: 0, // 백엔드에서 제공하지 않으므로 0으로 설정
  }));
};

/**
 * 백엔드 응답을 확장된 형태로 변환
 */
const convertToExtendedSummary = (
  summary: StatisticsSummary,
  localCalories: { totalCalories: number; averageCalories: number }
): ExtendedStatisticsSummary => {
  return {
    ...summary,
    // 별칭
    runCount: summary.runningCount,
    totalDuration: summary.totalDurationSec,
    // 변환: averagePaceSec는 초/미터 단위
    averagePace: summary.averagePaceSec * 1000 * 60, // 초/미터 → 분/km
    // 로컬 계산
    averageDuration: summary.runningCount > 0 ? summary.totalDurationSec / summary.runningCount : 0,
    averageSpeed: summary.totalDurationSec > 0 ? (summary.totalDistance / 1000) / (summary.totalDurationSec / 3600) : 0,
    totalCalories: localCalories.totalCalories,
    averageCalories: localCalories.averageCalories,
  };
};

/**
 * 메인 Statistics ViewModel
 * 백엔드 API를 우선 사용하고, 칼로리 정보만 로컬에서 계산
 */
export const useStatisticsViewModel = (period: Period = Period.MONTH) => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(period);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Period에 따른 날짜 범위 계산
  const { startDateTime, endDateTime } = useMemo(() => {
    return calculateDateRange(selectedPeriod);
  }, [selectedPeriod]);

  // 백엔드 통계 조회
  const {
    data: summary,
    error: summaryError,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useGetStatisticsSummary({
    startDateTime,
    endDateTime,
    statisticType: selectedPeriod,
  });

  // 러닝 기록 조회 (로컬 계산용)
  const {
    data: runningRecordsResponse,
    error: recordsError,
    isLoading: recordsLoading,
    refetch: refetchRecords,
  } = useGetRunningRecords({});

  // 전체 로딩 상태
  const isLoading = summaryLoading || recordsLoading;
  const hasError = !!(summaryError || recordsError);

  // 러닝 기록 배열 추출
  const runningRecords = useMemo(() => {
    if (!runningRecordsResponse) return [];
    return runningRecordsResponse.content || [];
  }, [runningRecordsResponse]);

  // 기간별 필터링된 레코드
  const filteredRecords = useMemo(() => {
    return filterRecordsByPeriod(runningRecords, selectedPeriod);
  }, [runningRecords, selectedPeriod]);

  // 로컬 통계 계산 (칼로리 정보용 + fallback)
  const localStats = useMemo(() => {
    return calculateStatistics(filteredRecords);
  }, [filteredRecords]);

  // 최종 통계 (백엔드 우선, 실패 시 로컬)
  const finalStats: ExtendedStatisticsSummary = useMemo(() => {
    if (summary) {
      // 백엔드 응답을 확장된 형태로 변환
      return convertToExtendedSummary(summary, {
        totalCalories: localStats.totalCalories,
        averageCalories: localStats.averageCalories,
      });
    }
    // fallback: 로컬 계산 (이미 ExtendedStatisticsSummary 형태)
    return {
      statisticType: selectedPeriod,
      chartData: [],  // 백엔드 실패 시 빈 배열
      runningCount: localStats.runCount,
      totalDistance: localStats.totalDistance,
      totalDurationSec: localStats.totalDuration,
      averageDistance: localStats.averageDistance,
      averagePaceSec: localStats.averagePace * 60, // 분/km → 초/km
      runCount: localStats.runCount,
      totalDuration: localStats.totalDuration,
      averageDuration: localStats.averageDuration,
      averagePace: localStats.averagePace,
      averageSpeed: localStats.averageSpeed,
      totalCalories: localStats.totalCalories,
      averageCalories: localStats.averageCalories,
    };
  }, [summary, localStats, selectedPeriod]);

  // 차트 데이터 (백엔드에서 제공)
  const chartData = useMemo(() => {
    if (summary?.chartData) {
      return convertChartData(summary.chartData);
    }
    return [];
  }, [summary]);

  // 통계 요약 정보 포맷팅
  const formattedSummary = useMemo(() => {
    if (!finalStats) return null;

    return {
      ...finalStats,
      totalDistanceFormatted: `${(finalStats.totalDistance / 1000).toFixed(2)}km`,
      totalDurationFormatted: `${Math.floor(finalStats.totalDuration / 3600)}시간 ${Math.floor((finalStats.totalDuration % 3600) / 60)}분`,
      averagePaceFormatted: `${finalStats.averagePace.toFixed(2)}분/km`,
      totalCaloriesFormatted: `${finalStats.totalCalories}kcal`,
    };
  }, [finalStats]);

  // 차트 데이터 포맷팅
  const formattedChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    return chartData.map((point: ChartDataPoint) => ({
      ...point,
      formattedDate: new Date(point.datetime).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      }),
      formattedDistance: `${(point.distance / 1000).toFixed(1)}km`,
      formattedDuration: `${Math.floor(point.durationSec / 60)}분`,
      formattedPace: `${(point.paceSec * 1000 * 60).toFixed(2)}분/km`, // 초/미터 → 분/km
    }));
  }, [chartData]);

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
        refetchRecords(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchSummary, refetchRecords]);

  // 통계 데이터 유효성 검사
  const hasValidData = useMemo(() => {
    return !!finalStats && (finalStats.runCount > 0 || chartData.length > 0);
  }, [finalStats, chartData]);

  return {
    // 데이터
    summary: finalStats,
    formattedSummary,
    chartData,
    formattedChartData,
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
      records: recordsError,
    },

    // 액션
    handlePeriodChange,
    handleRefresh,
    refetchSummary,
  };
};
