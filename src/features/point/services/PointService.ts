/**
 * Point Service
 * Swift PointApiService 비즈니스 로직을 TypeScript로 마이그레이션
 */

import {
  PointHistory,
  PointHistoryViewModel,
  PointFilter,
  createPointHistoryViewModel,
  filterPointHistories,
  calculatePointStatistics,
  formatPoints,
  formatPointChange,
  getThreeMonthsAgo,
} from '../models';

export class PointService {
  private static instance: PointService;

  private constructor() {}

  static getInstance(): PointService {
    if (!PointService.instance) {
      PointService.instance = new PointService();
    }
    return PointService.instance;
  }

  /**
   * 러닝 거리 및 시간 기반 포인트 계산
   * Swift calculateRunningReward 메서드 대응
   */
  calculateRunningReward(distanceInMeters: number, durationInSeconds: number): number {
    // 기본 거리 포인트 (1km당 10포인트)
    const kmDistance = distanceInMeters / 1000;
    const distancePoints = Math.floor(kmDistance * 10);

    // 시간 보너스 (30분 이상 러닝 시 보너스)
    const timeBonus = durationInSeconds >= 1800 ? 20 : 0;

    // 속도 보너스 (평균 속도가 5km/h 이상일 때)
    const avgSpeedKmh = (distanceInMeters / 1000) / (durationInSeconds / 3600);
    const speedBonus = avgSpeedKmh >= 5 ? 10 : 0;

    // 최소 포인트 보장
    const totalPoints = distancePoints + timeBonus + speedBonus;
    return Math.max(totalPoints, 5);
  }

  /**
   * 연속 일수 기반 일일 보너스 계산
   * Swift calculateDailyBonus 메서드 대응
   */
  calculateDailyBonus(consecutiveDays: number): number {
    if (consecutiveDays <= 0) return 0;

    // 연속 일수별 보너스 점수
    if (consecutiveDays >= 30) return 100; // 30일 연속
    if (consecutiveDays >= 14) return 50;  // 14일 연속
    if (consecutiveDays >= 7) return 30;   // 7일 연속
    if (consecutiveDays >= 3) return 20;   // 3일 연속

    return 10; // 기본 일일 보너스
  }

  /**
   * 포인트 히스토리 하이브리드 필터링
   * Swift PointViewModel의 하이브리드 로직 대응
   */
  processHybridHistories(
    recentHistories: PointHistoryViewModel[],
    olderHistories: PointHistoryViewModel[],
    filter: PointFilter
  ): PointHistoryViewModel[] {
    // 최근 3개월 데이터는 로컬에서 필터링
    const filteredRecent = filterPointHistories(recentHistories, filter);

    // 3개월 이전 데이터는 서버에서 이미 필터링됨
    return [...filteredRecent, ...olderHistories];
  }

