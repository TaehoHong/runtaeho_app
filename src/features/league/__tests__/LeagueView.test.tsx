import React from 'react';
import { screen } from '@testing-library/react-native';
import { LeagueView } from '~/features/league/views/LeagueView';
import { renderWithProviders } from '~/test-utils/renderWithProviders';
import { resetAllStores } from '~/test-utils/resetState';
import { useLeagueCheckStore } from '~/stores/league/leagueCheckStore';

const mockCheckUncheckedLeagueResult = jest.fn();
const mockHandleRefresh = jest.fn();
const mockUseLeagueViewModel = jest.fn();
const mockLeagueNotJoinedView = jest.fn();
const mockLeagueHeader = jest.fn();
const mockMyRankCard = jest.fn();
const mockRankingSection = jest.fn();

jest.mock('~/features/league/hooks', () => ({
  useLeagueCheck: () => ({
    checkUncheckedLeagueResult: () => mockCheckUncheckedLeagueResult(),
  }),
}));

jest.mock('~/features/league/viewmodels', () => ({
  useLeagueViewModel: () => mockUseLeagueViewModel(),
}));

jest.mock('~/features/league/views/components/LeagueNotJoinedView', () => {
  return {
    LeagueNotJoinedView: (props: unknown) => {
      mockLeagueNotJoinedView(props);
      const React = require('react');
      const { Text } = require('react-native');
      return React.createElement(Text, null, 'league-not-joined');
    },
  };
});

jest.mock('~/features/league/views/components/LeagueHeader', () => ({
  LeagueHeader: (props: unknown) => {
    mockLeagueHeader(props);
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'league-header');
  },
}));

jest.mock('~/features/league/views/components/MyRankCard', () => ({
  MyRankCard: (props: unknown) => {
    mockMyRankCard(props);
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'my-rank-card');
  },
}));

jest.mock('~/features/league/views/components/RankingSection', () => ({
  RankingSection: (props: unknown) => {
    mockRankingSection(props);
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'ranking-section');
  },
}));

describe('LeagueView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllStores();
    useLeagueCheckStore.getState().reset();
    mockUseLeagueViewModel.mockReturnValue({
      formattedData: null,
      isLoading: false,
      isRefreshing: false,
      hasError: false,
      hasValidData: false,
      isNotJoined: true,
      error: null,
      handleRefresh: mockHandleRefresh,
    });
  });

  it('LEAGUE-SCREEN-001 renders not-joined state when user has no league data', () => {
    renderWithProviders(<LeagueView />);

    expect(screen.getByText('league-not-joined')).toBeTruthy();
    expect(mockHandleRefresh).toHaveBeenCalled();
    expect(mockCheckUncheckedLeagueResult).toHaveBeenCalled();
    expect(mockLeagueHeader).not.toHaveBeenCalled();
    expect(mockMyRankCard).not.toHaveBeenCalled();
    expect(mockRankingSection).not.toHaveBeenCalled();
  });

  it('LEAGUE-SCREEN-002 renders loading state while league data is being fetched', () => {
    mockUseLeagueViewModel.mockReturnValue({
      formattedData: null,
      isLoading: true,
      isRefreshing: false,
      hasError: false,
      hasValidData: false,
      isNotJoined: false,
      error: null,
      handleRefresh: mockHandleRefresh,
    });

    renderWithProviders(<LeagueView />);

    expect(screen.getByText('리그 정보를 불러오는 중...')).toBeTruthy();
    expect(screen.queryByText('league-not-joined')).toBeNull();
    expect(mockLeagueHeader).not.toHaveBeenCalled();
    expect(mockMyRankCard).not.toHaveBeenCalled();
    expect(mockRankingSection).not.toHaveBeenCalled();
  });

  it('LEAGUE-SCREEN-002 renders error state when league query fails with no valid data', () => {
    mockUseLeagueViewModel.mockReturnValue({
      formattedData: null,
      isLoading: false,
      isRefreshing: false,
      hasError: true,
      hasValidData: false,
      isNotJoined: false,
      error: new Error('league-error'),
      handleRefresh: mockHandleRefresh,
    });

    renderWithProviders(<LeagueView />);

    expect(screen.getByText('데이터를 불러올 수 없습니다')).toBeTruthy();
    expect(screen.getByText('league-error')).toBeTruthy();
    expect(screen.queryByText('league-not-joined')).toBeNull();
    expect(mockLeagueHeader).not.toHaveBeenCalled();
    expect(mockMyRankCard).not.toHaveBeenCalled();
    expect(mockRankingSection).not.toHaveBeenCalled();
  });

  it('LEAGUE-SCREEN-003 renders league dashboard widgets when formatted data exists', () => {
    mockUseLeagueViewModel.mockReturnValue({
      formattedData: {
        tierType: 'GOLD',
        myRank: 2,
        totalParticipants: 10,
        myDistanceFormatted: '2.5 km',
        promotionCutRank: 3,
        relegationCutRank: 8,
        promotionStatus: 'PROMOTION',
        progressPosition: 0.1,
        participants: [],
      },
      isLoading: false,
      isRefreshing: false,
      hasError: false,
      hasValidData: true,
      isNotJoined: false,
      error: null,
      handleRefresh: mockHandleRefresh,
    });

    renderWithProviders(<LeagueView />);

    expect(screen.getByText('league-header')).toBeTruthy();
    expect(screen.getByText('my-rank-card')).toBeTruthy();
    expect(screen.getByText('ranking-section')).toBeTruthy();
    expect(screen.queryByText('league-not-joined')).toBeNull();

    const headerProps = mockLeagueHeader.mock.calls[0]?.[0] as { tierType: string };
    const rankCardProps = mockMyRankCard.mock.calls[0]?.[0] as {
      myRank: number;
      totalParticipants: number;
      myDistanceFormatted: string;
      promotionCutRank: number;
      relegationCutRank: number;
      promotionStatus: string;
      progressPosition: number;
    };
    const rankingSectionProps = mockRankingSection.mock.calls[0]?.[0] as {
      participants: unknown[];
      isRefreshing: boolean;
      onRefresh: () => void;
    };

    expect(headerProps).toMatchObject({ tierType: 'GOLD' });
    expect(rankCardProps).toMatchObject({
      myRank: 2,
      totalParticipants: 10,
      myDistanceFormatted: '2.5 km',
      promotionCutRank: 3,
      relegationCutRank: 8,
      promotionStatus: 'PROMOTION',
      progressPosition: 0.1,
    });
    expect(rankingSectionProps).toMatchObject({
      participants: [],
      isRefreshing: false,
    });
    expect(typeof rankingSectionProps.onRefresh).toBe('function');
  });
});
