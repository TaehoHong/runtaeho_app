/**
 * Statistics 모델
 */

import type { RunningRecord } from '../../running/models';

/**
 * 통계 기간 enum
 */
export enum Period {
  WEEK = 'WEEKLY',
  MONTH = 'MONTHLY',
  YEAR = 'YEARLY',
}

/**
 * 백엔드 차트 데이터 포인트
 * 백엔드 API Response의 chartData 배열 항목
 */
export interface RunningChartDto {
  datetime: string;      // 날짜 문자열 (예: "2024-01-01")
  paceSec: number;       // 페이스 (초/미터)
  distance: number;      // 거리 (미터)
  durationSec: number;   // 시간 (초)
}

/**
 * 통계 기본 정보 (백엔드 응답)
 * GET /api/v1/running/statistics API Response
 */
export interface StatisticsSummary {
  statisticType: Period;
  chartData: RunningChartDto[];  // 백엔드에서 제공하는 차트 데이터
  runningCount: number;
  totalDistance: number;         // 미터 단위
  totalDurationSec: number;      // 초 단위
  averageDistance: number;       // 미터 단위
  averagePaceSec: number;        // 초/미터 단위
}

/**
 * 확장된 통계 정보 (로컬 계산 포함)
 */
export interface ExtendedStatisticsSummary extends StatisticsSummary {
  runCount: number; // runningCount 별칭
  totalDuration: number; // totalDurationSec 별칭 (초)
  averageDuration: number; // 로컬 계산
  averagePace: number; // 분/km (averagePaceSec 변환)
  averageSpeed: number; // km/h (로컬 계산)
  totalCalories: number; // 로컬 계산
  averageCalories: number; // 로컬 계산
}

/**
 * 차트 데이터 포인트 (UI용, 백엔드 응답에 추가 필드 포함)
 */
export interface ChartDataPoint {
  datetime: string;      // 백엔드와 일치 (date -> datetime)
  distance: number;      // 미터 단위
  durationSec: number;   // 백엔드와 일치 (duration -> durationSec), 초 단위
  paceSec: number;       // 백엔드와 일치 (pace -> paceSec), 초/미터 단위
  speed: number;         // km/h (로컬 계산)
  calories: number;      // 칼로리 (로컬 계산)
}

/**
 * 로컬 통계 계산 결과 (백엔드 형식이 아님)
 */
export interface LocalStatistics {
  runCount: number;
  totalDistance: number;
  totalDuration: number;
  averageDistance: number;
  averageDuration: number;
  averagePace: number; // 분/km
  averageSpeed: number; // km/h
  totalCalories: number;
  averageCalories: number;
}

/**
 * 개인 기록 타입
 */
export interface PersonalRecords {
  longestDistance: { record: RunningRecord | null; value: number; date: string };
  longestDuration: { record: RunningRecord | null; value: number; date: string };
  fastestPace: { record: RunningRecord | null; value: number; date: string };
  mostCalories: { record: RunningRecord | null; value: number; date: string };
  mostRuns: { period: string; count: number; date: string };
}

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

  // 평균 페이스 계산 (분/km)
  const averagePace = averageDistance > 0 ? (averageDuration / 60) / (averageDistance / 1000) : 0;

  // 평균 속도 계산 (km/h)
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
export const filterRecordsByPeriod = (records: RunningRecord[], period: Period, referenceDate: Date = new Date()): RunningRecord[] => {
  const now = referenceDate;
  let startDate: Date;

  switch (period) {
    case Period.WEEK:
      startDate = getStartOfWeek(now);
      break;
    case Period.MONTH:
      startDate = getStartOfMonth(now);
      break;
    case Period.YEAR:
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
      paceSec: stats.totalDuration > 0 ? stats.totalDuration / stats.totalDistance : 0, // 초/미터
      speed: stats.averageSpeed,
    };
  }).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
};

/**
 * 기간별 레코드 그룹화
 */
export const groupRecordsByPeriod = (records: RunningRecord[], period: Period): Record<string, RunningRecord[]> => {
  return records.reduce((groups, record) => {
    const recordDate = new Date(record.startTimestamp * 1000);
    let groupKey: string;

    switch (period) {
      case Period.WEEK:
        const weekStart = getStartOfWeek(recordDate);
        groupKey = formatDate(weekStart, 'YYYY-MM-DD');
        break;
      case Period.MONTH:
        groupKey = formatDate(recordDate, 'YYYY-MM');
        break;
      case Period.YEAR:
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
 * 개인 기록 계산
 */
export const calculatePersonalRecords = (records: RunningRecord[]): PersonalRecords => {
  if (records.length === 0) {
    return {
      longestDistance: { record: null, value: 0, date: '' },
      longestDuration: { record: null, value: 0, date: '' },
      fastestPace: { record: null, value: 0, date: '' },
      mostCalories: { record: null, value: 0, date: '' },
      mostRuns: { period: '', count: 0, date: '' },
    };
  }

  // 최장 거리
  const longestDistanceRecord = records.reduce((max, record) =>
    record.distance > max.distance ? record : max
  );

  // 최장 시간
  const longestDurationRecord = records.reduce((max, record) =>
    record.durationSec > max.durationSec ? record : max
  );

  // 최고 페이스 (가장 빠른)
  const validPaceRecords = records.filter(record => record.distance > 0 && record.durationSec > 0);
  const fastestPaceRecord = validPaceRecords.length > 0
    ? validPaceRecords.reduce((fastest, record) => {
        const recordPace = (record.durationSec / 60) / (record.distance / 1000);
        const fastestPace = (fastest.durationSec / 60) / (fastest.distance / 1000);
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

  const mostRunsMonth = Object.entries(monthlyRunCounts).reduce((max, [month, count]) =>
    count > max.count ? { period: month, count, date: month } : max
  , { period: '', count: 0, date: '' });

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
      value: fastestPaceRecord ? (fastestPaceRecord.durationSec / 60) / (fastestPaceRecord.distance / 1000) : 0,
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
 * 날짜 헬퍼 함수들
 */
export const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

export const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const getStartOfYear = (date: Date): Date => {
  return new Date(date.getFullYear(), 0, 1);
};

export const formatDate = (date: Date, format: string): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYY-MM':
      return `${year}-${month}`;
    case 'YYYY':
      return `${year}`;
    default:
      return date.toISOString().split('T')[0] ?? '';
  }
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
  const weekRecords = filterRecordsByPeriod(records, Period.WEEK, now);
  const monthRecords = filterRecordsByPeriod(records, Period.MONTH, now);
  const yearRecords = filterRecordsByPeriod(records, Period.YEAR, now);

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