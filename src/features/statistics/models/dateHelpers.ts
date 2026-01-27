/**
 * Statistics Date Helpers
 * 통계 기간 관련 날짜 헬퍼 함수
 */

import { formatDateString } from '~/shared/utils/dateUtils';
import { Period, PeriodDirection } from './types';

/**
 * 주의 시작일 (일요일) 반환
 */
export const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

/**
 * 월의 시작일 반환
 */
export const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

/**
 * 연의 시작일 반환
 */
export const getStartOfYear = (date: Date): Date => {
  return new Date(date.getFullYear(), 0, 1);
};

/**
 * 날짜 포맷팅 (Statistics용)
 * @deprecated formatDateString from dateUtils 사용 권장
 */
export const formatDate = (date: Date, format: string): string => {
  switch (format) {
    case 'YYYY-MM-DD':
      return formatDateString(date, 'YYYY-MM-DD');
    case 'YYYY-MM':
      return formatDateString(date, 'YYYY-MM');
    case 'YYYY':
      return formatDateString(date, 'YYYY');
    default:
      return date.toISOString().split('T')[0] ?? '';
  }
};

/**
 * 다음/이전 기간의 기준 날짜 계산
 * 스와이프로 기간을 이동할 때 사용
 */
export const calculateNextReferenceDate = (
  currentRef: Date,
  period: Period,
  direction: PeriodDirection
): Date => {
  const result = new Date(currentRef);

  switch (period) {
    case Period.WEEK:
      result.setDate(result.getDate() + 7 * direction);
      break;
    case Period.MONTH:
      result.setMonth(result.getMonth() + direction);
      break;
    case Period.YEAR:
      result.setFullYear(result.getFullYear() + direction);
      break;
  }

  return result;
};

/**
 * 해당 날짜가 미래 기간인지 확인
 * 오늘이 포함된 기간 이후로는 스와이프 불가
 */
export const isFutureDate = (date: Date, period: Period): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case Period.WEEK: {
      const targetWeekStart = getStartOfWeek(date);
      const currentWeekStart = getStartOfWeek(today);
      return targetWeekStart.getTime() > currentWeekStart.getTime();
    }
    case Period.MONTH: {
      const targetMonthStart = getStartOfMonth(date);
      const currentMonthStart = getStartOfMonth(today);
      return targetMonthStart.getTime() > currentMonthStart.getTime();
    }
    case Period.YEAR: {
      const targetYearStart = getStartOfYear(date);
      const currentYearStart = getStartOfYear(today);
      return targetYearStart.getTime() > currentYearStart.getTime();
    }
  }
};

/**
 * 기간 라벨 포맷팅 (referenceDate 기준)
 * 차트 상단에 표시할 기간 라벨 생성
 */
export const formatPeriodLabel = (
  referenceDate: Date,
  period: Period
): { primary: string; secondary: string | undefined } => {
  switch (period) {
    case Period.WEEK: {
      const dayOfWeek = referenceDate.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(referenceDate);
      monday.setDate(referenceDate.getDate() + diff);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const startMonth = monday.getMonth() + 1;
      const startDay = monday.getDate();
      const endMonth = sunday.getMonth() + 1;
      const endDay = sunday.getDate();

      const dateRange = startMonth === endMonth
        ? `${startDay}일~${endDay}일`
        : `${startDay}일~${endMonth}월${endDay}일`;

      return {
        primary: `${monday.getFullYear()}년 ${monday.getMonth() + 1}월`,
        secondary: dateRange,
      };
    }
    case Period.MONTH:
      return {
        primary: `${referenceDate.getFullYear()}년 ${referenceDate.getMonth() + 1}월`,
        secondary: undefined,
      };
    case Period.YEAR:
      return {
        primary: `${referenceDate.getFullYear()}년`,
        secondary: undefined,
      };
    default:
      return { primary: '', secondary: undefined };
  }
};

/**
 * 해당 기간의 마지막 날 계산 (referenceDate 기준)
 */
export const getLastDayOfPeriod = (referenceDate: Date, period: Period): number => {
  switch (period) {
    case Period.WEEK:
      return 7;
    case Period.MONTH: {
      const year = referenceDate.getFullYear();
      const month = referenceDate.getMonth();
      return new Date(year, month + 1, 0).getDate();
    }
    case Period.YEAR:
      return 12;
    default:
      return 31;
  }
};

/**
 * 해당 기간의 종료 날짜 계산
 */
export const getEndOfPeriod = (referenceDate: Date, period: Period): Date => {
  const result = new Date(referenceDate);

  switch (period) {
    case Period.WEEK: {
      const dayOfWeek = result.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      result.setDate(result.getDate() + daysUntilSunday);
      break;
    }
    case Period.MONTH: {
      result.setMonth(result.getMonth() + 1, 0);
      break;
    }
    case Period.YEAR: {
      result.setFullYear(result.getFullYear(), 11, 31);
      break;
    }
  }

  result.setHours(23, 59, 59, 999);
  return result;
};
