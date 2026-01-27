/**
 * Statistics Calculator
 * 통계 계산 함수 모음
 */

import type { RunningRecord } from '../../running/models';
import { calculatePace } from '~/shared/utils/paceUtils';
import type { Period, LocalStatistics, ChartDataPoint, PersonalRecords } from './types';
import { getStartOfWeek, getStartOfMonth, getStartOfYear, formatDate } from './dateHelpers';

/**
 * 통계 계산 헬퍼 함수
 */
export const calculateStatistics = (records: RunningRecord[]): LocalStatistics => {
  if (records.length === 0) {
    return {
      runCount: 0,
      totalDistance: 0,
      totalDuration: 0,
      averageDistance: 0,
      averageDuration: 0,
      averagePace: 0,
      averageSpeed: 0,
      totalCalories: 0,
      averageCalories: 0,
    };
  }

  const runCount = records.length;
  const totalDistance = records.reduce((sum, record) => sum + record.distance, 0);
  const totalDuration = records.reduce((sum, record) => sum + record.durationSec, 0);
  const totalCalories = records.reduce((sum, record) => sum + record.calorie, 0);

  const averageDistance = totalDistance / runCount;
  const averageDuration = totalDuration / runCount;
  const averageCalories = totalCalories / runCount;
  const averagePace = calculatePace(averageDistance, averageDuration);
  const averageSpeed = averageDuration > 0 ? (averageDistance / 1000) / (averageDuration / 3600) : 0;

  return {
    runCount,
    totalDistance: Math.round(totalDistance),
    totalDuration: Math.round(totalDuration),
    averageDistance: Math.round(averageDistance),
    averageDuration: Math.round(averageDuration),
    averagePace: Math.round(averagePace * 100) / 100,
    averageSpeed: Math.round(averageSpeed * 100) / 100,
    totalCalories: Math.round(totalCalories),
    averageCalories: Math.round(averageCalories),
  };
};

/**
 * 기간별 레코드 필터링
 */
export const filterRecordsByPeriod = (
  records: RunningRecord[],
  period: Period,
  referenceDate: Date = new Date()
): RunningRecord[] => {
  const now = referenceDate;
  let startDate: Date;

  switch (period) {
    case 'WEEKLY':
      startDate = getStartOfWeek(now);
      break;
    case 'MONTHLY':
      startDate = getStartOfMonth(now);
      break;
    case 'YEARLY':
      startDate = getStartOfYear(now);
      break;
    default:
      return records;
  }

  return records.filter(record => {
    const recordDate = new Date(record.startTimestamp * 1000);
    return recordDate >= startDate && recordDate <= now;
  });
};

/**
 * 기간별 레코드 그룹화
 */
export const groupRecordsByPeriod = (
  records: RunningRecord[],
  period: Period
): Record<string, RunningRecord[]> => {
  return records.reduce((groups, record) => {
    const recordDate = new Date(record.startTimestamp * 1000);
    let groupKey: string;

    switch (period) {
      case 'WEEKLY': {
        const weekStart = getStartOfWeek(recordDate);
        groupKey = formatDate(weekStart, 'YYYY-MM-DD');
        break;
      }
      case 'MONTHLY':
        groupKey = formatDate(recordDate, 'YYYY-MM');
        break;
      case 'YEARLY':
        groupKey = formatDate(recordDate, 'YYYY');
        break;
      default:
        groupKey = formatDate(recordDate, 'YYYY-MM-DD');
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey]!.push(record);

    return groups;
  }, {} as Record<string, RunningRecord[]>);
};

/**
 * 차트 데이터 생성 (로컬 계산용)
 */
export const generateChartData = (records: RunningRecord[], period: Period): ChartDataPoint[] => {
  const groupedData = groupRecordsByPeriod(records, period);

  return Object.entries(groupedData).map(([dateKey, periodRecords]) => {
    const stats = calculateStatistics(periodRecords);
    return {
      datetime: dateKey,
      distance: stats.totalDistance,
      durationSec: stats.totalDuration,
      calories: stats.totalCalories,
      paceSec: stats.totalDuration > 0 ? stats.totalDuration / stats.totalDistance : 0,
      speed: stats.averageSpeed,
    };
  }).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
};

/**
 * 개인 기록 계산
 */
