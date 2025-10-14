import { useCallback, useMemo } from 'react';
import type { ChartDataPoint, ExtendedStatisticsSummary, RunningChartDto } from '../models';
import { Period, getStartOfWeek, getStartOfMonth, getStartOfYear } from '../models';
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
 * 메인 Statistics ViewModel
 * 백엔드 API 응답을 사용하여 통계 표시
 *
 * @param period - 필터 기간 (View에서 관리)
 */
export const useStatisticsViewModel = (period: Period = Period.MONTH) => {
  // Period에 따른 날짜 범위 계산
  const { startDateTime, endDateTime } = useMemo(() => {
    return calculateDateRange(period);
  }, [period]);

  // 백엔드 통계 조회
  // period가 변경되면 자동으로 새로운 쿼리 실행
  const {
    data: summary,
    error,
    isLoading,
    isRefetching,
    refetch,
  } = useGetStatisticsSummary({
    startDateTime,
    endDateTime,
    statisticType: period,
  });

  const hasError = !!error;

  // 최종 통계 (백엔드 API 응답을 UI 형태로 변환)
  const finalStats: ExtendedStatisticsSummary | null = useMemo(() => {
    if (!summary) return null;

    return {
      ...summary,
      // 별칭
      runCount: summary.runningCount,
      totalDuration: summary.totalDurationSec,
      // 변환: averagePaceSec는 초/미터 단위
      averagePace: summary.averagePaceSec * 1000 * 60, // 초/미터 → 분/km
      // 계산
      averageDuration: summary.runningCount > 0 ? summary.totalDurationSec / summary.runningCount : 0,
      averageSpeed: summary.totalDurationSec > 0 ? (summary.totalDistance / 1000) / (summary.totalDurationSec / 3600) : 0,
      // 칼로리는 사용하지 않으므로 0
      totalCalories: 0,
      averageCalories: 0,
    };
  }, [summary]);

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

  // 새로고침 핸들러
  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

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

    // 상태
    isLoading,
    isRefreshing: isRefetching,
    hasError,
    hasValidData,

    // 에러 정보
    error,

    // 액션
    handleRefresh,
  };
};