  /**
   * 포인트 히스토리 유효성 검증
   * Swift validatePointHistory 메서드 대응
   */
  validatePointHistory(history: PointHistory): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!history.id || history.id <= 0) {
      errors.push('잘못된 히스토리 ID입니다.');
    }

    if (history.point === 0) {
      errors.push('포인트 변화량이 0입니다.');
    }

    if (!history.pointType || history.pointType.trim().length === 0) {
      errors.push('포인트 타입이 없습니다.');
    }

    if (!history.createdTimestamp || history.createdTimestamp <= 0) {
      errors.push('생성 시간이 잘못되었습니다.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 포인트 사용 가능 여부 확인
   * Swift canSpendPoints 메서드 대응
   */
  canSpendPoints(currentPoints: number, requiredPoints: number): {
    canSpend: boolean;
    shortfall: number;
    message: string;
  } {
    const canSpend = currentPoints >= requiredPoints;
    const shortfall = canSpend ? 0 : requiredPoints - currentPoints;

    let message: string;
    if (canSpend) {
      message = '포인트 사용이 가능합니다.';
    } else {
      message = `포인트가 ${formatPoints(shortfall)} 부족합니다.`;
    }

    return {
      canSpend,
      shortfall,
      message,
    };
  }

  /**
   * 포인트 히스토리 요약 생성
   * Swift generateHistorySummary 메서드 대응
   */
  generateHistorySummary(histories: PointHistoryViewModel[]): {
    totalTransactions: number;
    totalEarned: number;
    totalSpent: number;
    netChange: number;
    averageTransaction: number;
    mostCommonType: string;
    largestTransaction: PointHistoryViewModel | null;
  } {
    if (histories.length === 0) {
      return {
        totalTransactions: 0,
        totalEarned: 0,
        totalSpent: 0,
        netChange: 0,
        averageTransaction: 0,
        mostCommonType: '',
        largestTransaction: null,
      };
    }

    const earned = histories.filter(h => h.isPositive);
    const spent = histories.filter(h => !h.isPositive);

    const totalEarned = earned.reduce((sum, h) => sum + h.point, 0);
    const totalSpent = spent.reduce((sum, h) => sum + h.point, 0);
    const netChange = totalEarned - totalSpent;

    // 가장 많이 발생한 포인트 타입
    const typeCount = histories.reduce((acc, h) => {
      acc[h.title] = (acc[h.title] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonType = Object.entries(typeCount).reduce((a, b) =>
      typeCount[a[0]] > typeCount[b[0]] ? a : b
    )[0] || '';

    // 가장 큰 거래
    const largestTransaction = histories.reduce((max, h) =>
      h.point > max.point ? h : max
    , histories[0]);

    return {
      totalTransactions: histories.length,
      totalEarned,
      totalSpent,
      netChange,
      averageTransaction: Math.round((totalEarned + totalSpent) / histories.length),
      mostCommonType,
      largestTransaction,
    };
  }

  /**
   * 포인트 목표 달성도 계산
   * Swift calculateGoalProgress 메서드 대응
   */
  calculateGoalProgress(
    currentPoints: number,
    targetPoints: number,
    histories: PointHistoryViewModel[]
  ): {
    progress: number;
    remaining: number;
    isAchieved: boolean;
    estimatedDaysToGoal: number;
    recommendation: string;
  } {
    const progress = Math.min((currentPoints / targetPoints) * 100, 100);
    const remaining = Math.max(targetPoints - currentPoints, 0);
    const isAchieved = currentPoints >= targetPoints;

    // 최근 7일간의 일평균 적립량 계산
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentEarned = histories
      .filter(h => h.isPositive && h.date >= oneWeekAgo)
      .reduce((sum, h) => sum + h.point, 0);

    const dailyAverage = recentEarned / 7;
    const estimatedDaysToGoal = dailyAverage > 0 ? Math.ceil(remaining / dailyAverage) : -1;

    let recommendation: string;
    if (isAchieved) {
      recommendation = '목표를 달성했습니다! 새로운 목표를 설정해보세요.';
    } else if (dailyAverage === 0) {
      recommendation = '러닝을 시작해서 포인트를 적립해보세요!';
    } else if (estimatedDaysToGoal <= 7) {
      recommendation = '목표 달성이 임박했습니다! 조금만 더 화이팅!';
    } else if (estimatedDaysToGoal <= 30) {
      recommendation = '꾸준히 러닝하시면 곧 목표를 달성할 수 있습니다.';
    } else {
      recommendation = '더 자주 러닝하시면 목표 달성 시간을 단축할 수 있습니다.';
    }

    return {
      progress: Math.round(progress * 100) / 100,
      remaining,
      isAchieved,
      estimatedDaysToGoal,
      recommendation,
    };
  }

  /**
   * 포인트 랭킹 계산
   * Swift calculateRanking 메서드 대응
   */
  calculateRanking(userPoints: number, allUserPoints: number[]): {
    rank: number;
    percentile: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
    nextTierThreshold: number;
    isTopTier: boolean;
  } {
    const sortedPoints = [...allUserPoints].sort((a, b) => b - a);
    const rank = sortedPoints.indexOf(userPoints) + 1;
    const percentile = Math.round((1 - (rank - 1) / sortedPoints.length) * 100);

    // 티어 계산
    let tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
    let nextTierThreshold: number;

    if (percentile >= 90) {
      tier = 'Diamond';
      nextTierThreshold = -1; // 최고 티어
    } else if (percentile >= 75) {
      tier = 'Platinum';
      nextTierThreshold = sortedPoints[Math.floor(sortedPoints.length * 0.1)];
    } else if (percentile >= 50) {
      tier = 'Gold';
      nextTierThreshold = sortedPoints[Math.floor(sortedPoints.length * 0.25)];
    } else if (percentile >= 25) {
      tier = 'Silver';
      nextTierThreshold = sortedPoints[Math.floor(sortedPoints.length * 0.5)];
    } else {
      tier = 'Bronze';
      nextTierThreshold = sortedPoints[Math.floor(sortedPoints.length * 0.75)];
    }

    return {
      rank,
      percentile,
      tier,
      nextTierThreshold,
      isTopTier: percentile >= 90,
    };
  }

  /**
   * 포인트 예측 분석
   * Swift predictPointTrend 메서드 대응
   */
  predictPointTrend(histories: PointHistoryViewModel[], days: number = 30): {
    predictedPoints: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
    dailyAverage: number;
  } {
    if (histories.length < 7) {
      return {
        predictedPoints: 0,
        trend: 'stable',
        confidence: 0,
        dailyAverage: 0,
      };
    }

    // 최근 30일간 일별 포인트 변화 분석
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentHistories = histories.filter(h => h.date >= thirtyDaysAgo);

    // 일별 순 포인트 변화량 계산
    const dailyChanges = recentHistories.reduce((acc, h) => {
      const dateKey = h.date.toDateString();
      if (!acc[dateKey]) acc[dateKey] = 0;
      acc[dateKey] += h.isPositive ? h.point : -h.point;
      return acc;
    }, {} as Record<string, number>);

    const dailyValues = Object.values(dailyChanges);
    const dailyAverage = dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length;

    // 트렌드 분석 (최근 15일 vs 이전 15일)
    const sortedDates = Object.keys(dailyChanges).sort();
    const midPoint = Math.floor(sortedDates.length / 2);
    const firstHalf = sortedDates.slice(0, midPoint);
    const secondHalf = sortedDates.slice(midPoint);

    const firstHalfAvg = firstHalf.reduce((sum, date) => sum + dailyChanges[date], 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, date) => sum + dailyChanges[date], 0) / secondHalf.length;

    const trendDifference = secondHalfAvg - firstHalfAvg;
    let trend: 'increasing' | 'decreasing' | 'stable';

    if (Math.abs(trendDifference) < dailyAverage * 0.1) {
      trend = 'stable';
    } else if (trendDifference > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // 신뢰도 계산 (데이터 일관성 기반)
    const variance = dailyValues.reduce((sum, val) => sum + Math.pow(val - dailyAverage, 2), 0) / dailyValues.length;
    const standardDeviation = Math.sqrt(variance);
    const confidence = Math.max(0, Math.min(100, 100 - (standardDeviation / Math.abs(dailyAverage)) * 50));

    const predictedPoints = Math.round(dailyAverage * days);

    return {
      predictedPoints,
      trend,
      confidence: Math.round(confidence),
      dailyAverage: Math.round(dailyAverage),
    };
  }
}

// Singleton export
export const pointService = PointService.getInstance();