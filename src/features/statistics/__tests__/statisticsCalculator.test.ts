import {
  Period,
  calculateGoalProgress,
  calculatePersonalRecords,
  calculateStatistics,
  calculateTrends,
  filterRecordsByPeriod,
  generateChartData,
  groupRecordsByPeriod,
} from '~/features/statistics/models';
import type { RunningRecord } from '~/features/running/models';

const createRecord = (overrides?: Partial<RunningRecord>): RunningRecord => ({
  id: 1,
  distance: 5000,
  steps: 6000,
  cadence: 170,
  heartRate: 150,
  calorie: 300,
  durationSec: 1500,
  startTimestamp: Math.floor(new Date(2026, 1, 10, 10, 0, 0).getTime() / 1000),
  ...overrides,
});

describe('statistics calculator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 10, 12, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns zero speed when average duration is zero', () => {
    const stats = calculateStatistics([
      createRecord({ id: 11, durationSec: 0, distance: 0, calorie: 10 }),
      createRecord({ id: 12, durationSec: 0, distance: 0, calorie: 20 }),
    ]);

    expect(stats.averageSpeed).toBe(0);
    expect(stats.averagePace).toBe(0);
    expect(stats.totalCalories).toBe(30);
  });

  it('STAT-CALC-001 filters records by weekly, monthly, yearly and default period', () => {
    const records = [
      createRecord({ id: 1, startTimestamp: Math.floor(new Date(2026, 1, 9).getTime() / 1000) }),
      createRecord({ id: 2, startTimestamp: Math.floor(new Date(2026, 1, 1).getTime() / 1000) }),
      createRecord({ id: 3, startTimestamp: Math.floor(new Date(2025, 11, 30).getTime() / 1000) }),
    ];
    const referenceDate = new Date(2026, 1, 10, 12, 0, 0);

    const weekly = filterRecordsByPeriod(records, Period.WEEK, referenceDate);
    const monthly = filterRecordsByPeriod(records, Period.MONTH, referenceDate);
    const yearly = filterRecordsByPeriod(records, Period.YEAR, referenceDate);
    const fallback = filterRecordsByPeriod(records, 'UNKNOWN' as Period, referenceDate);

    expect(weekly.map((item) => item.id)).toEqual([1]);
    expect(monthly.map((item) => item.id)).toEqual([1, 2]);
    expect(yearly.map((item) => item.id)).toEqual([1, 2]);
    expect(fallback).toEqual(records);
  });

  it('groups records by period keys', () => {
    const records = [
      createRecord({ id: 1, startTimestamp: Math.floor(new Date('2026-02-10T10:00:00.000Z').getTime() / 1000) }),
      createRecord({ id: 2, startTimestamp: Math.floor(new Date('2026-02-11T10:00:00.000Z').getTime() / 1000) }),
      createRecord({ id: 3, startTimestamp: Math.floor(new Date('2026-03-01T10:00:00.000Z').getTime() / 1000) }),
      createRecord({ id: 4, startTimestamp: Math.floor(new Date('2025-12-10T10:00:00.000Z').getTime() / 1000) }),
    ];

    const weekly = groupRecordsByPeriod(records, Period.WEEK);
    const monthly = groupRecordsByPeriod(records, Period.MONTH);
    const yearly = groupRecordsByPeriod(records, Period.YEAR);
    const fallback = groupRecordsByPeriod(records, 'UNKNOWN' as Period);

    expect(Object.keys(weekly).length).toBeGreaterThan(1);
    expect(Object.keys(monthly)).toEqual(expect.arrayContaining(['2026-02', '2026-03', '2025-12']));
    expect(Object.keys(yearly)).toEqual(expect.arrayContaining(['2026', '2025']));
    expect(Object.keys(fallback)).toEqual(expect.arrayContaining(['2026-02-10']));
  });

  it('generates sorted chart data with aggregated period values', () => {
    const records = [
      createRecord({
        id: 9,
        distance: 3000,
        durationSec: 1000,
        calorie: 200,
        startTimestamp: Math.floor(new Date('2026-02-11T10:00:00.000Z').getTime() / 1000),
      }),
      createRecord({
        id: 10,
        distance: 2000,
        durationSec: 900,
        calorie: 140,
        startTimestamp: Math.floor(new Date('2026-02-10T10:00:00.000Z').getTime() / 1000),
      }),
    ];

    const chartData = generateChartData(records, Period.WEEK);

    expect(chartData).toHaveLength(1);
    expect(chartData[0]?.distance).toBe(5000);
    expect(chartData[0]?.durationSec).toBe(1900);
    expect(chartData[0]?.paceSec).toBeCloseTo(0.38, 2);
    expect(chartData[0]?.speed).toBeGreaterThan(0);
  });

  it('calculates personal records with and without valid pace data', () => {
    const records = [
      createRecord({ id: 1, distance: 10000, durationSec: 3600, calorie: 700, startTimestamp: Math.floor(new Date('2026-02-01T10:00:00.000Z').getTime() / 1000) }),
      createRecord({ id: 2, distance: 5000, durationSec: 1400, calorie: 320, startTimestamp: Math.floor(new Date('2026-02-05T10:00:00.000Z').getTime() / 1000) }),
      createRecord({ id: 3, distance: 0, durationSec: 500, calorie: 150, startTimestamp: Math.floor(new Date('2026-02-06T10:00:00.000Z').getTime() / 1000) }),
    ];

    const personalRecords = calculatePersonalRecords(records);
    const noPaceRecordResult = calculatePersonalRecords([
      createRecord({ id: 7, distance: 0, durationSec: 100, calorie: 40 }),
    ]);

    expect(personalRecords.longestDistance.record?.id).toBe(1);
    expect(personalRecords.longestDuration.record?.id).toBe(1);
    expect(personalRecords.fastestPace.record?.id).toBe(2);
    expect(personalRecords.mostCalories.record?.id).toBe(1);
    expect(personalRecords.mostRuns.count).toBeGreaterThan(0);
    expect(noPaceRecordResult.fastestPace.record).toBeNull();
  });

  it('STAT-CALC-002 calculates trend deltas and handles zero baseline', () => {
    const current = [
      createRecord({ id: 1, distance: 10000, durationSec: 3000, calorie: 500 }),
      createRecord({ id: 2, distance: 5000, durationSec: 1500, calorie: 250 }),
    ];
    const previous = [
      createRecord({ id: 3, distance: 8000, durationSec: 3200, calorie: 300 }),
    ];

    const trends = calculateTrends(current, previous);
    const zeroBaselineTrends = calculateTrends(current, []);

    expect(trends.distanceTrend).toBeGreaterThan(0);
    expect(trends.durationTrend).toBeGreaterThan(0);
    expect(trends.paceTrend).not.toBeNaN();
    expect(zeroBaselineTrends.runCountTrend).toBe(100);
  });

  it('STAT-CALC-003 calculates goal progress by period and handles missing goals', () => {
    const records = [
      createRecord({ id: 1, distance: 10000, startTimestamp: Math.floor(new Date(2026, 1, 9).getTime() / 1000) }),
      createRecord({ id: 2, distance: 5000, startTimestamp: Math.floor(new Date(2026, 1, 3).getTime() / 1000) }),
      createRecord({ id: 3, distance: 7000, startTimestamp: Math.floor(new Date(2026, 0, 10).getTime() / 1000) }),
    ];

    const progress = calculateGoalProgress(records, {
      weeklyDistance: 20000,
      monthlyDistance: 50000,
      yearlyDistance: 100000,
      weeklyRuns: 4,
      monthlyRuns: 10,
    });

    const fallbackProgress = calculateGoalProgress(records, {});

    expect(progress.weeklyDistanceProgress).toBeGreaterThan(0);
    expect(progress.monthlyDistanceProgress).toBeGreaterThan(0);
    expect(progress.yearlyDistanceProgress).toBeGreaterThan(0);
    expect(progress.weeklyRunsProgress).toBeGreaterThan(0);
    expect(progress.monthlyRunsProgress).toBeGreaterThan(0);

    expect(fallbackProgress.weeklyDistanceProgress).toBe(0);
    expect(fallbackProgress.monthlyRunsProgress).toBe(0);
  });
});
