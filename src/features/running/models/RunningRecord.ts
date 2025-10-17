/**
 * 러닝 기록 모델
 * Swift RunningRecord.swift에서 마이그레이션
 */
export interface RunningRecord {
  id: number;
  shoeId?: number;
  distance: number;
  cadence: number;
  heartRate: number;
  calorie: number;
  durationSec: number; // TimeInterval (seconds)
  startTimestamp: number; // Unix timestamp
}

/**
 * 서버에서 받은 ID로 초기 RunningRecord 생성
 * Swift RunningRecord init(id:) 생성자와 동일
 */
export const createRunningRecord = (id: number): RunningRecord => ({
  id,
  distance: 0,
  cadence: 0,
  heartRate: 0,
  calorie: 0,
  durationSec: 0,
  startTimestamp: Date.now() / 1000, // Convert to seconds
});

/**
 * 완료된 러닝 기록 생성
 * Swift RunningRecord init(모든 필드) 생성자와 동일
 */
export const createCompletedRunningRecord = (data: {
  id: number;
  shoeId?: number;
  distance: number;
  cadence: number;
  heartRate: number;
  calorie: number;
  durationSec: number;
  startTimestamp: number;
}): RunningRecord => ({
  id: data.id,
  ...(data.shoeId !== undefined && { shoeId: data.shoeId }),
  distance: data.distance,
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
 */
export const formatRunningRecord = (record: RunningRecord) => ({
  distance: `${(record.distance / 1000).toFixed(2)} km`,
  duration: formatDuration(record.durationSec),
  pace: `${Math.floor(calculateAveragePace(record))}:${String(
    Math.floor((calculateAveragePace(record) % 1) * 60)
  ).padStart(2, '0')} /km`,
  speed: `${calculateAverageSpeed(record).toFixed(1)} km/h`,
  calories: `${record.calorie} kcal`,
  cadence: `${record.cadence} spm`,
  heartRate: `${record.heartRate} bpm`,
});

/**
 * 시간 포맷팅 (초 -> HH:MM:SS)
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
};