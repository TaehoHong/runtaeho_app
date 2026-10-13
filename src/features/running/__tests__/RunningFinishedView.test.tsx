import { useUserStore } from '~/stores/user/userStore';
import { getSessionSnapshot } from '~/features/auth/stores/authStore';
import { queryClient, queryKeys } from '~/services/queryClient';
import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { RunningFinishedView } from '~/features/running/views/running-finished';
import { RunningState, useAppStore } from '~/stores/app/appStore';
import { renderWithProviders } from '~/test-utils/renderWithProviders';
import { resetAllStores } from '~/test-utils/resetState';

const mockUseRunning = jest.fn();
const mockUseShoeViewModel = jest.fn();
const mockUpdateRunningRecord = jest.fn();
const mockAddPendingShoePatch = jest.fn();
const mockRetryPendingShoePatches = jest.fn();
const mockSerializeReplay = jest.fn();
const mockGetRunningRecordItems = jest.fn();
const mockGetCurrentLeague = jest.fn();
const mockJoinLeague = jest.fn();
const mockUpdateParticipantDistance = jest.fn();
const mockRouterReplace = jest.fn();
const mockRouterPush = jest.fn();
const mockSetShareData = jest.fn();
const mockBeginEntryTransition = jest.fn();
const mockDetailedStatisticsCard = jest.fn();
const mockMainDistanceCard = jest.fn();
const mockPointInfoBar = jest.fn();

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
    getRunningRecordItems: (...args: unknown[]) => mockGetRunningRecordItems(...args),
  },
}));

jest.mock('~/features/running/services/OfflineStorageService', () => ({
  offlineStorageService: {
    addPendingShoePatch: (...args: unknown[]) => mockAddPendingShoePatch(...args),
    retryPendingShoePatches: (...args: unknown[]) => mockRetryPendingShoePatches(...args),
    serializeReplay: (...args: unknown[]) => mockSerializeReplay(...args),
  },
}));

