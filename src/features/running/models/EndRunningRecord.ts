/**
 * 완료된 러닝 기록 모델
 * Swift EndRunningRecord.swift에서 마이그레이션
 */
export interface EndRunningRecord {
  id: number;
  shoeId?: number;
  distance: number;
  cadence: number;
  heartRate: number;
  calorie: number;
  durationSec: number; // TimeInterval (seconds)
  point: number; // 획득한 포인트
}
