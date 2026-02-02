import { useCallback, useEffect, useMemo } from 'react';
import type { ChartDataPoint, ExtendedStatisticsSummary, RunningChartDto } from '../models';
import {
  Period,
  PeriodDirection,
  calculateNextReferenceDate,
  isFutureDate,
  getStartOfWeek,
  getStartOfMonth,
  getStartOfYear,
  getEndOfPeriod,
} from '../models';
import { useGetStatisticsSummary } from '../services';

/**
 * Period에 따라 시작/종료 날짜 계산
 */
const calculateDateRange = (period: Period, referenceDate: Date = new Date()): { startDateTime: Date; endDateTime: Date } => {
  // 기간의 종료일 계산 (월: 월말, 주: 주 마지막 날, 연: 12/31)
  const endDateTime = getEndOfPeriod(referenceDate, period);

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
 * @param referenceDate - 기준 날짜 (스와이프로 기간 이동 시 사용)
 */
export const useStatisticsViewModel = (
  period: Period = Period.MONTH,
  referenceDate: Date = new Date()
) => {
  // Period에 따른 날짜 범위 계산 (현재 기간)
  const { startDateTime, endDateTime } = useMemo(() => {
    return calculateDateRange(period, referenceDate);
  }, [period, referenceDate]);

  // 이전 기간 날짜 범위 계산
  const prevReferenceDate = useMemo(() => {
    return calculateNextReferenceDate(referenceDate, period, PeriodDirection.PREVIOUS);
  }, [referenceDate, period]);

  const { startDateTime: prevStartDateTime, endDateTime: prevEndDateTime } = useMemo(() => {
    return calculateDateRange(period, prevReferenceDate);
  }, [period, prevReferenceDate]);

  // 다음 기간 날짜 범위 계산
  const nextReferenceDate = useMemo(() => {
    return calculateNextReferenceDate(referenceDate, period, PeriodDirection.NEXT);
  }, [referenceDate, period]);

  const { startDateTime: nextStartDateTime, endDateTime: nextEndDateTime } = useMemo(() => {
    return calculateDateRange(period, nextReferenceDate);
  }, [period, nextReferenceDate]);

  // 다음 기간이 미래인지 체크
  const isNextFuture = useMemo(() => {
    return isFutureDate(nextReferenceDate, period);
  }, [nextReferenceDate, period]);

  // 백엔드 통계 조회 (현재 기간)
  // period가 변경되면 자동으로 새로운 쿼리 실행
  const {
    data: summary,
    error,
    isLoading,      // 초기 로딩 (캐시 없음)
    isFetching,     // 백그라운드 페칭 포함
    refetch,
  } = useGetStatisticsSummary({
    startDateTime,
    endDateTime,
    statisticType: period,
  });

  // 이전 기간 쿼리 (프리페칭)
  const { data: prevSummary } = useGetStatisticsSummary({
    startDateTime: prevStartDateTime,
    endDateTime: prevEndDateTime,
    statisticType: period,
  });

  // 다음 기간 쿼리 (프리페칭, 미래 날짜면 비활성화)
  const { data: nextSummary } = useGetStatisticsSummary(
    {
      startDateTime: nextStartDateTime,
      endDateTime: nextEndDateTime,
      statisticType: period,
    },
    { enabled: !isNextFuture }
  );

  const hasError = !!error;

  // 에러 로깅
  useEffect(() => {
    if (error) {
      console.error('[StatisticsViewModel] Error:', {
        message: error.message,
        period,
        referenceDate: referenceDate.toISOString(),
      });
    }
  }, [error, period, referenceDate]);

  // 최종 통계 (백엔드 API 응답을 UI 형태로 변환)
  const finalStats: ExtendedStatisticsSummary | null = useMemo(() => {
    if (!summary) return null;

    return {
      ...summary,
      // 별칭
      runCount: summary.runningCount,
      totalDuration: summary.totalDurationSec,
      // 변환: averagePaceSec는 초/미터 단위
      averagePace: (summary.averagePaceSec * 1000) / 60, // 초/미터 → 분/km
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

  // 이전 기간 차트 데이터 (프리페칭)
  const prevChartData = useMemo(() => {
    if (prevSummary?.chartData) {
      return convertChartData(prevSummary.chartData);
    }
    return [];
  }, [prevSummary]);

  // 다음 기간 차트 데이터 (프리페칭)
  const nextChartData = useMemo(() => {
    if (nextSummary?.chartData) {
      return convertChartData(nextSummary.chartData);
    }
    return [];
  }, [nextSummary]);

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
      formattedPace: `${((point.paceSec * 1000) / 60).toFixed(2)}분/km`, // 초/미터 → 분/km
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

  // 이전/다음 기간 데이터 유효성
  const prevIsEmpty = prevChartData.length === 0;
  const nextIsEmpty = nextChartData.length === 0;

  return {
    // 데이터
    summary: finalStats,
    formattedSummary,
    chartData,
    formattedChartData,

    // 프리페치 데이터 (스와이프 시 깜빡임 방지)
    prevChartData,
    nextChartData,
    prevReferenceDate,
    nextReferenceDate,
    prevIsEmpty,
    nextIsEmpty,

    // 상태 구분
    isLoading,                                    // 기존 호환성 유지
    isInitialLoading: isLoading,                  // 초기 로딩 (캐시 없음)
    isBackgroundFetching: isFetching && !isLoading, // 백그라운드 페칭 (캐시 있음)
    // Note: isRefreshing 제거됨 - RefreshControl은 View에서 로컬 상태로 관리해야 함
    // isRefetching은 날짜 변경 등 모든 백그라운드 페칭에서 true가 되므로
    // 사용자 주도 Pull-to-Refresh와 구분할 수 없음
    hasError,
    hasValidData,

    // 에러 정보
    error,

    // 액션
    handleRefresh,
  };
};
