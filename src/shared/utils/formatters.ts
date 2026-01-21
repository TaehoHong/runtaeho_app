/**
 * 공통 포매팅 유틸리티
 */

/**
 * 페이스를 UI용 문자열로 포매팅 (M:SS 형식)
 * @param paceMinPerKm - 분/km 단위 페이스
 * @returns "M:SS" 형식 (예: "5:30", "0:00")
 */
export const formatPaceForUI = (paceMinPerKm: number): string => {
  if (!isFinite(paceMinPerKm) || paceMinPerKm <= 0) {
    return '0:00';
  }
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.floor((paceMinPerKm % 1) * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
