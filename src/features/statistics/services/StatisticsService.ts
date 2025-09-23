/**
 * Statistics Service
 * Swift RunningChartService 비즈니스 로직을 TypeScript로 마이그레이션
 */

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
  groupRecordsByPeriod,
  getStartOfWeek,
  getStartOfMonth,
  getStartOfYear,
  formatDate,
} from '../models';
import { RunningRecord } from '../../running/models';

export class StatisticsService {
  private static instance: StatisticsService;

  private constructor() {}

  static getInstance(): StatisticsService {
    if (!StatisticsService.instance) {
      StatisticsService.instance = new StatisticsService();
    }
    return StatisticsService.instance;
  }

  /**
   * 러닝 일관성 점수 계산
   * Swift calculateConsistency 메서드 대응
   */
  calculateConsistencyScore(records: RunningRecord[]): {
    consistencyScore: number;
    weeklyVariance: number;
    longestStreak: number;
    currentStreak: number;
    averageGapDays: number;
    recommendations: string[];
  } {
    if (records.length < 2) {
      return {
        consistencyScore: 0,
        weeklyVariance: 0,
        longestStreak: 0,
        currentStreak: 0,
        averageGapDays: 0,
        recommendations: ['더 많은 러닝 기록이 필요합니다.'],
      };
    }

    // 날짜별로 정렬
    const sortedRecords = [...records].sort((a, b) => a.startTimestamp - b.startTimestamp);

    // 주별 러닝 횟수 계산
    const weeklyRuns = this.calculateWeeklyRunCounts(sortedRecords);
    const weeklyVariance = this.calculateVariance(weeklyRuns);

    // 스트릭 계산
    const { longestStreak, currentStreak } = this.calculateRunningStreaks(sortedRecords);

    // 평균 간격 계산
    const averageGapDays = this.calculateAverageGapDays(sortedRecords);

    // 일관성 점수 계산 (0-100)
    const streakScore = Math.min(longestStreak * 5, 30); // 최대 30점
    const varianceScore = Math.max(30 - weeklyVariance * 5, 0); // 최대 30점
    const gapScore = Math.max(40 - averageGapDays * 5, 0); // 최대 40점
    const consistencyScore = streakScore + varianceScore + gapScore;

    // 추천사항 생성
    const recommendations = this.generateConsistencyRecommendations(
      consistencyScore,
      averageGapDays,
      currentStreak,
      weeklyVariance
    );

    return {
      consistencyScore: Math.round(consistencyScore),
      weeklyVariance: Math.round(weeklyVariance * 100) / 100,
      longestStreak,
      currentStreak,
      averageGapDays: Math.round(averageGapDays * 100) / 100,
      recommendations,
    };
  }

