import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '~/services/queryClient';
import { createTestQueryClient } from '~/test-utils/queryClient';
import {
  useConfirmResult,
  useGetCurrentLeague,
  useGetUncheckedResult,
  useJoinLeague,
} from '~/features/league/services/leagueQueries';
import { leagueService } from '~/features/league/services/leagueService';

jest.mock('~/features/league/services/leagueService', () => ({
  leagueService: {
    getCurrentLeague: jest.fn(),
    getUncheckedResult: jest.fn(),
    joinLeague: jest.fn(),
    confirmResult: jest.fn(),
  },
}));

const mockLeagueService = leagueService as jest.Mocked<typeof leagueService>;

describe('leagueQueries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('LEAGUE-QUERY-001 fetches current league data when enabled', async () => {
    mockLeagueService.getCurrentLeague.mockResolvedValue({
      sessionId: 1,
      tierName: 'GOLD',
      myRank: 2,
      totalParticipants: 10,
      myDistance: 3000,
      promotionCutRank: 3,
      relegationCutRank: 8,
      remainingDays: 5,
      seasonEndDatetime: '2026-12-31T00:00:00.000Z',
      participants: [],
    });
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useGetCurrentLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockLeagueService.getCurrentLeague).toHaveBeenCalledTimes(1);
    expect(result.current.data?.tierName).toBe('GOLD');
  });

  it('LEAGUE-QUERY-002 does not fetch unchecked result when query is disabled', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useGetUncheckedResult({ enabled: false }), { wrapper });

    await waitFor(() => {
      expect(mockLeagueService.getUncheckedResult).not.toHaveBeenCalled();
    });
  });

  it('LEAGUE-QUERY-003 invalidates league queries after successful join mutation', async () => {
    mockLeagueService.joinLeague.mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useJoinLeague(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockLeagueService.joinLeague).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.league.all });
  });

  it('clears unchecked result cache and refreshes current league on confirm', async () => {
    mockLeagueService.confirmResult.mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useConfirmResult(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockLeagueService.confirmResult).toHaveBeenCalledTimes(1);
    expect(setQueryDataSpy).toHaveBeenCalledWith(queryKeys.league.result, null);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.league.current });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: queryKeys.league.profile });
  });
});
