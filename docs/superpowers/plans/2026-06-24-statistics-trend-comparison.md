# Statistics Trend Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secondary cumulative total-distance comparison layer to the existing statistics bar chart.

**Architecture:** Keep the existing statistics chart as a single SVG component. `StatisticsView` passes the already-prefetched previous-period chart data into `SwipeablePeriodChart`, and `SwipeablePeriodChart` forwards the relevant comparison data into each `PeriodChart` slot. `PeriodChart` computes cumulative km trend points locally, renders current and previous cumulative trend lines against a right-side Y-axis, and leaves the existing bars on the left-side scale.

**Tech Stack:** React Native, Expo, TypeScript, `react-native-svg`, Jest, `@testing-library/react-native`.

---

## File Structure

- Modify `src/features/statistics/views/components/PeriodChart.tsx`
  - Add optional `comparisonData?: ChartDataPoint[]`.
  - Compute current and previous cumulative total-distance trend points.
  - Add right-axis labels, trend legend, delta badge, and SVG line paths.
  - Keep existing bar rendering and compact chart height.
- Modify `src/features/statistics/views/components/SwipeablePeriodChart.tsx`
  - Add optional comparison data props per slot.
  - Pass previous/current/next comparison data into the correct `PeriodChart` slot.
- Modify `src/features/statistics/views/StatisticsView.tsx`
  - Pass `prevChartData` as the current slot's comparison data.
- Modify `src/features/statistics/__tests__/StatisticsView.test.tsx`
  - Update the mocked `SwipeablePeriodChart` to assert `comparisonData` receives `prevChartData`.
- Modify `src/features/statistics/views/components/__tests__/PeriodChart.test.tsx`
  - Add focused tests for trend paths, right-axis labels, and compact height.

## Task 1: Wire Previous-Period Data Into the Chart

**Files:**
- Modify: `src/features/statistics/views/components/SwipeablePeriodChart.tsx`
- Modify: `src/features/statistics/views/StatisticsView.tsx`
- Test: `src/features/statistics/__tests__/StatisticsView.test.tsx`

- [ ] **Step 1: Write the failing StatisticsView test**

Add a `comparisonData` assertion to the mocked `SwipeablePeriodChart`. The test should prove that `StatisticsView` passes `prevChartData` into the chart for the currently selected period.

```tsx
const mockSwipeablePeriodChart = jest.fn();

jest.mock('~/features/statistics/views/components/SwipeablePeriodChart', () => ({
  SwipeablePeriodChart: (props: {
    onSwipePeriodChange: (direction: number) => void;
    comparisonData?: unknown[];
  }) => {
    const React = require('react');
    const { Text, TouchableOpacity, View } = require('react-native');
    mockSwipeablePeriodChart(props);
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, 'mock-chart'),
      React.createElement(
        TouchableOpacity,
        {
          testID: 'mock-swipe-next',
          onPress: () => props.onSwipePeriodChange(1),
        },
        React.createElement(Text, null, 'next')
      )
    );
  },
}));
```

Add this test case:

```tsx
it('passes previous period chart data as comparison data', () => {
  const previousPeriodData = [
    {
      datetime: '2026-05-01T00:00:00.000Z',
      distance: 3000,
      durationSec: 1200,
      paceSec: 0.4,
      speed: 9,
      calories: 0,
    },
  ];

  mockUseStatisticsViewModel.mockImplementation(() =>
    createViewModelResult({
      hasValidData: true,
      chartData: [],
      prevChartData: previousPeriodData,
      summary: {
        runCount: 1,
        totalDistance: 5000,
        averagePace: 5.5,
      },
      formattedSummary: {
        runCount: 1,
        totalDistance: 5000,
        averagePace: 5.5,
      },
    })
  );

  renderWithProviders(<StatisticsView />);

  expect(mockSwipeablePeriodChart).toHaveBeenCalledWith(
    expect.objectContaining({
      comparisonData: previousPeriodData,
    })
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/features/statistics/__tests__/StatisticsView.test.tsx --runInBand
```

