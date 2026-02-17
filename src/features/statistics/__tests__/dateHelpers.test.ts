import {
  Period,
  PeriodDirection,
  calculateNextReferenceDate,
  formatDate,
  formatPeriodLabel,
  getEndOfPeriod,
  getLastDayOfPeriod,
  getStartOfMonth,
  getStartOfWeek,
  getStartOfYear,
  isFutureDate,
} from '~/features/statistics/models';

describe('statistics date helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 10, 12, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('STAT-DATE-001 returns normalized start dates for week, month, and year', () => {
    const source = new Date(2026, 1, 11, 18, 30, 45);
    const weekStart = getStartOfWeek(source);
    const monthStart = getStartOfMonth(source);
    const yearStart = getStartOfYear(source);

    expect(weekStart.getDay()).toBe(0);
    expect(monthStart.getDate()).toBe(1);
    expect(yearStart.getMonth()).toBe(0);
    expect(yearStart.getDate()).toBe(1);
  });

  it('formats date by requested template and falls back to ISO date', () => {
    const date = new Date('2026-02-01T10:20:30.000Z');

    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2026-02-01');
    expect(formatDate(date, 'YYYY-MM')).toBe('2026-02');
    expect(formatDate(date, 'YYYY')).toBe('2026');
    expect(formatDate(date, 'unknown')).toBe(date.toISOString().split('T')[0]);
  });

  it('moves reference date by period and direction', () => {
    const current = new Date(2026, 1, 10);

    expect(calculateNextReferenceDate(current, Period.WEEK, PeriodDirection.NEXT).getDate()).toBe(17);
    expect(calculateNextReferenceDate(current, Period.MONTH, PeriodDirection.PREVIOUS).getMonth()).toBe(0);
    expect(calculateNextReferenceDate(current, Period.YEAR, PeriodDirection.NEXT).getFullYear()).toBe(2027);
  });

  it('STAT-DATE-002 detects future periods for week, month, and year', () => {
    const nextWeek = new Date(2026, 1, 20);
    const nextMonth = new Date(2026, 2, 1);
    const nextYear = new Date(2027, 0, 1);
    const pastWeek = new Date(2026, 1, 2);

    expect(isFutureDate(nextWeek, Period.WEEK)).toBe(true);
    expect(isFutureDate(nextMonth, Period.MONTH)).toBe(true);
    expect(isFutureDate(nextYear, Period.YEAR)).toBe(true);
    expect(isFutureDate(pastWeek, Period.WEEK)).toBe(false);
  });

  it('formats period labels for week/month/year and unknown type', () => {
    const weekLabel = formatPeriodLabel(new Date(2026, 2, 1), Period.WEEK);
    const monthLabel = formatPeriodLabel(new Date(2026, 1, 10), Period.MONTH);
    const yearLabel = formatPeriodLabel(new Date(2026, 1, 10), Period.YEAR);
    const unknownLabel = formatPeriodLabel(new Date(2026, 1, 10), 'UNKNOWN' as Period);

    expect(weekLabel.primary).toBe('2026년 2월');
    expect(weekLabel.secondary).toBe('23일~3월1일');
    expect(monthLabel).toEqual({ primary: '2026년 2월', secondary: undefined });
    expect(yearLabel).toEqual({ primary: '2026년', secondary: undefined });
    expect(unknownLabel).toEqual({ primary: '', secondary: undefined });
  });

  it('STAT-DATE-003 returns period boundaries for last day and end-of-period timestamps', () => {
    const monthRef = new Date(2024, 1, 10, 9, 0, 0);
    const weekEnd = getEndOfPeriod(new Date(2026, 1, 11), Period.WEEK);
    const monthEnd = getEndOfPeriod(monthRef, Period.MONTH);
    const yearEnd = getEndOfPeriod(new Date(2026, 4, 10), Period.YEAR);

    expect(getLastDayOfPeriod(monthRef, Period.WEEK)).toBe(7);
    expect(getLastDayOfPeriod(monthRef, Period.MONTH)).toBe(29);
    expect(getLastDayOfPeriod(monthRef, Period.YEAR)).toBe(12);
    expect(getLastDayOfPeriod(monthRef, 'UNKNOWN' as Period)).toBe(31);

    expect(weekEnd.getDay()).toBe(0);
    expect(monthEnd.getDate()).toBe(29);
    expect(yearEnd.getMonth()).toBe(11);
    expect(yearEnd.getDate()).toBe(31);
    expect(yearEnd.getHours()).toBe(23);
    expect(yearEnd.getMinutes()).toBe(59);
    expect(yearEnd.getSeconds()).toBe(59);
  });
});
