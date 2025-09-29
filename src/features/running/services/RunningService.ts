/**
 * Running Service
 * Swift RunningRecordService에서 비즈니스 로직 마이그레이션
 *
 * React Native에서는 주로 RTK Query를 통해 API 호출을 하므로
 * 이 서비스는 복잡한 러닝 관련 비즈니스 로직이나 유틸리티 함수들을 위해 사용
 */

import { RunningRecord, /* EndRunningRecord, */ Location, calculateTotalDistance } from '../models';

export class RunningService {
  private static instance: RunningService;

  private constructor() {}

  static getInstance(): RunningService {
    if (!RunningService.instance) {
      RunningService.instance = new RunningService();
    }
    return RunningService.instance;
  }

  /**
   * 러닝 목표 달성 여부 확인
   */
  isGoalAchieved(record: RunningRecord, goalDistance: number): boolean {
    return record.distance >= goalDistance;
  }

  /**
   * 러닝 효율성 계산 (칼로리/km)
   */
  calculateEfficiency(record: RunningRecord): number {
    if (record.distance === 0) return 0;
    const kmDistance = record.distance / 1000;
    return record.calorie / kmDistance;
  }

  /**
   * 러닝 강도 계산
   */
  calculateIntensity(record: RunningRecord): 'Low' | 'Moderate' | 'High' | 'Very High' {
    const avgSpeed = record.durationSec > 0 ? (record.distance / 1000) / (record.durationSec / 3600) : 0;

    if (avgSpeed < 6) return 'Low';
    if (avgSpeed < 9) return 'Moderate';
    if (avgSpeed < 12) return 'High';
    return 'Very High';
  }

  /**
   * 추천 휴식 시간 계산 (분)
   */
  calculateRecommendedRestTime(record: RunningRecord): number {
    const intensity = this.calculateIntensity(record);
    const durationMinutes = record.durationSec / 60;

    switch (intensity) {
      case 'Low':
        return Math.round(durationMinutes * 0.1);
      case 'Moderate':
        return Math.round(durationMinutes * 0.15);
      case 'High':
        return Math.round(durationMinutes * 0.2);
      case 'Very High':
        return Math.round(durationMinutes * 0.3);
    }
  }

  /**
   * 위치 데이터 유효성 검증
   */
  validateLocation(location: Location): boolean {
    // 위도 범위: -90 ~ 90
    if (location.latitude < -90 || location.latitude > 90) return false;

    // 경도 범위: -180 ~ 180
    if (location.longitude < -180 || location.longitude > 180) return false;

    // 속도가 너무 빠른 경우 (시속 50km 이상은 러닝이 아님)
    if (location.speed > 50) return false;

    return true;
  }

  /**
   * 러닝 경로 분석
   */
  analyzeRoute(locations: Location[]) {
    if (locations.length < 2) {
      return {
        totalDistance: 0,
        elevationGain: 0,
        elevationLoss: 0,
        maxSpeed: 0,
        minSpeed: 0,
        avgSpeed: 0,
      };
    }

    const totalDistance = calculateTotalDistance(locations);
    let elevationGain = 0;
    let elevationLoss = 0;
    let maxSpeed = 0;
    let minSpeed = Infinity;
    let totalSpeed = 0;

    for (let i = 1; i < locations.length; i++) {
      const current = locations[i];
      const previous = locations[i - 1];

      // 고도 변화 계산
      const elevationDiff = current.altitude - previous.altitude;
      if (elevationDiff > 0) {
        elevationGain += elevationDiff;
      } else {
        elevationLoss += Math.abs(elevationDiff);
      }

      // 속도 통계
      if (current.speed > maxSpeed) maxSpeed = current.speed;
      if (current.speed < minSpeed) minSpeed = current.speed;
      totalSpeed += current.speed;
    }

    return {
      totalDistance: Math.round(totalDistance),
      elevationGain: Math.round(elevationGain),
      elevationLoss: Math.round(elevationLoss),
      maxSpeed: Math.round(maxSpeed * 100) / 100,
      minSpeed: minSpeed === Infinity ? 0 : Math.round(minSpeed * 100) / 100,
      avgSpeed: Math.round((totalSpeed / locations.length) * 100) / 100,
    };
  }

  /**
   * 러닝 페이스 존 분석
   */
  analyzePaceZones(record: RunningRecord) {
    const avgPace = record.distance > 0 ? (record.durationSec / 60) / (record.distance / 1000) : 0;

    // 페이스 존 분류 (분/km 기준)
    if (avgPace < 4) return { zone: 'Elite', color: '#FF6B6B', description: '엘리트 수준' };
    if (avgPace < 5) return { zone: 'Fast', color: '#4ECDC4', description: '빠른 페이스' };
    if (avgPace < 6) return { zone: 'Moderate', color: '#45B7D1', description: '보통 페이스' };
    if (avgPace < 7) return { zone: 'Easy', color: '#96CEB4', description: '편안한 페이스' };
    return { zone: 'Recovery', color: '#FFEAA7', description: '회복 페이스' };
  }

  /**
   * 주간/월간 진행률 계산
   */
  calculateProgress(records: RunningRecord[], target: { distance: number; runs: number }) {
    const totalDistance = records.reduce((sum, record) => sum + record.distance, 0);
    const totalRuns = records.length;

    return {
      distanceProgress: Math.min((totalDistance / target.distance) * 100, 100),
      runsProgress: Math.min((totalRuns / target.runs) * 100, 100),
      distanceAchieved: totalDistance >= target.distance,
      runsAchieved: totalRuns >= target.runs,
    };
  }

  /**
   * 러닝 추천 시간대 분석
   */
  analyzeOptimalRunningTime(records: RunningRecord[]) {
    const timeSlots = {
      morning: 0,    // 06:00 - 12:00
      afternoon: 0,  // 12:00 - 18:00
      evening: 0,    // 18:00 - 24:00
      night: 0,      // 00:00 - 06:00
    };

    records.forEach(record => {
      const hour = new Date(record.startTimestamp * 1000).getHours();

      if (hour >= 6 && hour < 12) timeSlots.morning++;
      else if (hour >= 12 && hour < 18) timeSlots.afternoon++;
      else if (hour >= 18 && hour < 24) timeSlots.evening++;
      else timeSlots.night++;
    });

    const mostActiveTime = Object.entries(timeSlots).reduce((a, b) =>
      timeSlots[a[0] as keyof typeof timeSlots] > timeSlots[b[0] as keyof typeof timeSlots] ? a : b
    );

    return {
      timeSlots,
      recommendedTime: mostActiveTime[0],
      recommendation: getTimeRecommendation(mostActiveTime[0]),
    };
  }
}

/**
 * 시간대별 추천 메시지
 */
function getTimeRecommendation(timeSlot: string): string {
  switch (timeSlot) {
    case 'morning':
      return '아침 러닝은 하루를 활기차게 시작하는 좋은 방법입니다!';
    case 'afternoon':
      return '오후 러닝은 점심 후 에너지를 높이는데 효과적입니다!';
    case 'evening':
      return '저녁 러닝은 하루의 스트레스를 해소하는데 도움이 됩니다!';
    case 'night':
      return '밤 러닝은 조용한 환경에서 집중할 수 있어 좋습니다!';
    default:
      return '꾸준한 러닝이 가장 중요합니다!';
  }
}

// Singleton export
export const runningService = RunningService.getInstance();