import { type RunningRecord } from '~/features/running/models';
import {
  Period,
  calculateStatistics,
  calculateTrends,
  getEndOfPeriod,
  getLastDayOfPeriod,
} from '~/features/statistics/models';

describe('statistics model helpers', () => {
  const records: RunningRecord[] = [
    {
      id: 1,
      distance: 5000,
      steps: 6200,
      cadence: 170,
      heartRate: 150,
      calorie: 320,
      durationSec: 1500,
      startTimestamp: 1700000000,
    },
    {
      id: 2,
      distance: 10000,
      steps: 11200,
      cadence: 168,
      heartRate: 148,
      calorie: 640,
      durationSec: 3600,
      startTimestamp: 1700086400,
    },
  ];

  it('returns zeroed statistics when records are empty', () => {
    const stats = calculateStatistics([]);

    expect(stats.runCount).toBe(0);
    expect(stats.totalDistance).toBe(0);
    expect(stats.totalDuration).toBe(0);
    expect(stats.averagePace).toBe(0);
    expect(stats.averageSpeed).toBe(0);
  });

  it('calculates aggregated statistics with rounded values', () => {
    const stats = calculateStatistics(records);

    expect(stats.runCount).toBe(2);
    expect(stats.totalDistance).toBe(15000);
    expect(stats.totalDuration).toBe(5100);
    expect(stats.averageDistance).toBe(7500);
    expect(stats.averageDuration).toBe(2550);
    expect(stats.averagePace).toBe(5.67);
    expect(stats.averageSpeed).toBe(10.59);
    expect(stats.totalCalories).toBe(960);
    expect(stats.averageCalories).toBe(480);
  });

  it('handles boundary period helpers for leap-month and end-of-day', () => {
    const leapMonthDate = new Date('2024-02-10T09:00:00.000Z');
    const endOfMonth = getEndOfPeriod(leapMonthDate, Period.MONTH);

    expect(getLastDayOfPeriod(leapMonthDate, Period.MONTH)).toBe(29);
    expect(endOfMonth.getDate()).toBe(29);
    expect(endOfMonth.getHours()).toBe(23);
    expect(endOfMonth.getMinutes()).toBe(59);
    expect(endOfMonth.getSeconds()).toBe(59);
  });

  it('returns 100% trend when previous period is zero and current has data', () => {
    const trends = calculateTrends(records, []);

    expect(trends.distanceTrend).toBe(100);
    expect(trends.durationTrend).toBe(100);
    expect(trends.caloriesTrend).toBe(100);
    expect(trends.runCountTrend).toBe(100);
  });
});
