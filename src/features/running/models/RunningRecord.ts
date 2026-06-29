import type { Shoe } from '~/features/shoes/models';

import { RunningStatusFormat } from '~/shared/utils/formatters';

export interface RunningRecord {
  id: number;
  shoeId?: number | null;
  connectedShoe?: Shoe | null;
  distance: number;
  steps: number | null;
  cadence: number | null; // null 허용 (센서 데이터 없을 때)
  heartRate: number | null; // null 허용 (센서 데이터 없을 때)
  calorie: number;
  durationSec: number; // TimeInterval (seconds)
  startTimestamp: number; // Unix timestamp
}

/**
 * 서버에서 받은 ID로 초기 RunningRecord 생성
 */
export const createRunningRecord = (id: number): RunningRecord => ({
  id,
  shoeId: null,
  connectedShoe: null,
  distance: 0,
  steps: null,
  cadence: null,
  heartRate: null,
  calorie: 0,
  durationSec: 0,
  startTimestamp: Date.now() / 1000, // Convert to seconds
});

/**
 * 완료된 러닝 기록 생성
 */
export const createCompletedRunningRecord = (data: {
  id: number;
  shoeId?: number | null;
  connectedShoe?: Shoe | null;
  distance: number;
  steps: number | null; // null 허용
  cadence: number | null; // null 허용
  heartRate: number | null; // null 허용
  calorie: number;
  durationSec: number;
  startTimestamp: number;
}): RunningRecord => ({
  id: data.id,
  shoeId: data.shoeId ?? null,
  connectedShoe: data.connectedShoe ?? null,
  distance: data.distance,
  steps: data.steps,
  cadence: data.cadence,
  heartRate: data.heartRate,
  calorie: data.calorie,
  durationSec: data.durationSec,
  startTimestamp: data.startTimestamp,
});

/**
 * 러닝 기록 업데이트
 */
export const updateRunningRecord = (
  record: RunningRecord,
  updates: Partial<Omit<RunningRecord, 'id'>>
): RunningRecord => ({
  ...record,
  ...updates,
});

/**
 * 평균 페이스 계산 (분/km)
 */
export const calculateAveragePace = (record: RunningRecord): number => {
  if (record.distance === 0) return 0;
  const kmDistance = record.distance / 1000;
  const minutesDuration = record.durationSec / 60;
  return minutesDuration / kmDistance;
};

/**
 * 평균 속도 계산 (km/h)
 */
export const calculateAverageSpeed = (record: RunningRecord): number => {
  if (record.durationSec === 0) return 0;
  const kmDistance = record.distance / 1000;
  const hoursDuration = record.durationSec / 3600;
  return kmDistance / hoursDuration;
};

/**
 * 러닝 기록 포맷팅
 * 정책: null인 센서 데이터는 "--"로 표시
 */
export const formatRunningRecord = (record: RunningRecord) => ({
  distance: RunningStatusFormat.distance(record.distance),
  duration: formatDuration(record.durationSec),
  pace: RunningStatusFormat.pace(calculateAveragePace(record)),
  speed: RunningStatusFormat.speedKmh(calculateAverageSpeed(record)),
  calories: RunningStatusFormat.calories(record.calorie),
  cadence: RunningStatusFormat.cadence(record.cadence),
  heartRate: RunningStatusFormat.heartRate(record.heartRate),
});

/**
 * 시간 포맷팅 (초 -> MM:SS 또는 H:MM:SS)
 */
export const formatDuration = (seconds: number): string => {
  return RunningStatusFormat.duration(seconds);
};
