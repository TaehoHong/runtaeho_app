import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useLeagueViewModel } from '~/features/league/viewmodels/useLeagueViewModel';
import { createTestQueryClient } from '~/test-utils/queryClient';

const mockGetCurrentLeague = jest.fn();
const mockJoinLeagueMutation = jest.fn();

jest.mock('~/features/league/services', () => ({
  useGetCurrentLeague: () => mockGetCurrentLeague(),
  useJoinLeague: () => ({
    mutateAsync: () => mockJoinLeagueMutation(),
    isPending: false,
  }),
}));

describe('useLeagueViewModel', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
  );
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentLeague.mockReturnValue({
      data: null,
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: mockRefetch,
    });
    mockJoinLeagueMutation.mockResolvedValue(undefined);
  });

  it('LEAGUE-VM-001 returns not-joined state when league data is missing', () => {
    const { result } = renderHook(() => useLeagueViewModel(), { wrapper });

    expect(result.current.isNotJoined).toBe(true);
    expect(result.current.hasError).toBe(false);
    expect(result.current.hasValidData).toBe(false);
  });

  it('formats league data when current league payload exists', () => {
    mockGetCurrentLeague.mockReturnValue({
      data: {
        sessionId: 1,
        tierName: 'GOLD',
        myRank: 2,
        totalParticipants: 10,
        myDistance: 2500,
        promotionCutRank: 3,
        relegationCutRank: 8,
        remainingDays: 5,
        seasonEndDatetime: '2026-12-31T00:00:00.000Z',
        participants: [
          {
            id: 1,
            rank: 2,
            nickname: 'me',
            profileImageUrl: null,
            distance: 2500,
            isMe: true,
            isBot: false,
          },
        ],
      },
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useLeagueViewModel(), { wrapper });

    expect(result.current.hasValidData).toBe(true);
    expect(result.current.isNotJoined).toBe(false);
    expect(result.current.formattedData?.tierType).toBe('GOLD');
    expect(result.current.formattedData?.myDistanceFormatted).toBe('2.5 km');
    expect(result.current.formattedData?.myParticipant?.isMe).toBe(true);
  });

  it('LEAGUE-VM-002 sets error state when query returns error', () => {
    mockGetCurrentLeague.mockReturnValue({
      data: null,
      isLoading: false,
      isRefetching: false,
      error: new Error('league-failed'),
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useLeagueViewModel(), { wrapper });

    expect(result.current.hasError).toBe(true);
    expect(result.current.isNotJoined).toBe(false);
    expect(result.current.formattedData).toBeNull();
  });

  it('LEAGUE-VM-003 calls join mutation through handleJoinLeague', async () => {
    const { result } = renderHook(() => useLeagueViewModel(), { wrapper });

    await act(async () => {
      await result.current.handleJoinLeague();
    });

    expect(mockJoinLeagueMutation).toHaveBeenCalledTimes(1);
  });

  it('calls refetch through handleRefresh', async () => {
    const { result } = renderHook(() => useLeagueViewModel(), { wrapper });

    await act(async () => {
      await result.current.handleRefresh();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(mockJoinLeagueMutation).not.toHaveBeenCalled();
  });
});