Expected: FAIL because `comparisonData` is not passed to `SwipeablePeriodChart`.

- [ ] **Step 3: Implement the minimal prop wiring**

Update `SwipeablePeriodChartProps`:

```ts
comparisonData?: ChartDataPoint[];
prevComparisonData?: ChartDataPoint[];
nextComparisonData?: ChartDataPoint[];
```

Destructure the new props:

```ts
comparisonData,
prevComparisonData,
nextComparisonData,
```

Pass comparison data into the three chart slots:

```tsx
<PeriodChart
  data={prevData ?? []}
  comparisonData={prevComparisonData}
  period={period}
  isEmpty={prevIsEmptyProp ?? true}
  referenceDate={prevRefDateProp ?? previousReferenceDate}
/>
```

```tsx
<PeriodChart
  data={cachedChart.data}
  comparisonData={comparisonData}
  period={period}
  isEmpty={cachedChart.isEmpty}
  referenceDate={cachedChart.referenceDate}
/>
```

```tsx
<PeriodChart
  data={nextData ?? []}
  comparisonData={nextComparisonData}
  period={period}
  isEmpty={nextIsEmptyProp ?? true}
  referenceDate={nextRefDateProp ?? nextReferenceDate}
/>
```

Update `StatisticsView`:

```tsx
<SwipeablePeriodChart
  data={isEmpty ? [] : (formattedChartData || chartData || [])}
  comparisonData={prevChartData}
  period={selectedPeriod}
  isEmpty={isEmpty}
  referenceDate={referenceDate}
  onSwipePeriodChange={handleSwipePeriodChange}
  isInitialLoading={isInitialLoading}
  isBackgroundFetching={isBackgroundFetching}
  prevData={prevChartData}
  prevReferenceDate={prevReferenceDate}
  prevIsEmpty={prevIsEmpty}
  nextData={nextChartData}
  nextReferenceDate={nextReferenceDate}
  nextIsEmpty={nextIsEmpty}
/>
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm test -- src/features/statistics/__tests__/StatisticsView.test.tsx --runInBand
```

Expected: PASS.

## Task 2: Render Cumulative Trend Lines and Right Axis

**Files:**
- Modify: `src/features/statistics/views/components/PeriodChart.tsx`
- Test: `src/features/statistics/views/components/__tests__/PeriodChart.test.tsx`

- [ ] **Step 1: Write the failing PeriodChart tests**

Add `Circle` and enhanced `Path` support to the `react-native-svg` mock:

```tsx
Path: createMock('period-chart-path'),
Circle: createMock('period-chart-circle'),
```

Add this test:

```tsx
it('renders cumulative trend lines and right-axis labels when comparison data exists', () => {
  render(
    <PeriodChart
      data={[
        {
          datetime: '2026-06-01T00:00:00.000Z',
          distance: 3000,
          durationSec: 1200,
          paceSec: 0.4,
          speed: 9,
          calories: 0,
        },
        {
          datetime: '2026-06-04T00:00:00.000Z',
          distance: 5000,
          durationSec: 1800,
          paceSec: 0.36,
          speed: 10,
          calories: 0,
        },
      ]}
      comparisonData={[
        {
          datetime: '2026-05-01T00:00:00.000Z',
          distance: 2000,
          durationSec: 900,
          paceSec: 0.45,
          speed: 8,
          calories: 0,
        },
        {
          datetime: '2026-05-04T00:00:00.000Z',
          distance: 4000,
          durationSec: 1600,
          paceSec: 0.4,
          speed: 9,
          calories: 0,
        },
      ]}
      period={Period.MONTH}
      isEmpty={false}
      referenceDate={new Date('2026-06-01T00:00:00.000Z')}
    />
  );

  expect(screen.getByText('일별 거리')).toBeTruthy();
  expect(screen.getByText('이번 누적')).toBeTruthy();
  expect(screen.getByText('직전 누적')).toBeTruthy();
  expect(screen.getByText('누적 km')).toBeTruthy();
  expect(screen.getAllByTestId('period-chart-path').length).toBeGreaterThanOrEqual(4);
});
```

