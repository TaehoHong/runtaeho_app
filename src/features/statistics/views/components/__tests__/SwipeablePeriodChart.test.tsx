import React from 'react';
import { Dimensions, ScrollView } from 'react-native';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Period, PeriodDirection } from '~/features/statistics/models';
import { SwipeablePeriodChart } from '~/features/statistics/views/components/SwipeablePeriodChart';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const Svg = ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement(View, { ...props, testID: 'period-chart-svg' }, children);

  return {
    __esModule: true,
    default: Svg,
    Line: View,
    Path: View,
    Text,
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Ionicons: (props: unknown) => React.createElement(View, props),
  };
});

const chartDataPoint = {
  datetime: '2026-06-22T00:00:00.000Z',
  distance: 7000,
  durationSec: 2400,
  paceSec: 0.34,
  speed: 10,
  calories: 0,
};

describe('SwipeablePeriodChart', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-25T12:00:00+09:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens trend comparison controls from an in-chart options popover', () => {
    const onTrendComparisonToggle = jest.fn();

    render(
      <SwipeablePeriodChart
        data={[chartDataPoint]}
        comparisonData={[{ ...chartDataPoint, datetime: '2026-06-15T00:00:00.000Z' }]}
        period={Period.WEEK}
        isEmpty={false}
        referenceDate={new Date('2026-06-25T00:00:00.000Z')}
        onSwipePeriodChange={jest.fn()}
        isTrendComparisonEnabled={true}
        onTrendComparisonToggle={onTrendComparisonToggle}
      />
    );

    expect(screen.getByTestId('chart-options-button')).toBeTruthy();
    expect(screen.getByTestId('chart-options-button-wrap')).toHaveStyle({
      position: 'absolute',
      top: 24,
      right: 32,
    });
    expect(screen.getByTestId('chart-options-button')).toHaveStyle({
      backgroundColor: 'transparent',
      borderWidth: 0,
      shadowOpacity: 0,
      elevation: 0,
    });
    expect(screen.queryByTestId('trend-comparison-switch')).toBeNull();
    expect(screen.queryByTestId('chart-trend-comparison-switch')).toBeNull();

    fireEvent.press(screen.getByTestId('chart-options-button'));

    expect(screen.getByTestId('chart-options-popover')).toBeTruthy();
    expect(screen.getByText('차트 옵션')).toBeTruthy();
    expect(screen.getByText('추세 비교')).toBeTruthy();
    expect(screen.queryByTestId('chart-options-backdrop')).toBeNull();

    fireEvent(screen.getByTestId('chart-trend-comparison-switch'), 'valueChange', false);

    expect(onTrendComparisonToggle).toHaveBeenCalledWith(false);
    expect(screen.getByText('지난주보다 +0.0 km')).toBeTruthy();
  });

  it('hides the external chart options button when there is no trend data', () => {
    render(
      <SwipeablePeriodChart
        data={[]}
        comparisonData={[]}
        period={Period.MONTH}
        isEmpty={true}
        referenceDate={new Date('2026-06-01T00:00:00.000Z')}
        onSwipePeriodChange={jest.fn((_direction: PeriodDirection) => undefined)}
      />
    );

    expect(screen.queryByTestId('chart-options-button')).toBeNull();
  });

  it('renders a next-period response that arrives after the current period', () => {
    const previousData: typeof chartDataPoint[] = [];
    const props = {
      data: [],
      comparisonData: previousData,
      prevData: previousData,
      period: Period.MONTH,
      isEmpty: true,
      referenceDate: new Date('2026-05-01T00:00:00+09:00'),
      nextReferenceDate: new Date('2026-06-01T00:00:00+09:00'),
      onSwipePeriodChange: jest.fn(),
    };
    const { rerender } = render(
      <SwipeablePeriodChart {...props} nextData={[]} nextIsEmpty={true} />
    );

    expect(within(screen.getAllByTestId('period-chart-svg')[2]!).queryByText('4.0')).toBeNull();

    rerender(
      <SwipeablePeriodChart
        {...props}
        data={[]}
        nextData={[{ ...chartDataPoint, datetime: '2026-06-01', distance: 1000 }]}
        nextIsEmpty={false}
      />
    );

    const nextChart = within(screen.getAllByTestId('period-chart-svg')[2]!);
    expect(nextChart.getByText('4.0')).toBeTruthy();
    expect(nextChart.getByTestId('current-cumulative-trend-line')).toBeTruthy();

    fireEvent(screen.UNSAFE_getByType(ScrollView), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: Dimensions.get('window').width * 2 } },
    });
    act(() => jest.runAllTimers());

    const currentChart = within(screen.getAllByTestId('period-chart-svg')[1]!);
    expect(currentChart.getByText('2026년 6월')).toBeTruthy();
    expect(currentChart.getByText('4.0')).toBeTruthy();
    expect(props.onSwipePeriodChange).toHaveBeenCalledWith(PeriodDirection.NEXT);
  });

  it('shows the current week after an empty past month finishes fetching', () => {
    const previousData: typeof chartDataPoint[] = [];
    const props = {
      data: [],
      comparisonData: previousData,
      prevData: previousData,
      isEmpty: true,
      onSwipePeriodChange: jest.fn(),
    };
    const { rerender } = render(
      <SwipeablePeriodChart
        {...props}
        period={Period.MONTH}
        referenceDate={new Date('2026-05-01T00:00:00+09:00')}
      />
    );
    const weekProps = {
      ...props,
      period: Period.WEEK,
      referenceDate: new Date('2026-06-25T12:00:00+09:00'),
    };

    rerender(<SwipeablePeriodChart {...weekProps} data={[]} isBackgroundFetching={true} />);

    // Keep the last chart while keepPreviousData still belongs to the old month.
    expect(within(screen.getAllByTestId('period-chart-svg')[1]!).getByText('27일~5월3일')).toBeTruthy();

    rerender(<SwipeablePeriodChart {...weekProps} data={[]} isBackgroundFetching={false} />);

    const currentChart = within(screen.getAllByTestId('period-chart-svg')[1]!);
    expect(currentChart.getByText('6월')).toBeTruthy();
    expect(currentChart.getByText('22일~28일')).toBeTruthy();
    expect(screen.getAllByTestId('period-chart-svg')).toHaveLength(2);
  });
});
