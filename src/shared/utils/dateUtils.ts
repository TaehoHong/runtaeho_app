/**
 * Date Formatting Utilities
 * 날짜 포맷팅 관련 중복 로직 통합
 */

type DateFormat = 'YYYY-MM-DD' | 'YYYY-MM' | 'YYYY';

/**
 * Date 객체를 지정된 형식의 문자열로 변환
 * @param date - 변환할 Date 객체
 * @param format - 출력 형식 ('YYYY-MM-DD', 'YYYY-MM', 'YYYY')
 * @returns 포맷된 날짜 문자열
 */
export const formatDateString = (date: Date, format: DateFormat): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYY-MM':
      return `${year}-${month}`;
    case 'YYYY':
      return `${year}`;
  }
};

/**
 * Date 객체를 LocalDateTime 문자열로 변환
 * 백엔드 API 요청 시 사용 (ISO 8601 형식, 타임존 없음)
 * @param date - 변환할 Date 객체
 * @returns LocalDateTime 문자열 (예: "2024-01-01T00:00:00")
 */
export const formatToLocalDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

/**
 * Unix timestamp를 한국어 날짜 문자열로 변환
 * 러닝 기록 카드 등에서 사용
 * @param timestamp - Unix timestamp (초 단위)
 * @returns 한국어 날짜 문자열 (예: "2024년 1월 1일 09:30")
 */
export const formatRecordDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
};

/**
 * Date 객체를 한국어 연월일 문자열로 변환
 * @param date - 변환할 Date 객체
 * @returns 한국어 날짜 문자열 (예: "2024년 1월 1일")
 */
export const formatKoreanDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
};

/**
 * Date 객체를 한국어 연월 문자열로 변환
 * @param date - 변환할 Date 객체
 * @returns 한국어 연월 문자열 (예: "2024년 1월")
 */
export const formatKoreanYearMonth = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}년 ${month}월`;
};