  /**
   * 시간대별 러닝 패턴 분석
   * Swift analyzeTimePatterns 메서드 대응
   */
  analyzeTimePatterns(records: RunningRecord[]): {
    hourlyDistribution: { hour: number; count: number; avgDistance: number }[];
    preferredTimeSlot: string;
    weekdayPattern: { day: string; count: number; avgDistance: number }[];
    recommendations: string[];
  } {
    if (records.length === 0) {
      return {
        hourlyDistribution: [],
        preferredTimeSlot: '데이터 없음',
        weekdayPattern: [],
        recommendations: ['러닝 기록이 없습니다.'],
      };
    }

    // 시간대별 분석
    const hourlyData = new Map<number, { count: number; totalDistance: number }>();
    for (let hour = 0; hour < 24; hour++) {
      hourlyData.set(hour, { count: 0, totalDistance: 0 });
    }

    // 요일별 분석
    const weekdayData = new Map<string, { count: number; totalDistance: number }>();
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    dayNames.forEach(day => {
      weekdayData.set(day, { count: 0, totalDistance: 0 });
    });

    // 데이터 집계
    records.forEach(record => {
      const date = new Date(record.startTimestamp * 1000);
      const hour = date.getHours();
      const dayName = dayNames[date.getDay()];

      // 시간대별 집계
      const hourData = hourlyData.get(hour)!;
      hourData.count++;
      hourData.totalDistance += record.distance;

      // 요일별 집계
      const dayData = weekdayData.get(dayName)!;
      dayData.count++;
      dayData.totalDistance += record.distance;
    });

    // 시간대별 분포 생성
    const hourlyDistribution = Array.from(hourlyData.entries()).map(([hour, data]) => ({
      hour,
      count: data.count,
      avgDistance: data.count > 0 ? data.totalDistance / data.count : 0,
    }));

    // 가장 선호하는 시간대 찾기
    const mostActiveHour = hourlyDistribution.reduce((max, current) =>
      current.count > max.count ? current : max
    );

    const preferredTimeSlot = this.getTimeSlotName(mostActiveHour.hour);

    // 요일별 분포 생성
    const weekdayPattern = Array.from(weekdayData.entries()).map(([day, data]) => ({
      day,
      count: data.count,
      avgDistance: data.count > 0 ? data.totalDistance / data.count : 0,
    }));

    // 추천사항 생성
    const recommendations = this.generateTimePatternRecommendations(
      hourlyDistribution,
      weekdayPattern,
      mostActiveHour.hour
    );

    return {
      hourlyDistribution,
      preferredTimeSlot,
      weekdayPattern,
      recommendations,
    };
  }

  /**
   * 성과 개선 분석
   * Swift analyzePerformanceImprovement 메서드 대응
   */
  analyzePerformanceImprovement(records: RunningRecord[]): {
    overallImprovement: number;
    distanceImprovement: number;
    paceImprovement: number;
    consistencyImprovement: number;
    strongPoints: string[];
    improvementAreas: string[];
    nextGoals: string[];
  } {
    if (records.length < 4) {
      return {
        overallImprovement: 0,
        distanceImprovement: 0,
        paceImprovement: 0,
        consistencyImprovement: 0,
        strongPoints: [],
        improvementAreas: ['더 많은 러닝 기록이 필요합니다.'],
        nextGoals: ['주 2-3회 정기적인 러닝을 시작해보세요.'],
      };
    }

    const sortedRecords = [...records].sort((a, b) => a.startTimestamp - b.startTimestamp);
    const totalRecords = sortedRecords.length;
    const midPoint = Math.floor(totalRecords / 2);

    const earlierRecords = sortedRecords.slice(0, midPoint);
    const laterRecords = sortedRecords.slice(midPoint);

    const earlierStats = calculateStatistics(earlierRecords);
    const laterStats = calculateStatistics(laterRecords);

    // 개선도 계산
    const distanceImprovement = this.calculateImprovementPercentage(
      earlierStats.averageDistance,
      laterStats.averageDistance
    );

    const paceImprovement = this.calculateImprovementPercentage(
      earlierStats.averagePace,
      laterStats.averagePace,
      true // 페이스는 낮을수록 좋음
    );

    // 일관성 개선도 (러닝 빈도 기준)
    const earlierFrequency = this.calculateRunningFrequency(earlierRecords);
    const laterFrequency = this.calculateRunningFrequency(laterRecords);
    const consistencyImprovement = this.calculateImprovementPercentage(
      earlierFrequency,
      laterFrequency
    );

    const overallImprovement = (distanceImprovement + paceImprovement + consistencyImprovement) / 3;

    // 강점과 개선 영역 분석
    const { strongPoints, improvementAreas } = this.analyzeStrengthsAndWeaknesses(
      distanceImprovement,
      paceImprovement,
      consistencyImprovement,
      laterStats
    );

    // 다음 목표 제안
    const nextGoals = this.suggestNextGoals(laterStats, overallImprovement);

    return {
      overallImprovement: Math.round(overallImprovement),
      distanceImprovement: Math.round(distanceImprovement),
      paceImprovement: Math.round(paceImprovement),
      consistencyImprovement: Math.round(consistencyImprovement),
      strongPoints,
      improvementAreas,
      nextGoals,
    };
  }

