import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Period } from '~/features/statistics/models';
import { PeriodChart } from '~/features/statistics/views/components/PeriodChart';
import { PRIMARY } from '~/shared/styles';

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
  afterEach(() => {
    jest.useRealTimers();
  });

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

  it('renders cumulative trend lines and the right-axis label without explanatory legend text', () => {
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

    expect(screen.queryByText(/막대:/)).toBeNull();
    expect(screen.queryByText(/선:/)).toBeNull();
    expect(screen.queryByText('일별 거리')).toBeNull();
    expect(screen.queryByText('이번 누적')).toBeNull();
    expect(screen.queryByText('직전 누적')).toBeNull();
    expect(screen.getByText('누적 km')).toBeTruthy();
    expect(screen.getAllByTestId('period-chart-path').length).toBeGreaterThanOrEqual(4);
  });

  it('renders both cumulative trend lines as dashed paths', () => {
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

    const dashedPaths = screen
      .getAllByTestId('period-chart-path')
      .filter((path) => path.props.strokeDasharray === '6 5');

    expect(dashedPaths).toHaveLength(2);
  });

  it('keeps the comparison delta away from the right-axis unit label', () => {
    render(
      <PeriodChart
        data={[
          {
            datetime: '2026-06-22T00:00:00.000Z',
            distance: 7000,
            durationSec: 2400,
            paceSec: 0.34,
            speed: 10,
            calories: 0,
          },
        ]}
        comparisonData={[
          {
            datetime: '2026-06-15T00:00:00.000Z',
            distance: 2000,
            durationSec: 900,
            paceSec: 0.45,
            speed: 8,
            calories: 0,
          },
        ]}
        period={Period.WEEK}
        isEmpty={false}
        referenceDate={new Date('2026-06-25T00:00:00.000Z')}
      />
    );

    expect(screen.getByText('지난주보다 +5.0 km')).toHaveProp('x', 16);
    expect(screen.getByText('지난주보다 +5.0 km')).toHaveProp('textAnchor', 'start');
    expect(screen.getByText('누적 km')).toHaveProp('textAnchor', 'end');
    expect(screen.getByText('22일~28일').props.y).toBeLessThanOrEqual(
      screen.getByText('누적 km').props.y - 20
    );
    expect(screen.getByText('22일~28일').props.x).toBeLessThanOrEqual(
      screen.getByText('누적 km').props.x - 60
    );
  });

  it('extends the current period cumulative trend line to today when there are no runs today', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-25T12:00:00.000+09:00'));

    render(
      <PeriodChart
        data={[
          {
            datetime: '2026-06-22T20:13:00.000+09:00',
            distance: 6100,
            durationSec: 1985,
            paceSec: 0.33,
            speed: 10,
            calories: 0,
          },
          {
            datetime: '2026-06-24T19:34:00.000+09:00',
            distance: 20050,
            durationSec: 6713,
            paceSec: 0.33,
            speed: 10,
            calories: 0,
          },
        ]}
        comparisonData={[
          {
            datetime: '2026-06-15T20:13:00.000+09:00',
            distance: 6100,
            durationSec: 1985,
            paceSec: 0.33,
            speed: 10,
            calories: 0,
          },
        ]}
        period={Period.WEEK}
        isEmpty={false}
        referenceDate={new Date('2026-06-25T00:00:00.000+09:00')}
      />
    );

    const currentTrendPath = screen
      .getAllByTestId('period-chart-path')
      .find((path) => path.props.stroke === PRIMARY[600] && path.props.fill === 'none');

    expect(currentTrendPath?.props.d.match(/\bL\b/g)).toHaveLength(2);
  });

  it('hides trend comparison UI when trend comparison is disabled', () => {
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
        comparisonData={[
          {
            datetime: '2026-05-01T00:00:00.000Z',
            distance: 2000,
            durationSec: 900,
            paceSec: 0.45,
            speed: 8,
            calories: 0,
          },
        ]}
        showTrendComparison={false}
        period={Period.MONTH}
        isEmpty={false}
        referenceDate={new Date('2026-06-01T00:00:00.000Z')}
      />
    );

    expect(screen.queryByText('이번 누적')).toBeNull();
    expect(screen.queryByText('직전 누적')).toBeNull();
    expect(screen.queryByText('누적 km')).toBeNull();
    expect(screen.queryByText('지난달보다 +1.0 km')).toBeNull();
    expect(screen.getAllByTestId('period-chart-path')).toHaveLength(1);
  });

  it('does not render trend comparison controls inside the chart card', () => {
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
        comparisonData={[
          {
            datetime: '2026-05-01T00:00:00.000Z',
            distance: 2000,
            durationSec: 900,
            paceSec: 0.45,
            speed: 8,
            calories: 0,
          },
        ]}
        showTrendComparison={true}
        period={Period.MONTH}
        isEmpty={false}
        referenceDate={new Date('2026-06-01T00:00:00.000Z')}
      />
    );

    expect(screen.queryByTestId('trend-comparison-switch')).toBeNull();
    expect(screen.queryByText('추세')).toBeNull();
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

    expect(screen.queryByText('이번 누적')).toBeNull();
    expect(screen.queryByText('직전 누적')).toBeNull();
    expect(screen.getAllByTestId('period-chart-path').length).toBeGreaterThanOrEqual(2);
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
