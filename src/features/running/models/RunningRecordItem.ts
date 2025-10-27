import type { Location } from './Location';

/**
 * 러닝 기록 아이템 모델
 * Swift RunningRecordItem.swift에서 마이그레이션
 *
 * 정책: 센서 데이터(cadence, heartRate)는 수집 불가 시 null
 * - Priority: 1. Garmin, 2. Watch(with app), 3. Phone
 * - 모든 디바이스에서 수집 실패 시 null (UI: "--")
 */
export interface RunningRecordItem {
  id: number;
  distance: number;
  cadence: number | null; // null 허용 (센서 데이터 없을 때)
  heartRate: number | null; // null 허용 (센서 데이터 없을 때)
  calories: number;
  orderIndex: number;
  durationSec: number; // TimeInterval (seconds)
  startTimestamp: number; // Unix timestamp
  endTimestamp?: number; // Unix timestamp
  locations?: Location[];
  isUploaded: boolean;
}

/**
 * 완전한 RunningRecordItem 생성
 * Swift RunningRecordItem init(모든 필드) 생성자와 동일
 */
export const createRunningRecordItem = (data: {
  id: number;
  distance: number;
  cadence: number | null; // null 허용
  heartRate: number | null; // null 허용
  calories: number;
  orderIndex: number;
  durationSec: number;
  startTimestamp: number;
  locations?: Location[];
}): RunningRecordItem => ({
  id: data.id,
  distance: data.distance,
  cadence: data.cadence,
  heartRate: data.heartRate,
  calories: data.calories,
  orderIndex: data.orderIndex,
  durationSec: data.durationSec,
  startTimestamp: data.startTimestamp,
  ...(data.locations !== undefined && { locations: data.locations }),
  isUploaded: false,
});;

/**
 * 기본 RunningRecordItem 생성 (ID만으로)
 * Swift convenience init(id:) 생성자와 동일
 * 정책: 센서 데이터 없으면 null
 */
export const createEmptyRunningRecordItem = (id: number): RunningRecordItem => ({
  id,
  distance: 0,
  cadence: null, // 센서 데이터 없음
  heartRate: null, // 센서 데이터 없음
  calories: 0,
  orderIndex: 0,
  durationSec: 0,
  startTimestamp: Date.now() / 1000, // Convert to seconds
  isUploaded: false,
});;

/**
 * 업로드 완료 표시
 * Swift markAsUploaded() 메서드와 동일
 */
export const markAsUploaded = (item: RunningRecordItem): RunningRecordItem => ({
  ...item,
  isUploaded: true,
});

/**
 * 종료 시간 설정
 */
export const setEndTimestamp = (item: RunningRecordItem, endTimestamp: number): RunningRecordItem => ({
  ...item,
  endTimestamp,
});

/**
 * 위치 데이터 추가
 */
export const addLocation = (item: RunningRecordItem, location: Location): RunningRecordItem => ({
  ...item,
  locations: [...(item.locations || []), location],
});

/**
 * 러닝 기록 아이템 업데이트
 */
export const updateRunningRecordItem = (
  item: RunningRecordItem,
  updates: Partial<Omit<RunningRecordItem, 'id'>>
): RunningRecordItem => ({
  ...item,
  ...updates,
});

/**
 * 실시간 통계 계산
 */
export const calculateItemStats = (item: RunningRecordItem) => {
  const pace = item.distance > 0 ? (item.durationSec / 60) / (item.distance / 1000) : 0;
  const speed = item.durationSec > 0 ? (item.distance / 1000) / (item.durationSec / 3600) : 0;

  return {
    distance: item.distance,
    duration: item.durationSec,
    pace,
    speed,
    calories: item.calories,
    cadence: item.cadence,
    heartRate: item.heartRate,
  };
};

/**
 * 아이템별 포맷팅
 * 정책: null인 센서 데이터는 "--"로 표시
 */
export const formatRunningRecordItem = (item: RunningRecordItem) => ({
  orderIndex: `#${item.orderIndex}`,
  distance: `${(item.distance / 1000).toFixed(2)} km`,
  duration: formatItemDuration(item.durationSec),
  calories: `${item.calories} kcal`,
  cadence: item.cadence !== null ? `${item.cadence} spm` : '--',
  heartRate: item.heartRate !== null ? `${item.heartRate} bpm` : '--',
  uploadStatus: item.isUploaded ? 'Uploaded' : 'Pending',
});

/**
 * 아이템 시간 포맷팅
 */
export const formatItemDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
};