# Statistics Trend Comparison Design

Referenced section: `Mode: Initial Feature Development`

## Goal

Add a trend comparison layer to the statistics chart so users can compare the current period's total distance against the previous week, month, or year at a glance.

## Approved Direction

The existing blue bar chart stays as the primary chart. It continues to show distance distribution for the selected period:

- Week: daily distance from Monday through Sunday
- Month: daily distance by day of month
- Year: monthly distance from January through December

The comparison layer is a secondary visual indicator:

- Current period cumulative total distance: blue solid line
- Previous period cumulative total distance: gray dashed line
- Right Y-axis: cumulative total distance in km
- Left Y-axis: existing per-bucket distance scale for the bars
- Header badge: final total distance delta versus the previous period

## User Experience

The chart should preserve the current screen tone and spacing:

- Keep the existing hero summary above the chart.
- Keep the existing chart card structure and compact height.
- Use restrained colors that match the current statistics screen.
- Make the comparison readable without turning the chart into a dense analytics surface.
- Use the right axis only for the two cumulative trend lines.

The chart legend should identify all active encodings:

- `일별 거리` or equivalent per-period bucket distance label for bars
- `이번 누적` for the current cumulative line
- `직전 누적` for the previous cumulative line

The delta badge should describe the final total distance difference in plain Korean, for example:

- `지난주보다 +2.0 km`
- `지난달보다 -1.4 km`
- `작년보다 +24.8 km`

## Data Model

No backend API change is planned.

The frontend already receives current period chart data and previous period chart data through `useStatisticsViewModel`. The implementation should use those existing datasets to compute cumulative total distance series on the client.

The chart component needs to receive:

- Current period bar data
- Previous period comparison data
- Selected period
- Current reference date

## Comparison Rules

The trend lines compare cumulative total distance over equivalent progress positions.

- Week: compare Monday through Sunday.
- Month: compare day progression across the month.
- Year: compare January through December.

For month periods with different month lengths, map each point by relative day progression so the current and previous cumulative lines can share the same chart width. The implementation can keep this conservative by plotting each period's own dates on the same normalized 0-1 X scale.

If the previous period has no data, omit the previous cumulative line and show only the current cumulative line. The chart should still render the bars normally.

If both current and previous data are empty, keep the existing empty chart behavior.

## Component Scope

Expected affected files:

- `src/features/statistics/views/components/PeriodChart.tsx`
- `src/features/statistics/views/components/SwipeablePeriodChart.tsx`
- `src/features/statistics/views/StatisticsView.tsx`
- statistics chart tests under `src/features/statistics`

The implementation should stay inside the statistics feature. It should not change API contracts, database schema, app navigation, auth, or unrelated support/FAQ files.

## Testing Strategy

Add or update focused tests for:

- `PeriodChart` receives previous-period data and renders line paths in addition to bar paths.
- The chart keeps the compact SVG height.
- The right-axis labels are present when comparison/trend data exists.
- `StatisticsView` passes `prevChartData` into the chart comparison path.

Existing statistics screen tests should continue to pass.

## Acceptance Criteria

1. The existing bar chart remains visible as the primary distance distribution.
2. The current period cumulative total distance line is visible.
3. The previous period cumulative total distance line is visible when previous data exists.
4. A right-side Y-axis for cumulative total distance is visible.
5. The left-side Y-axis continues to serve the bar chart scale.
6. The header shows a period-aware total distance delta against the previous period.
7. The UI matches the current statistics screen tone: compact, white card, blue primary, gray secondary, no heavy decorative treatment.
8. Relevant statistics tests and lint pass.

## Risks

- Dual axes can confuse users if labels are unclear. Keep axis labels and legend short but explicit.
- Month length differences can make exact day-to-day comparison imperfect. This design compares progress across the period rather than exact calendar dates across different month lengths.
- Overdrawing bars and two lines in a compact chart can become visually dense. Use muted gray dashed styling for the previous-period line and keep stroke widths restrained.