export const calculatePersonalRecords = (records: RunningRecord[]): PersonalRecords => {
  const emptyRecords: PersonalRecords = {
    longestDistance: { record: null, value: 0, date: '' },
    longestDuration: { record: null, value: 0, date: '' },
    fastestPace: { record: null, value: 0, date: '' },
    mostCalories: { record: null, value: 0, date: '' },
    mostRuns: { period: '', count: 0, date: '' },
  };

  if (records.length === 0) return emptyRecords;

  // 최장 거리
  const longestDistanceRecord = records.reduce((max, record) =>
    record.distance > max.distance ? record : max
  );

  // 최장 시간
  const longestDurationRecord = records.reduce((max, record) =>
    record.durationSec > max.durationSec ? record : max
  );

  // 최고 페이스 (가장 빠른)
  const validPaceRecords = records.filter(r => r.distance > 0 && r.durationSec > 0);
  const fastestPaceRecord = validPaceRecords.length > 0
    ? validPaceRecords.reduce((fastest, record) => {
        const recordPace = calculatePace(record.distance, record.durationSec);
        const fastestPace = calculatePace(fastest.distance, fastest.durationSec);
        return recordPace < fastestPace ? record : fastest;
      })
    : null;

  // 최다 칼로리
  const mostCaloriesRecord = records.reduce((max, record) =>
    record.calorie > max.calorie ? record : max
  );

  // 월별 러닝 횟수로 최다 러닝 월 찾기
  const monthlyRunCounts = records.reduce((counts, record) => {
    const date = new Date(record.startTimestamp * 1000);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    counts[monthKey] = (counts[monthKey] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const mostRunsMonth = Object.entries(monthlyRunCounts).reduce(
    (max, [month, count]) => count > max.count ? { period: month, count, date: month } : max,
    { period: '', count: 0, date: '' }
  );

  return {
    longestDistance: {
      record: longestDistanceRecord,
      value: longestDistanceRecord.distance,
      date: new Date(longestDistanceRecord.startTimestamp * 1000).toISOString(),
    },
    longestDuration: {
      record: longestDurationRecord,
      value: longestDurationRecord.durationSec,
      date: new Date(longestDurationRecord.startTimestamp * 1000).toISOString(),
    },
    fastestPace: {
      record: fastestPaceRecord ?? null,
      value: fastestPaceRecord ? calculatePace(fastestPaceRecord.distance, fastestPaceRecord.durationSec) : 0,
      date: fastestPaceRecord ? new Date(fastestPaceRecord.startTimestamp * 1000).toISOString() : '',
    },
    mostCalories: {
      record: mostCaloriesRecord,
      value: mostCaloriesRecord.calorie,
      date: new Date(mostCaloriesRecord.startTimestamp * 1000).toISOString(),
    },
    mostRuns: mostRunsMonth,
  };
};

/**
 * 통계 트렌드 분석
 */
export const calculateTrends = (
  currentPeriodRecords: RunningRecord[],
  previousPeriodRecords: RunningRecord[]
): {
  distanceTrend: number;
  durationTrend: number;
  paceTrend: number;
  caloriesTrend: number;
  runCountTrend: number;
} => {
  const currentStats = calculateStatistics(currentPeriodRecords);
  const previousStats = calculateStatistics(previousPeriodRecords);

  const calculateTrendPercentage = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    distanceTrend: calculateTrendPercentage(currentStats.totalDistance, previousStats.totalDistance),
    durationTrend: calculateTrendPercentage(currentStats.totalDuration, previousStats.totalDuration),
    paceTrend: calculateTrendPercentage(currentStats.averagePace, previousStats.averagePace),
    caloriesTrend: calculateTrendPercentage(currentStats.totalCalories, previousStats.totalCalories),
    runCountTrend: calculateTrendPercentage(currentStats.runCount, previousStats.runCount),
  };
};

/**
 * 목표 대비 진행률 계산
 */
export const calculateGoalProgress = (
  records: RunningRecord[],
  goals: {
    weeklyDistance?: number;
    monthlyDistance?: number;
    yearlyDistance?: number;
    weeklyRuns?: number;
    monthlyRuns?: number;
  }
): {
  weeklyDistanceProgress: number;
  monthlyDistanceProgress: number;
  yearlyDistanceProgress: number;
  weeklyRunsProgress: number;
  monthlyRunsProgress: number;
} => {
  const now = new Date();
  const weekRecords = filterRecordsByPeriod(records, 'WEEKLY' as Period, now);
  const monthRecords = filterRecordsByPeriod(records, 'MONTHLY' as Period, now);
  const yearRecords = filterRecordsByPeriod(records, 'YEARLY' as Period, now);

  const weekStats = calculateStatistics(weekRecords);
  const monthStats = calculateStatistics(monthRecords);
  const yearStats = calculateStatistics(yearRecords);

  return {
    weeklyDistanceProgress: goals.weeklyDistance ? (weekStats.totalDistance / goals.weeklyDistance) * 100 : 0,
    monthlyDistanceProgress: goals.monthlyDistance ? (monthStats.totalDistance / goals.monthlyDistance) * 100 : 0,
    yearlyDistanceProgress: goals.yearlyDistance ? (yearStats.totalDistance / goals.yearlyDistance) * 100 : 0,
    weeklyRunsProgress: goals.weeklyRuns ? (weekStats.runCount / goals.weeklyRuns) * 100 : 0,
    monthlyRunsProgress: goals.monthlyRuns ? (monthStats.runCount / goals.monthlyRuns) * 100 : 0,
  };
};
