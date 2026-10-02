import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { RunningActiveView } from '../views/running-active';
import { RunningPausedView } from '../views/running-paused';
import { RunningState, useAppStore } from '~/stores/app/appStore';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockEndRunning = jest.fn();
const mockResumeRunning = jest.fn();
let mockCurrentRecord: { endTimestamp?: number } | null = null;

jest.mock('~/features/running/contexts', () => ({
  useRunning: () => ({
    currentRecord: mockCurrentRecord,
    pauseRunning: jest.fn(),
    resumeRunning: mockResumeRunning,
    endRunning: mockEndRunning,
  }),
}));

jest.mock('~/shared/hooks', () => ({ useBottomActionOffset: () => 74 }));
jest.mock('~/features/running/views/stats-view', () => ({ StatsView: () => null }));
jest.mock('~/features/running/views/components/main-distance-card', () => ({ MainDistanceCard: () => null }));

jest.mock('~/features/running/views/components/stop-button', () => ({
  StopButton: ({ onPress }: { onPress: () => void }) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(TouchableOpacity, { onPress }, React.createElement(Text, null, '종료'));
  },
}));

jest.mock('~/features/running/views/components/play-button', () => ({
  PlayButton: ({ onPress }: { onPress: () => void }) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(TouchableOpacity, { onPress }, React.createElement(Text, null, '이어 달리기'));
  },
}));

describe('running end recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetAppState();
    mockCurrentRecord = null;
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => { jest.restoreAllMocks(); });

  it.each([
    { name: 'running', View: RunningActiveView, state: RunningState.Running },
    { name: 'paused', View: RunningPausedView, state: RunningState.Paused },
  ])('keeps $name unsaved after a save error and completes only after a successful retry', async ({ View, state }) => {
    useAppStore.getState().setRunningState(state);
    mockEndRunning.mockImplementationOnce(async () => {
      useAppStore.getState().setRunningState(RunningState.Paused);
      throw new Error('storage-write-failed');
    });
    renderWithProviders(<View />);

    fireEvent.press(screen.getByText('종료'));

    await waitFor(() => { expect(Alert.alert).toHaveBeenCalledWith('저장 실패', expect.any(String)); });
    expect(useAppStore.getState().runningState).toBe(RunningState.Paused);

    mockEndRunning.mockImplementationOnce(async () => {
      useAppStore.getState().setRunningState(RunningState.Finished);
      return null;
    });
    fireEvent.press(screen.getByText('종료'));

    await waitFor(() => { expect(useAppStore.getState().runningState).toBe(RunningState.Finished); });
  });

  it('does not offer resume after a finalized record failed to save', () => {
    mockCurrentRecord = { endTimestamp: 1736091000 };
    renderWithProviders(<RunningPausedView />);

    expect(screen.queryByText('이어 달리기')).toBeNull();
    expect(screen.getByText('종료')).toBeTruthy();
  });

  it('still offers resume for an ordinary paused run', () => {
    mockCurrentRecord = {};
    renderWithProviders(<RunningPausedView />);

    fireEvent.press(screen.getByText('이어 달리기'));

    expect(mockResumeRunning).toHaveBeenCalledTimes(1);
  });
});
