import {
  PointFilter,
  calculatePointStatistics,
  createPointHistoryViewModel,
  formatDate,
  formatPointChange,
  formatPoints,
  filterPointHistories,
  getIsEarnedFromFilter,
  getThreeMonthsAgo,
  sortPointHistories,
  validatePointHistory,
  type PointHistory,
  type PointHistoryViewModel,
} from '~/features/point/models/Point';

describe('Point model', () => {
  const histories: PointHistoryViewModel[] = [
    {
      id: 1,
      isPositive: true,
      title: '적립',
      point: 100,
      date: new Date('2026-01-01T10:00:00.000Z'),
      formattedPoint: '+100P',
      formattedDate: '2026.01.01 19:00',
    },
    {
      id: 2,
      isPositive: false,
      title: '사용',
      point: 50,
      date: new Date('2026-01-02T10:00:00.000Z'),
      formattedPoint: '-50P',
      formattedDate: '2026.01.02 19:00',
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 10, 12, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('POINT-MODEL-001 filters earned/spent/all histories', () => {
    expect(filterPointHistories(histories, PointFilter.ALL)).toHaveLength(2);
    expect(filterPointHistories(histories, PointFilter.EARNED)).toHaveLength(1);
    expect(filterPointHistories(histories, PointFilter.SPENT)).toHaveLength(1);
    expect(filterPointHistories(histories, 'unexpected' as PointFilter)).toEqual(histories);
  });

  it('maps filter to isEarned query parameter', () => {
    expect(getIsEarnedFromFilter(PointFilter.EARNED)).toBe(true);
    expect(getIsEarnedFromFilter(PointFilter.SPENT)).toBe(false);
    expect(getIsEarnedFromFilter(PointFilter.ALL)).toBeUndefined();
    expect(getIsEarnedFromFilter('unknown' as PointFilter)).toBeUndefined();
  });

  it('creates point history view model with formatted values', () => {
    const source: PointHistory = {
      id: 4,
      point: -1500,
      pointType: '아이템 구매',
      createdTimestamp: 1760100000,
    };

    const viewModel = createPointHistoryViewModel(source);

    expect(viewModel.id).toBe(4);
    expect(viewModel.isPositive).toBe(false);
    expect(viewModel.point).toBe(1500);
    expect(viewModel.formattedPoint).toBe('-1500P');
    expect(viewModel.date.getTime()).toBe(source.createdTimestamp * 1000);
  });

  it('formats date and point strings', () => {
    const date = new Date(2026, 0, 2, 3, 4, 0);
    expect(formatDate(date)).toBe('2026.01.02 03:04');
    expect(formatPoints(12000)).toBe('12,000P');
    expect(formatPointChange(12000)).toBe('+12,000P');
    expect(formatPointChange(-500)).toBe('-500P');
  });

  it('POINT-MODEL-003 validates point history payload', () => {
    const validHistory: PointHistory = {
      id: 10,
      point: 100,
      pointType: '출석 보너스',
      createdTimestamp: 1760100000,
    };

    expect(validatePointHistory(validHistory)).toBe(true);
    expect(validatePointHistory({ ...validHistory, id: 0 })).toBe(false);
    expect(validatePointHistory({ ...validHistory, point: 0 })).toBe(false);
    expect(validatePointHistory({ ...validHistory, pointType: '   ' })).toBe(false);
    expect(validatePointHistory({ ...validHistory, createdTimestamp: 0 })).toBe(false);
  });

  it('POINT-MODEL-002 calculates total/today/weekly statistics from histories', () => {
    const todayEarnedDate = new Date(2026, 1, 10, 9, 0, 0);
    const weeklyEarnedDate = new Date(2026, 1, 6, 12, 0, 0);
    const oldEarnedDate = new Date(2026, 0, 25, 12, 0, 0);

    const statistics = calculatePointStatistics([
      {
        id: 11,
        isPositive: true,
        title: '러닝',
        point: 120,
        date: todayEarnedDate,
        formattedPoint: '+120P',
        formattedDate: '2026.02.10 09:00',
      },
      {
        id: 12,
        isPositive: true,
        title: '보너스',
        point: 80,
        date: weeklyEarnedDate,
        formattedPoint: '+80P',
        formattedDate: '2026.02.06 12:00',
      },
      {
        id: 13,
        isPositive: true,
        title: '오래된 적립',
        point: 40,
        date: oldEarnedDate,
        formattedPoint: '+40P',
        formattedDate: '2026.01.25 12:00',
      },
      {
        id: 14,
        isPositive: false,
        title: '사용',
        point: 60,
        date: todayEarnedDate,
        formattedPoint: '-60P',
        formattedDate: '2026.02.10 10:00',
      },
    ]);

    expect(statistics.totalEarned).toBe(240);
    expect(statistics.totalSpent).toBe(60);
    expect(statistics.todayEarned).toBe(120);
    expect(statistics.weeklyEarned).toBe(200);
    expect(statistics.transactionCount).toBe(4);
  });

  it('returns a date around three months ago from now', () => {
    const threeMonthsAgo = getThreeMonthsAgo();
    const now = new Date();
    const monthDiff =
      now.getFullYear() * 12 +
      now.getMonth() -
      (threeMonthsAgo.getFullYear() * 12 + threeMonthsAgo.getMonth());

    expect(monthDiff).toBe(3);
    expect(threeMonthsAgo.getDate()).toBe(now.getDate());
  });

  it('sorts histories by date and point', () => {
    const byDateAsc = sortPointHistories(histories, 'date', 'asc');
    const byPointDesc = sortPointHistories(histories, 'point', 'desc');

    expect(byDateAsc.map((item) => item.id)).toEqual([1, 2]);
    expect(byPointDesc.map((item) => item.id)).toEqual([1, 2]);
    expect(byDateAsc).not.toBe(histories);
  });
});