Add this empty comparison test:

```tsx
it('omits the previous cumulative line when comparison data is empty', () => {
  render(
    <PeriodChart
      data={[
        {
          datetime: '2026-06-01T00:00:00.000Z',
          distance: 3000,
          durationSec: 1200,
          paceSec: 0.4,
          speed: 9,
          calories: 0,
        },
      ]}
      comparisonData={[]}
      period={Period.MONTH}
      isEmpty={false}
      referenceDate={new Date('2026-06-01T00:00:00.000Z')}
    />
  );

  expect(screen.getByText('이번 누적')).toBeTruthy();
  expect(screen.queryByText('직전 누적')).toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test -- src/features/statistics/views/components/__tests__/PeriodChart.test.tsx --runInBand
```

Expected: FAIL because `comparisonData`, trend legend text, right-axis label, and trend paths do not exist yet.

- [ ] **Step 3: Implement cumulative series helpers inside PeriodChart**

Add constants:

```ts
const TREND_LINE_CURRENT_COLOR = PRIMARY[600];
const TREND_LINE_PREVIOUS_COLOR = GREY[400];
```

Update the existing model import:

```ts
import {
  Period,
  PeriodDirection,
  calculateNextReferenceDate,
  formatPeriodLabel,
  getLastDayOfPeriod,
} from '../../models';
```

Add helper functions inside `PeriodChartComponent` near the existing position helpers:

```ts
const getTrendXPosition = (point: ChartDataPoint, periodReferenceDate: Date) => {
  const date = new Date(point.datetime);
  let position = 0;

  switch (period) {
    case Period.WEEK: {
      let dayOfWeek = date.getDay();
      dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      position = dayOfWeek / 6;
      break;
    }
    case Period.MONTH: {
      const periodLastDay = getLastDayOfPeriod(periodReferenceDate, Period.MONTH);
      position = periodLastDay <= 1 ? 0 : (date.getDate() - 1) / (periodLastDay - 1);
      break;
    }
    case Period.YEAR: {
      position = date.getMonth() / 11;
      break;
    }
  }

  const effectiveChartWidth = chartInnerWidth - X_AXIS_MARGIN * 2;
  return CHART_PADDING.left + X_AXIS_MARGIN + position * effectiveChartWidth;
};
```

```ts
const buildCumulativeTrend = (points: ChartDataPoint[], periodReferenceDate: Date) => {
  const sortedPoints = [...points].sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );
  let cumulativeDistanceKm = 0;

  return sortedPoints.map((point) => {
    cumulativeDistanceKm += point.distance / 1000;
    return {
      x: getTrendXPosition(point, periodReferenceDate),
      distanceKm: cumulativeDistanceKm,
    };
  });
};
```

```ts
const createLinePath = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`).join(' ');
};
```

- [ ] **Step 4: Implement right-axis scaling and paths**

Compute trend data:

```ts
const previousReferenceDate = useMemo(() => {
  return calculateNextReferenceDate(referenceDate, period, PeriodDirection.PREVIOUS);
}, [referenceDate, period]);

const currentTrendData = useMemo(
  () => buildCumulativeTrend(data, referenceDate),
  [data, referenceDate]
);

const previousTrendData = useMemo(
  () => buildCumulativeTrend(comparisonData ?? [], previousReferenceDate),
  [comparisonData, previousReferenceDate]
);
```

Compute the right-axis max:

```ts
const cumulativeMaxValue = useMemo(() => {
  const values = [
    ...currentTrendData.map((point) => point.distanceKm),
    ...previousTrendData.map((point) => point.distanceKm),
  ];
  if (values.length === 0) return 3.0;
  return Math.max(...values, 3.0);
}, [currentTrendData, previousTrendData]);
```

Map cumulative values to Y positions:

```ts
const getCumulativeYPosition = (value: number) => {
  return CHART_PADDING.top + ((cumulativeMaxValue - value) / cumulativeMaxValue) * chartInnerHeight;
};
```

Create paths:

```ts
const currentTrendPath = useMemo(() => {
  return createLinePath(
    currentTrendData.map((point) => ({
      x: point.x,
      y: getCumulativeYPosition(point.distanceKm),
    }))
  );
}, [currentTrendData, cumulativeMaxValue]);

