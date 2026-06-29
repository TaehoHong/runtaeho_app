import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Period, PeriodDirection } from '~/features/statistics/models';
import { SwipeablePeriodChart } from '~/features/statistics/views/components/SwipeablePeriodChart';

const mockPeriodChart = jest.fn();

jest.mock('~/features/statistics/views/components/PeriodChart', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    PeriodChart: (props: unknown) => {
      mockPeriodChart(props);
      return React.createElement(View, { testID: 'period-chart-stub' });
    },
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
    mockPeriodChart.mockClear();
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
    expect(mockPeriodChart).toHaveBeenCalledWith(
      expect.objectContaining({ showTrendComparison: true })
    );
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
});
