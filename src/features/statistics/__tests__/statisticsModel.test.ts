import {
  Period,
  getEndOfPeriod,
  getLastDayOfPeriod,
} from '~/features/statistics/models';

describe('statistics model helpers', () => {
  it('handles boundary period helpers for leap-month and end-of-day', () => {
    const leapMonthDate = new Date('2024-02-10T09:00:00.000Z');
    const endOfMonth = getEndOfPeriod(leapMonthDate, Period.MONTH);

    expect(getLastDayOfPeriod(leapMonthDate, Period.MONTH)).toBe(29);
    expect(endOfMonth.getDate()).toBe(29);
    expect(endOfMonth.getHours()).toBe(23);
    expect(endOfMonth.getMinutes()).toBe(59);
    expect(endOfMonth.getSeconds()).toBe(59);
  });
});