const previousTrendPath = useMemo(() => {
  return createLinePath(
    previousTrendData.map((point) => ({
      x: point.x,
      y: getCumulativeYPosition(point.distanceKm),
    }))
  );
}, [previousTrendData, cumulativeMaxValue]);
```

- [ ] **Step 5: Render legend, right axis, and line paths**

Add a short chart subtitle and legend text inside the SVG header area:

```tsx
<SvgText x={16} y={52} fontSize={10} fontWeight="600" fill={GREY[400]}>
  막대: 일별 거리 / 선: 누적 총거리
</SvgText>

<SvgText x={CHART_PADDING.left + 10} y={70} fontSize={10} fontWeight="600" fill={PRIMARY[600]}>
  일별 거리
</SvgText>
<SvgText x={CHART_PADDING.left + 75} y={70} fontSize={10} fontWeight="600" fill={PRIMARY[600]}>
  이번 누적
</SvgText>
{previousTrendData.length > 0 && (
  <SvgText x={CHART_PADDING.left + 145} y={70} fontSize={10} fontWeight="600" fill={GREY[500]}>
    직전 누적
  </SvgText>
)}
```

Render the right-axis label and values:

```tsx
<SvgText
  x={CHART_WIDTH - 4}
  y={CHART_PADDING.top - 8}
  fontSize={10}
  fontWeight="600"
  fill={GREY[400]}
  textAnchor="end"
>
  누적 km
</SvgText>
```

Render trend paths after grid lines and before bars:

```tsx
{previousTrendPath.length > 0 && (
  <Path
    testID="previous-cumulative-trend-line"
    d={previousTrendPath}
    stroke={TREND_LINE_PREVIOUS_COLOR}
    strokeWidth={2}
    strokeDasharray="6 5"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
)}

