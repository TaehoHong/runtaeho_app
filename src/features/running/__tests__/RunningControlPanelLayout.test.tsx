/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { RunningActiveView } from '~/features/running/views/running-active';
import { RunningPausedView } from '~/features/running/views/running-paused';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockUseBottomActionOffset = jest.fn();
const mockPauseRunning = jest.fn();
const mockResumeRunning = jest.fn();
const mockEndRunning = jest.fn();

jest.mock('~/shared/hooks', () => ({
  useBottomActionOffset: (baseOffset: number) => mockUseBottomActionOffset(baseOffset),
}));

jest.mock('~/features/running/contexts', () => ({
  useRunning: () => ({
    pauseRunning: () => mockPauseRunning(),
    resumeRunning: () => mockResumeRunning(),
    endRunning: () => mockEndRunning(),
  }),
}));

jest.mock('~/features/running/views/stats-view', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    StatsView: () => React.createElement(View, { testID: 'mock-stats-view' }),
  };
});

jest.mock('~/features/running/views/components/main-distance-card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    MainDistanceCard: () => React.createElement(View, { testID: 'mock-distance-card' }),
  };
});

jest.mock('~/features/running/views/components/pause-button', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    PauseButton: () => React.createElement(View, { testID: 'mock-pause-button' }),
  };
});

jest.mock('~/features/running/views/components/play-button', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    PlayButton: () => React.createElement(View, { testID: 'mock-play-button' }),
  };
});

jest.mock('~/features/running/views/components/stop-button', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    StopButton: () => React.createElement(View, { testID: 'mock-stop-button' }),
  };
});

describe('Running control panel layout alignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBottomActionOffset.mockReturnValue(74);
  });

  it('aligns container and stats spacing between running and paused states', () => {
    renderWithProviders(
      <>
        <RunningActiveView />
        <RunningPausedView />
      </>
    );

    expect(screen.getByTestId('running-active-container')).toHaveStyle({
      flex: 1,
      paddingTop: 16,
      paddingHorizontal: 16,
    });
    expect(screen.getByTestId('running-paused-container')).toHaveStyle({
      flex: 1,
      paddingTop: 16,
      paddingHorizontal: 16,
    });
    expect(screen.getByTestId('running-active-stats-section')).toHaveStyle({ marginBottom: 16 });
    expect(screen.getByTestId('running-paused-stats-section')).toHaveStyle({ marginBottom: 16 });
  });

  it('uses absolute button layout and consistent bottom offset policy in both states', () => {
    renderWithProviders(
      <>
        <RunningActiveView />
        <RunningPausedView />
      </>
    );

    expect(screen.getByTestId('running-active-button-container')).toHaveStyle({
      position: 'absolute',
      left: 58,
      right: 58,
      justifyContent: 'space-between',
      bottom: 74,
    });
    expect(screen.getByTestId('running-paused-button-container')).toHaveStyle({
      position: 'absolute',
      left: 58,
      right: 58,
      justifyContent: 'space-between',
      bottom: 74,
    });

    expect(mockUseBottomActionOffset).toHaveBeenCalled();
    expect(mockUseBottomActionOffset.mock.calls.every(([baseOffset]) => baseOffset === 42)).toBe(true);
  });
});