  /**
   * 러닝 효율성 분석
   * Swift analyzeRunningEfficiency 메서드 대응
   */
  analyzeRunningEfficiency(records: RunningRecord[]): {
    efficiencyScore: number;
    paceConsistency: number;
    energyEfficiency: number;
    distanceProgression: number;
    recommendations: string[];
    benchmarks: {
      paceTarget: number;
      distanceTarget: number;
      calorieEfficiency: number;
    };
  } {
    if (records.length === 0) {
      return {
        efficiencyScore: 0,
        paceConsistency: 0,
        energyEfficiency: 0,
        distanceProgression: 0,
        recommendations: ['러닝 기록이 없습니다.'],
        benchmarks: { paceTarget: 0, distanceTarget: 0, calorieEfficiency: 0 },
      };
    }

    const stats = calculateStatistics(records);

    // 페이스 일관성 (변동성이 낮을수록 좋음)
    const paces = records
      .filter(r => r.distance > 0 && r.durationSec > 0)
      .map(r => (r.durationSec / 60) / (r.distance / 1000));
    const paceConsistency = this.calculateConsistencyScoreFromValues(paces);

    // 에너지 효율성 (칼로리 대비 거리)
    const energyEfficiency = stats.totalDistance > 0 ? stats.totalDistance / stats.totalCalories : 0;

    // 거리 진행도 (시간에 따른 거리 증가)
    const distanceProgression = this.calculateProgressionScore(records);

    // 전체 효율성 점수
    const efficiencyScore = (paceConsistency + energyEfficiency * 10 + distanceProgression) / 3;

    // 벤치마크 설정
    const benchmarks = {
      paceTarget: this.calculateOptimalPace(stats.averagePace),
      distanceTarget: this.calculateOptimalDistance(stats.averageDistance),
      calorieEfficiency: energyEfficiency * 1.1, // 10% 개선 목표
    };

    // 추천사항
    const recommendations = this.generateEfficiencyRecommendations(
      paceConsistency,
      energyEfficiency,
      distanceProgression,
      stats
    );

    return {
      efficiencyScore: Math.round(efficiencyScore),
      paceConsistency: Math.round(paceConsistency),
      energyEfficiency: Math.round(energyEfficiency * 100) / 100,
      distanceProgression: Math.round(distanceProgression),
      recommendations,
      benchmarks,
    };
  }

  // Private helper methods

  private calculateWeeklyRunCounts(records: RunningRecord[]): number[] {
    const weeklyRuns = new Map<string, number>();

    records.forEach(record => {
      const date = new Date(record.startTimestamp * 1000);
      const weekStart = getStartOfWeek(date);
      const weekKey = formatDate(weekStart, 'YYYY-MM-DD');

      weeklyRuns.set(weekKey, (weeklyRuns.get(weekKey) || 0) + 1);
    });

    return Array.from(weeklyRuns.values());
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;

    return Math.sqrt(variance);
  }