jest.mock('~/features/league/services/leagueService', () => ({
  leagueService: {
    getCurrentLeague: (...args: unknown[]) => mockGetCurrentLeague(...args),
    joinLeague: (...args: unknown[]) => mockJoinLeague(...args),
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
  DetailedStatisticsCard: (props: unknown) => {
    mockDetailedStatisticsCard(props);
    return null;
  },
}));

jest.mock('~/features/running/views/components/main-distance-card', () => ({
  MainDistanceCard: (props: unknown) => {
    mockMainDistanceCard(props);
    return null;
  },
}));

jest.mock('~/features/running/views/components/point-info-bar', () => ({
  PointInfoBar: (props: unknown) => {
    mockPointInfoBar(props);
    return null;
  },
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
    useUserStore.setState({ currentUser: { id: 7, nickname: 'runner', userAccounts: [], level: 1, createdAt: new Date(0) } });
    useAppStore.getState().setRunningState(RunningState.Finished);

    mockUseRunning.mockReturnValue({
      currentRecord: {
        id: 303,
        distance: 2000,
        steps: 2000,
        cadence: 170,
        heartRate: 145,
        calorie: 120,
        durationSec: 600,
        startTimestamp: 1735689600,
      },
      resetRunning: jest.fn(),
      distance: 2000,
      stats: {
        bpm: 145,
        calories: 120,
        pace: { minutes: 5, seconds: 0 },
      },
      elapsedTime: 600,
      formatPace: jest.fn((minutes: number, seconds: number) => (
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )),
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
    mockAddPendingShoePatch.mockResolvedValue(undefined);
    mockRetryPendingShoePatches.mockResolvedValue(undefined);
    mockSerializeReplay.mockImplementation((action: () => Promise<void>) => action());
    mockGetRunningRecordItems.mockResolvedValue([]);
    mockGetCurrentLeague.mockRejectedValue(new Error('skip league'));
  });

  it('RUN-FINISH-001 falls back to the main shoe when completing without an explicit selection', async () => {
    renderWithProviders(<RunningFinishedView />);

    fireEvent.press(screen.getByText('확인'));

    await waitFor(() => {
      expect(mockAddPendingShoePatch).toHaveBeenCalledWith(303, 11, getSessionSnapshot());
      expect(mockSerializeReplay).toHaveBeenCalledTimes(1);
      expect(mockRetryPendingShoePatches).toHaveBeenCalledWith(getSessionSnapshot());
      expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/league');
    });
  });

  it('keeps the rank captured before completion when confirming an already updated league', async () => {
    useAppStore.getState().setLeagueBeforeRunningEnd({ sessionId: 1, rank: 8 });
    mockGetCurrentLeague.mockResolvedValue({ sessionId: 1, participants: [{ id: 11, rank: 3, isMe: true }] });
    mockUpdateParticipantDistance.mockResolvedValue(undefined);
    renderWithProviders(<RunningFinishedView />);

    expect(useAppStore.getState().previousLeagueRank).toBeNull();

    fireEvent.press(screen.getByText('확인'));

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/league');
    });
    expect(useAppStore.getState().previousLeagueRank).toBe(8);
    expect(useAppStore.getState().leagueBeforeRunningEnd).toBeNull();
    expect(useAppStore.getState().runningState).toBe(RunningState.Stopped);
  });

  it('does not animate a previous-season rank when the user confirms after the season changes', async () => {
    useAppStore.getState().setLeagueBeforeRunningEnd({ sessionId: 1, rank: 8 });
    mockGetCurrentLeague.mockResolvedValue({ sessionId: 2, participants: [{ id: 12, rank: 3, isMe: true }] });
    mockUpdateParticipantDistance.mockResolvedValue(undefined);
    renderWithProviders(<RunningFinishedView />);

    fireEvent.press(screen.getByText('확인'));

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/league');
    });
    expect(useAppStore.getState().previousLeagueRank).toBeNull();
    expect(useAppStore.getState().leagueBeforeRunningEnd).toBeNull();
  });

  it('begins the share entry transition before navigating to the share editor', async () => {
    renderWithProviders(<RunningFinishedView />);

    fireEvent.press(screen.getByTestId('running-finished-share-button'));

    await waitFor(() => {
      expect(mockSetShareData).toHaveBeenCalledWith(expect.objectContaining({
        distance: 2000,
        durationSec: 600,
        pace: '5\'00"/km',
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

  it('prefers finalized record data over live stats when preparing the finished-screen summary', async () => {
    mockUseRunning.mockReturnValue({
      currentRecord: {
        id: 303,
        distance: 2000,
        steps: 2000,
        cadence: 170,
        heartRate: 152,
        calorie: 120,
        durationSec: 600,
        startTimestamp: 1735689600,
      },
      resetRunning: jest.fn(),
      distance: 1200,
      stats: {
        bpm: 99,
        calories: 120,
        pace: { minutes: 0, seconds: 0 },
      },
      elapsedTime: 420,
      formatPace: jest.fn((minutes: number, seconds: number) => (
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )),
      locations: [],
      currentSegmentItems: [],
    });

    renderWithProviders(<RunningFinishedView />);

    expect(mockPointInfoBar).toHaveBeenCalledWith(expect.objectContaining({
      earnedPoints: 20,
    }));
    expect(mockDetailedStatisticsCard).toHaveBeenCalledWith(expect.objectContaining({
      distanceMeters: 2000,
      durationSec: 600,
      heartRate: 152,
    }));
    expect(mockMainDistanceCard).toHaveBeenCalledWith(expect.objectContaining({
      distanceMeters: 2000,
    }));

    fireEvent.press(screen.getByTestId('running-finished-share-button'));

    await waitFor(() => {
      expect(mockSetShareData).toHaveBeenCalledWith(expect.objectContaining({
        distance: 2000,
        durationSec: 600,
        pace: '5\'00"/km',
        earnedPoints: 20,
        startTimestamp: '2025-01-01T00:00:00.000Z',
      }));
    });
  });
  it('navigates after shoe selection is durable without waiting for replay', async () => {
    let finishReplay!: () => void;
    mockRetryPendingShoePatches.mockImplementationOnce(() => new Promise<void>((resolve) => { finishReplay = resolve; }));
    renderWithProviders(<RunningFinishedView />);
    fireEvent.press(screen.getByText('확인'));
    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/league'));
    expect(mockAddPendingShoePatch).toHaveBeenCalledWith(303, 11, getSessionSnapshot());
    expect(mockRetryPendingShoePatches).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace.mock.invocationCallOrder[0]).toBeGreaterThan(mockAddPendingShoePatch.mock.invocationCallOrder[0]!);
    await act(async () => finishReplay());
  });

  it('keeps the finished screen and allows retry when durable shoe selection fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    try {
      mockAddPendingShoePatch.mockRejectedValueOnce(new Error('storage unavailable'));
      renderWithProviders(<RunningFinishedView />);
      fireEvent.press(screen.getByText('확인'));
      await waitFor(() => expect(alert).toHaveBeenCalled());
      expect(mockRouterReplace).not.toHaveBeenCalled();
      expect(mockRetryPendingShoePatches).not.toHaveBeenCalled();
      expect(useAppStore.getState().runningState).toBe(RunningState.Finished);
      fireEvent.press(screen.getByText('확인'));
      await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/league'));
      expect(mockAddPendingShoePatch).toHaveBeenCalledTimes(2);
    } finally {
      alert.mockRestore();
    }
  });

  it.each([false, true])('refreshes the league after deferred joining only for the same session (switched=%s)', async (switched) => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    let finishJoin!: () => void;
    mockGetCurrentLeague.mockResolvedValueOnce(null).mockResolvedValue({ sessionId: 1, participants: [{ id: 11, rank: 3, isMe: true }] });
    mockJoinLeague.mockImplementationOnce(() => new Promise<void>((resolve) => { finishJoin = resolve; }));
    try {
      renderWithProviders(<RunningFinishedView />);
      fireEvent.press(screen.getByText('확인'));
      await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/league'));
      expect(mockJoinLeague).toHaveBeenCalledTimes(1);
      expect(invalidate).not.toHaveBeenCalled();
      if (switched) {
        useUserStore.setState({ currentUser: { id: 8, nickname: 'other runner', userAccounts: [], level: 1, createdAt: new Date(0) } });
      }
      await act(async () => finishJoin());
      if (switched) {
        expect(invalidate).not.toHaveBeenCalled();
        expect(mockUpdateParticipantDistance).not.toHaveBeenCalled();
      } else {
        expect(mockUpdateParticipantDistance).toHaveBeenCalledWith(11, 2000);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.league.current });
      }
    } finally {
      invalidate.mockRestore();
    }
  });

});
