/**
 * Pace Calculation Utilities
 * 페이스 계산 관련 중복 로직 통합
 */

/**
 * 거리(미터)와 시간(초)으로 페이스(분/km) 계산
 * @param distanceMeters - 거리 (미터)
 * @param durationSeconds - 시간 (초)
 * @returns 페이스 (분/km)
 */
export const calculatePace = (distanceMeters: number, durationSeconds: number): number => {
  if (distanceMeters === 0 || durationSeconds === 0) return 0;
  const kmDistance = distanceMeters / 1000;
  const minutesDuration = durationSeconds / 60;
  return minutesDuration / kmDistance;
};

/**
 * 거리(미터)와 시간(초)으로 페이스(초/미터) 계산
 * 백엔드 API 형식과 호환
 * @param distanceMeters - 거리 (미터)
 * @param durationSeconds - 시간 (초)
 * @returns 페이스 (초/미터)
 */
export const calculatePaceSecPerMeter = (distanceMeters: number, durationSeconds: number): number => {
  if (distanceMeters === 0) return 0;
  return durationSeconds / distanceMeters;
};

/**
 * 페이스 단위 변환: 초/미터 → 분/km
 * @param paceSecPerMeter - 페이스 (초/미터)
 * @returns 페이스 (분/km)
 */
export const convertPaceSecToMinPerKm = (paceSecPerMeter: number): number => {
  return (paceSecPerMeter * 1000) / 60;
};

/**
 * 페이스 단위 변환: 분/km → 초/미터
 * @param paceMinPerKm - 페이스 (분/km)
 * @returns 페이스 (초/미터)
 */
export const convertPaceMinPerKmToSec = (paceMinPerKm: number): number => {
  return (paceMinPerKm * 60) / 1000;
};
