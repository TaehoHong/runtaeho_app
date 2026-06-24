import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Period } from '~/features/statistics/models';
import { PeriodChart } from '~/features/statistics/views/components/PeriodChart';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const createMock = (testID: string, Component = View) => {
    const MockComponent = ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(Component, { ...props, testID }, children);

    MockComponent.displayName = `Mock${testID}`;
    return MockComponent;
  };

  return {
    __esModule: true,
    default: createMock('period-chart-svg'),
    Svg: createMock('period-chart-svg'),
    Line: createMock('period-chart-line'),
    Path: createMock('period-chart-path'),
    Circle: createMock('period-chart-circle'),
    Text: createMock('period-chart-text', Text),
  };
});

describe('PeriodChart', () => {
  it('renders the chart at the compact statistics height', () => {
    render(
      <PeriodChart
        data={[]}
        period={Period.MONTH}
        isEmpty={true}
        referenceDate={new Date('2026-06-01T00:00:00.000Z')}
      />
    );

    expect(screen.getByTestId('period-chart-svg')).toHaveProp('height', 210);
  });

  it('keeps trend comparison UI hidden when current and comparison data are empty', () => {
    render(
      <PeriodChart
        data={[]}
        comparisonData={[]}
        period={Period.MONTH}
        isEmpty={true}
        referenceDate={new Date('2026-06-01T00:00:00.000Z')}
      />
    );

    expect(screen.queryByText('이번 누적')).toBeNull();
    expect(screen.queryByText('직전 누적')).toBeNull();
    expect(screen.queryByText('누적 km')).toBeNull();
  });

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
});
