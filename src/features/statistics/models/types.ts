/**
 * Statistics Types
 * 통계 관련 타입 정의
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
 * 기간 이동 방향 enum
 */
export enum PeriodDirection {
  PREVIOUS = -1,
  NEXT = 1,
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
