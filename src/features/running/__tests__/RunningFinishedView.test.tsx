import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { RunningFinishedView } from '~/features/running/views/running-finished';
import { RunningState, useAppStore } from '~/stores/app/appStore';
import { renderWithProviders } from '~/test-utils/renderWithProviders';
import { resetAllStores } from '~/test-utils/resetState';

const mockUseRunning = jest.fn();
const mockUseShoeViewModel = jest.fn();
const mockUpdateRunningRecord = jest.fn();
const mockGetCurrentLeague = jest.fn();
const mockUpdateParticipantDistance = jest.fn();
const mockRouterReplace = jest.fn();
const mockRouterPush = jest.fn();
const mockSetShareData = jest.fn();
const mockBeginEntryTransition = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  },
}));

jest.mock('~/features/running/contexts', () => ({
  useRunning: () => mockUseRunning(),
}));

jest.mock('~/features/shoes/viewmodels', () => ({
  useShoeViewModel: () => mockUseShoeViewModel(),
}));

jest.mock('~/features/running/services/runningService', () => ({
  runningService: {
    updateRunningRecord: (...args: unknown[]) => mockUpdateRunningRecord(...args),
    getRunningRecordItems: jest.fn(),
  },
}));

jest.mock('~/features/league/services/leagueService', () => ({
  leagueService: {
    getCurrentLeague: (...args: unknown[]) => mockGetCurrentLeague(...args),
    joinLeague: jest.fn(),
    updateParticipantDistance: (...args: unknown[]) => mockUpdateParticipantDistance(...args),
  },
}));

jest.mock('~/shared/hooks', () => ({
  useBottomActionOffset: () => 0,
}));

jest.mock('~/features/share/stores/shareStore', () => ({
  useShareStore: {
    getState: () => ({
      setShareData: mockSetShareData,
    }),
  },
}));

jest.mock('~/features/share/stores/shareEntryTransitionStore', () => ({
  useShareEntryTransitionStore: {
    getState: () => ({
      beginEntryTransition: mockBeginEntryTransition,
    }),
  },
}));

jest.mock('~/features/running/views/detailed-statistics-card', () => ({
  DetailedStatisticsCard: () => null,
}));

jest.mock('~/features/running/views/components/main-distance-card', () => ({
  MainDistanceCard: () => null,
}));

jest.mock('~/features/running/views/components/point-info-bar', () => ({
  PointInfoBar: () => null,
}));

jest.mock('~/features/running/views/components/share-button', () => ({
  ShareButton: ({ onPress }: { onPress: () => void }) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(
      TouchableOpacity,
      { testID: 'running-finished-share-button', onPress },
      React.createElement(Text, null, '공유')
    );
  },
}));

jest.mock('~/features/running/views/components/add-shoe-card', () => ({
  AddShoeCard: () => null,
}));

jest.mock('~/features/running/views/shoe-selection-area', () => ({
  ShoeSelectionArea: () => null,
}));

describe('RunningFinishedView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllStores();
    useAppStore.getState().setRunningState(RunningState.Finished);

    mockUseRunning.mockReturnValue({
      currentRecord: {
        id: 303,
        distance: 1500,
        steps: 2000,
        cadence: 170,
        heartRate: 145,
        calorie: 120,
        durationSec: 600,
        startTimestamp: 1735689600,
      },
      resetRunning: jest.fn(),
      distance: 1500,
      stats: {
        bpm: 145,
        calories: 120,
        pace: { minutes: 5, seconds: 0 },
      },
      elapsedTime: 600,
      formatPace: jest.fn(() => '05:00'),
      locations: [],
      currentSegmentItems: [],
    });

    mockUseShoeViewModel.mockReturnValue({
      shoes: [
        { id: 11, brand: 'Nike', model: 'Pegasus', totalDistance: 1000, isMain: true, isEnabled: true },
      ],
      mainShoe: { id: 11, brand: 'Nike', model: 'Pegasus', totalDistance: 1000, isMain: true, isEnabled: true },
      isLoadingShoes: false,
    });

    mockUpdateRunningRecord.mockResolvedValue(undefined);
    mockGetCurrentLeague.mockRejectedValue(new Error('skip league'));
  });

  it('RUN-FINISH-001 falls back to the main shoe when completing without an explicit selection', async () => {
    renderWithProviders(<RunningFinishedView />);

    fireEvent.press(screen.getByText('확인'));

    await waitFor(() => {
      expect(mockUpdateRunningRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 303,
          shoeId: 11,
        })
      );
    });
  });

  it('begins the share entry transition before navigating to the share editor', async () => {
    renderWithProviders(<RunningFinishedView />);

    fireEvent.press(screen.getByTestId('running-finished-share-button'));

    await waitFor(() => {
      expect(mockSetShareData).toHaveBeenCalledWith(expect.objectContaining({
        distance: 1500,
        durationSec: 600,
        pace: '05:00',
      }));
    });

    expect(mockBeginEntryTransition).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith('/share/editor');

    const setShareDataOrder = mockSetShareData.mock.invocationCallOrder[0] ?? 0;
    const beginTransitionOrder = mockBeginEntryTransition.mock.invocationCallOrder[0] ?? 0;
    const pushOrder = mockRouterPush.mock.invocationCallOrder[0] ?? 0;

    expect(beginTransitionOrder).toBeGreaterThan(setShareDataOrder);
    expect(pushOrder).toBeGreaterThan(beginTransitionOrder);
  });
});