  private calculateRunningStreaks(records: RunningRecord[]): { longestStreak: number; currentStreak: number } {
    if (records.length === 0) return { longestStreak: 0, currentStreak: 0 };

    const dates = records.map(r => new Date(r.startTimestamp * 1000).toDateString());
    const uniqueDates = [...new Set(dates)].sort();

    let longestStreak = 1;
    let currentStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const dayDifference = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (dayDifference <= 7) { // 주 단위 스트릭
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    // 현재 스트릭 계산 (최근 7일 이내)
    const now = new Date();
    const lastRunDate = new Date(uniqueDates[uniqueDates.length - 1]);
    const daysSinceLastRun = (now.getTime() - lastRunDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastRun <= 7) {
      // 역순으로 현재 스트릭 계산
      currentStreak = 1;
      for (let i = uniqueDates.length - 2; i >= 0; i--) {
        const currDate = new Date(uniqueDates[i + 1]);
        const prevDate = new Date(uniqueDates[i]);
        const dayDifference = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        if (dayDifference <= 7) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else {
      currentStreak = 0;
    }

    return { longestStreak, currentStreak };
  }

  private calculateAverageGapDays(records: RunningRecord[]): number {
    if (records.length < 2) return 0;

    const dates = records.map(r => new Date(r.startTimestamp * 1000));
    const uniqueDates = [...new Set(dates.map(d => d.toDateString()))].sort();

    if (uniqueDates.length < 2) return 0;

    let totalGap = 0;
    for (let i = 1; i < uniqueDates.length; i++) {
      const gap = (new Date(uniqueDates[i]).getTime() - new Date(uniqueDates[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
      totalGap += gap;
    }

    return totalGap / (uniqueDates.length - 1);
  }

  private generateConsistencyRecommendations(
    score: number,
    avgGap: number,
    currentStreak: number,
    variance: number
  ): string[] {
    const recommendations: string[] = [];

    if (score < 30) {
      recommendations.push('러닝 일관성을 높이기 위해 정기적인 스케줄을 만들어보세요.');
    }

    if (avgGap > 7) {
      recommendations.push('러닝 간격이 너무 깁니다. 주 2-3회 러닝을 목표로 해보세요.');
    }

    if (currentStreak === 0) {
      recommendations.push('러닝 습관을 다시 시작해보세요. 작은 목표부터 시작하는 것이 좋습니다.');
    }

    if (variance > 2) {
      recommendations.push('주별 러닝 횟수의 변동이 큽니다. 더 일정한 패턴을 유지해보세요.');
    }

    if (score >= 70) {
      recommendations.push('훌륭한 일관성을 보이고 있습니다! 현재 패턴을 유지하세요.');
    }

    return recommendations;
  }

  private getTimeSlotName(hour: number): string {
    if (hour >= 5 && hour < 9) return '새벽 (5-9시)';
    if (hour >= 9 && hour < 12) return '오전 (9-12시)';
    if (hour >= 12 && hour < 15) return '점심 (12-15시)';
    if (hour >= 15 && hour < 18) return '오후 (15-18시)';
    if (hour >= 18 && hour < 21) return '저녁 (18-21시)';
    return '밤 (21-5시)';
  }

  private generateTimePatternRecommendations(
    hourlyDistribution: { hour: number; count: number; avgDistance: number }[],
    weekdayPattern: { day: string; count: number; avgDistance: number }[],
    mostActiveHour: number
  ): string[] {
    const recommendations: string[] = [];

    // 시간대 기반 추천
    if (mostActiveHour >= 5 && mostActiveHour < 9) {
      recommendations.push('새벽 러닝을 선호하시네요! 일정한 수면 패턴을 유지하는 것이 중요합니다.');
    } else if (mostActiveHour >= 18 && mostActiveHour < 21) {
      recommendations.push('저녁 러닝을 선호하시네요! 러닝 후 충분한 쿨다운 시간을 가지세요.');
    }

    // 요일 패턴 기반 추천
    const weekendRuns = weekdayPattern.filter(p => p.day === '토요일' || p.day === '일요일')
      .reduce((sum, p) => sum + p.count, 0);
    const weekdayRuns = weekdayPattern.filter(p => p.day !== '토요일' && p.day !== '일요일')
      .reduce((sum, p) => sum + p.count, 0);

    if (weekendRuns > weekdayRuns * 0.5) {
      recommendations.push('주말에 러닝을 많이 하시네요! 평일에도 짧은 러닝을 추가해보세요.');
    }

    return recommendations;
  }

  private calculateImprovementPercentage(before: number, after: number, lowerIsBetter: boolean = false): number {
    if (before === 0) return after > 0 ? 100 : 0;

    const improvement = lowerIsBetter ?
      ((before - after) / before) * 100 :
      ((after - before) / before) * 100;

    return improvement;
  }

  private calculateRunningFrequency(records: RunningRecord[]): number {
    if (records.length < 2) return 0;

    const firstRun = Math.min(...records.map(r => r.startTimestamp));
    const lastRun = Math.max(...records.map(r => r.startTimestamp));
    const daysSpan = (lastRun - firstRun) / (24 * 60 * 60);

    return daysSpan > 0 ? records.length / (daysSpan / 7) : 0; // 주당 러닝 횟수
  }

  private analyzeStrengthsAndWeaknesses(
    distanceImprovement: number,
    paceImprovement: number,
    consistencyImprovement: number,
    currentStats: StatisticsSummary
  ): { strongPoints: string[]; improvementAreas: string[] } {
    const strongPoints: string[] = [];
    const improvementAreas: string[] = [];

    if (distanceImprovement > 10) strongPoints.push('거리 향상이 뛰어납니다');
    else if (distanceImprovement < -5) improvementAreas.push('거리 개선이 필요합니다');

    if (paceImprovement > 10) strongPoints.push('페이스 개선이 우수합니다');
    else if (paceImprovement < -5) improvementAreas.push('페이스 향상이 필요합니다');

    if (consistencyImprovement > 10) strongPoints.push('러닝 일관성이 향상되었습니다');
    else if (consistencyImprovement < -5) improvementAreas.push('규칙적인 러닝이 필요합니다');

    return { strongPoints, improvementAreas };
  }

  private suggestNextGoals(stats: StatisticsSummary, improvement: number): string[] {
    const goals: string[] = [];

    if (improvement > 20) {
      goals.push('현재 페이스를 유지하면서 거리를 10% 늘려보세요');
      goals.push('하프마라톤에 도전해보세요');
    } else if (improvement > 0) {
      goals.push('주간 목표 거리를 설정해보세요');
      goals.push('페이스 향상에 집중해보세요');
    } else {
      goals.push('규칙적인 러닝 습관을 만들어보세요');
      goals.push('짧은 거리부터 시작해보세요');
    }

    return goals;
  }

  private calculateConsistencyScoreFromValues(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const coefficient = Math.sqrt(variance) / mean;

    return Math.max(0, 100 - coefficient * 100);
  }

  private calculateProgressionScore(records: RunningRecord[]): number {
    if (records.length < 3) return 0;

    const sortedRecords = [...records].sort((a, b) => a.startTimestamp - b.startTimestamp);
    const distances = sortedRecords.map(r => r.distance);

    // 선형 회귀를 사용한 트렌드 계산
    const n = distances.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = distances;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return Math.max(0, Math.min(100, slope * 10));
  }

  private calculateOptimalPace(currentPace: number): number {
    // 현재 페이스에서 5% 개선 목표
    return currentPace * 0.95;
  }

  private calculateOptimalDistance(currentDistance: number): number {
    // 현재 거리에서 10% 증가 목표
    return currentDistance * 1.1;
  }

  private generateEfficiencyRecommendations(
    paceConsistency: number,
    energyEfficiency: number,
    distanceProgression: number,
    stats: StatisticsSummary
  ): string[] {
    const recommendations: string[] = [];

    if (paceConsistency < 50) {
      recommendations.push('페이스 일관성을 높이기 위해 정해진 페이스로 러닝해보세요');
    }

    if (energyEfficiency < 0.1) {
      recommendations.push('칼로리 효율성을 높이기 위해 인터벌 트레이닝을 시도해보세요');
    }

    if (distanceProgression < 30) {
      recommendations.push('점진적으로 거리를 늘려 체력 향상을 도모하세요');
    }

    if (stats.averagePace > 8) {
      recommendations.push('페이스 개선을 위해 템포 러닝을 추가해보세요');
    }

    return recommendations;
  }
}

// Singleton export
export const statisticsService = StatisticsService.getInstance();