{currentTrendPath.length > 0 && (
  <Path
    testID="current-cumulative-trend-line"
    d={currentTrendPath}
    stroke={TREND_LINE_CURRENT_COLOR}
    strokeWidth={2.5}
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
)}
```

- [ ] **Step 6: Run the PeriodChart tests to verify they pass**

Run:

```bash
npm test -- src/features/statistics/views/components/__tests__/PeriodChart.test.tsx --runInBand
```

Expected: PASS.

## Task 3: Add the Total Distance Delta Badge

**Files:**
- Modify: `src/features/statistics/views/components/PeriodChart.tsx`
- Test: `src/features/statistics/views/components/__tests__/PeriodChart.test.tsx`

- [ ] **Step 1: Write the failing delta badge test**

Add this test:

```tsx
it('renders a period-aware total-distance delta badge', () => {
  render(
    <PeriodChart
      data={[
        {
          datetime: '2026-06-01T00:00:00.000Z',
          distance: 5000,
          durationSec: 1800,
          paceSec: 0.36,
          speed: 10,
          calories: 0,
        },
      ]}
      comparisonData={[
        {
          datetime: '2026-05-01T00:00:00.000Z',
          distance: 3000,
          durationSec: 1200,
          paceSec: 0.4,
          speed: 9,
          calories: 0,
        },
      ]}
      period={Period.MONTH}
      isEmpty={false}
      referenceDate={new Date('2026-06-01T00:00:00.000Z')}
    />
  );

  expect(screen.getByText('지난달보다 +2.0 km')).toBeTruthy();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/features/statistics/views/components/__tests__/PeriodChart.test.tsx --runInBand
```

Expected: FAIL because the delta badge does not exist yet.

- [ ] **Step 3: Implement delta badge text**

Add helper logic inside `PeriodChartComponent`:

```ts
const comparisonDeltaLabel = useMemo(() => {
  if (!comparisonData || comparisonData.length === 0) return null;

  const currentTotalKm = normalizedData.reduce((sum, point) => sum + point.distanceKm, 0);
  const previousTotalKm = comparisonData.reduce((sum, point) => sum + point.distance / 1000, 0);
  const deltaKm = currentTotalKm - previousTotalKm;
  const prefix = deltaKm >= 0 ? '+' : '-';
  const periodLabelText =
    period === Period.WEEK ? '지난주보다' : period === Period.MONTH ? '지난달보다' : '작년보다';

  return `${periodLabelText} ${prefix}${Math.abs(deltaKm).toFixed(1)} km`;
}, [comparisonData, normalizedData, period]);
```

Render it near the existing period label:

```tsx
{comparisonDeltaLabel && (
  <SvgText
    x={CHART_WIDTH - 16}
    y={52}
    fontSize={11}
    fontWeight="700"
    fill={PRIMARY[600]}
    textAnchor="end"
  >
    {comparisonDeltaLabel}
  </SvgText>
)}
```

- [ ] **Step 4: Run the PeriodChart tests to verify they pass**

Run:

```bash
npm test -- src/features/statistics/views/components/__tests__/PeriodChart.test.tsx --runInBand
```

Expected: PASS.

## Task 4: Memoization, Regression Tests, and Lint

**Files:**
- Modify: `src/features/statistics/views/components/PeriodChart.tsx`
- Modify: `src/features/statistics/views/components/SwipeablePeriodChart.tsx`
- Test: existing statistics test suites

- [ ] **Step 1: Update memo comparison for new props**

In `PeriodChart` memo comparison, add array comparison for `comparisonData`:

```ts
const prevComparisonData = prevProps.comparisonData ?? [];
const nextComparisonData = nextProps.comparisonData ?? [];
if (prevComparisonData.length !== nextComparisonData.length) return false;
for (let i = 0; i < prevComparisonData.length; i++) {
  const prevItem = prevComparisonData[i];
  const nextItem = nextComparisonData[i];
  if (!prevItem || !nextItem) return false;
  if (prevItem.datetime !== nextItem.datetime) return false;
  if (prevItem.distance !== nextItem.distance) return false;
}
```

In `SwipeablePeriodChart` memo comparison, add the same shallow point comparison for `comparisonData`:

```ts
const comparisonDataEqual =
  (prev.comparisonData ?? []).length === (next.comparisonData ?? []).length &&
  (prev.comparisonData ?? []).every((item, i) => {
    const nextItem = next.comparisonData?.[i];
    return (
      nextItem !== undefined &&
      item.datetime === nextItem.datetime &&
      item.distance === nextItem.distance
    );
  });

if (!comparisonDataEqual) return false;
```

- [ ] **Step 2: Run focused statistics tests**

Run:

```bash
npm test -- src/features/statistics --runInBand
```

Expected: PASS.

- [ ] **Step 3: Run focused lint**

Run:

```bash
./node_modules/.bin/eslint src/features/statistics/views/StatisticsView.tsx src/features/statistics/views/components/SwipeablePeriodChart.tsx src/features/statistics/views/components/PeriodChart.tsx src/features/statistics/__tests__/StatisticsView.test.tsx src/features/statistics/views/components/__tests__/PeriodChart.test.tsx
```

Expected: exit code 0 with no lint errors.

- [ ] **Step 4: Review the diff for scope**

Run:

```bash
git diff -- src/features/statistics/views/StatisticsView.tsx src/features/statistics/views/components/SwipeablePeriodChart.tsx src/features/statistics/views/components/PeriodChart.tsx src/features/statistics/__tests__/StatisticsView.test.tsx src/features/statistics/views/components/__tests__/PeriodChart.test.tsx
```

Expected: only statistics chart comparison changes. No support/FAQ files, `.superpowers/` files, generated files, or dependency files should be included.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git add src/features/statistics/views/StatisticsView.tsx src/features/statistics/views/components/SwipeablePeriodChart.tsx src/features/statistics/views/components/PeriodChart.tsx src/features/statistics/__tests__/StatisticsView.test.tsx src/features/statistics/views/components/__tests__/PeriodChart.test.tsx
git commit -m "feat: add statistics trend comparison"
```

Expected: commit includes only the five statistics files.
