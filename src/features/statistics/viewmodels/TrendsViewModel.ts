import { useMemo } from 'react';
import { useGetTrends } from '../../../services/statistics';
import { Period } from '../models';

/**
 * 트렌드 분석 전용 ViewModel
 * StatisticViewModel에서 분리된 트렌드 분석 Hook
 */
export const useTrendsViewModel = (period: Period = Period.MONTH) => {
  const {
    data: trends,
    error,
    isLoading,
    refetch,
  } = useGetTrends({
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