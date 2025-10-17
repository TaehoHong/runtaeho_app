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

/**
 * EndRunningRecord 생성
 * Swift EndRunningRecord init과 동일
 */
export const createEndRunningRecord = (data: {
  id: number;
  shoeId?: number;
  distance: number;
  cadence: number;
  heartRate: number;
  calorie: number;
  durationSec: number;
  point: number;
}): EndRunningRecord => ({
  id: data.id,
  ...(data.shoeId !== undefined && { shoeId: data.shoeId }),
  distance: data.distance,
  cadence: data.cadence,
  heartRate: data.heartRate,
  calorie: data.calorie,
  durationSec: data.durationSec,
  point: data.point,
});

/**
 * RunningRecord에서 EndRunningRecord 생성
 */
export const createEndRecordFromRunning = (
  runningRecord: {
    id: number;
    shoeId?: number;
    distance: number;
    cadence: number;
    heartRate: number;
    calorie: number;
    durationSec: number;
  },
  point: number
): EndRunningRecord => ({
  id: runningRecord.id,
  ...(runningRecord.shoeId !== undefined && { shoeId: runningRecord.shoeId }),
  distance: runningRecord.distance,
  cadence: runningRecord.cadence,
  heartRate: runningRecord.heartRate,
  calorie: runningRecord.calorie,
  durationSec: runningRecord.durationSec,
  point,
});

/**
 * 완료된 러닝 기록 포맷팅
 */
export const formatEndRunningRecord = (record: EndRunningRecord) => {
  const pace = record.distance > 0 ? (record.durationSec / 60) / (record.distance / 1000) : 0;
  const speed = record.durationSec > 0 ? (record.distance / 1000) / (record.durationSec / 3600) : 0;

  return {
    distance: `${(record.distance / 1000).toFixed(2)} km`,
    duration: formatEndDuration(record.durationSec),
    pace: `${Math.floor(pace)}:${String(Math.floor((pace % 1) * 60)).padStart(2, '0')} /km`,
    speed: `${speed.toFixed(1)} km/h`,
    calories: `${record.calorie} kcal`,
    cadence: `${record.cadence} spm`,
    heartRate: `${record.heartRate} bpm`,
    earnedPoints: `+${record.point} 포인트`,
  };
};

/**
 * 종료 기록 시간 포맷팅
 */
export const formatEndDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${secs}초`;
  }
  return `${minutes}분 ${secs}초`;
};

/**
 * 성과 분석
 */
export const analyzePerformance = (record: EndRunningRecord) => {
  const kmDistance = record.distance / 1000;
  const hoursDuration = record.durationSec / 3600;
  const averageSpeed = kmDistance / hoursDuration;
  const averagePace = (record.durationSec / 60) / kmDistance;

  // 성과 등급 계산
  let performanceGrade = 'Beginner';
  if (averageSpeed >= 12) performanceGrade = 'Elite';
  else if (averageSpeed >= 10) performanceGrade = 'Advanced';
  else if (averageSpeed >= 8) performanceGrade = 'Intermediate';

  return {
    grade: performanceGrade,
    averageSpeed: averageSpeed.toFixed(1),
    averagePace: `${Math.floor(averagePace)}:${String(Math.floor((averagePace % 1) * 60)).padStart(2, '0')}`,
    caloriesPerKm: Math.round(record.calorie / kmDistance),
    pointsPerKm: Math.round(record.point / kmDistance),
  };
};