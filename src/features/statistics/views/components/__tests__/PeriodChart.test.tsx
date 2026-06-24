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
});
