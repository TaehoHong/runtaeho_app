import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '~/test-utils/queryClient';
import { PointFilter, type PointHistory, type PointHistoryRequest } from '~/features/point/models';
import { pointService } from '~/features/point/services/pointService';
import { usePointViewModel, usePointFilterViewModel, usePointHistoryItemViewModel } from '~/features/point/viewmodels/PointViewModel';

jest.mock('~/features/point/services/pointService', () => ({ pointService: { getPointHistories: jest.fn(), refreshUserPoint: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('~/stores/user/userStore', () => ({ useUserStore: (selector: (state: { totalPoint: number }) => number) => selector({ totalPoint: 1200 }) }));
const history = (id: number, point = 10): PointHistory => ({ id, point, pointType: 'test', createdTimestamp: 1760000000 });
const request = jest.mocked(pointService.getPointHistories);
const setup = () => {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => usePointViewModel(), { wrapper });
};

describe('point history pagination', () => {
  beforeEach(() => jest.clearAllMocks());
  it('continues from recent cursor and then advances to the next page without duplicate IDs', async () => {
    request.mockImplementation(async (params: PointHistoryRequest) => {
      if (params.startCreatedTimestamp !== undefined) return { content: [history(100)], cursor: 100, hasNext: true };
      if (params.cursor === 100) return { content: [history(99)], cursor: 99, hasNext: true };
      return { content: [history(99), history(98)], cursor: 98, hasNext: false };
    });
    const { result } = setup();
    await waitFor(() => expect(result.current.filteredPointHistory.map(item => item.id)).toEqual([100, 99]));
    await act(async () => { await result.current.loadMoreHistories(); });
    await waitFor(() => expect(result.current.filteredPointHistory.map(item => item.id)).toEqual([100, 99, 98]));
    expect(result.current.hasMoreData).toBe(false);
  });
  it('loads past history when recent history is empty', async () => {
    request.mockImplementation(async params => params.startCreatedTimestamp !== undefined
      ? { content: [], hasNext: false }
      : { content: [history(9)], cursor: 9, hasNext: false });
    const { result } = setup();
    await waitFor(() => expect(result.current.filteredPointHistory.map(item => item.id)).toEqual([9]));
  });
  it('refreshes recent and paginated history without duplicating an unchanged cursor', async () => {
    request.mockImplementation(async params => params.startCreatedTimestamp !== undefined
      ? { content: [history(100)], cursor: 100, hasNext: true }
      : { content: [history(99)], cursor: 99, hasNext: false });
    const { result } = setup();
    await waitFor(() => expect(result.current.filteredPointHistory.map(item => item.id)).toEqual([100, 99]));
    await act(async () => { await result.current.refreshPointHistory(); });
    expect(result.current.filteredPointHistory.map(item => item.id)).toEqual([100, 99]);
  });
  it('exposes recent request errors without attempting past history', async () => {
    request.mockRejectedValue(new Error('request-failed'));
    const { result } = setup();
    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.recentError?.message).toBe('request-failed');
    expect(result.current.filteredPointHistory).toEqual([]);
  });
  it('starts each filter at the recent cursor instead of the previous filter page', async () => {
    request.mockImplementation(async params => {
      if (params.startCreatedTimestamp !== undefined) return { content: [history(100)], cursor: 100, hasNext: true };
      if (params.isEarned === false) return { content: [history(99, -10)], cursor: 99, hasNext: false };
      return { content: [history(98)], cursor: 98, hasNext: false };
    });
    const { result } = setup();
    await waitFor(() => expect(result.current.olderHistories).toHaveLength(1));
    act(() => result.current.selectFilter(PointFilter.SPENT));
    await waitFor(() => expect(result.current.filteredPointHistory.map(item => item.id)).toEqual([99]));
    expect(request).toHaveBeenCalledWith({ cursor: 100, isEarned: false, size: 30 });
  });
});

describe('point viewmodel helpers' , () => {
  it('maps item view model and validates positive constraints', () => {
    const { result: validResult } = renderHook(() =>
      usePointHistoryItemViewModel({
        id: 1,
        point: 100,
        pointType: '적립',
        createdTimestamp: 1760000000,
      })
    );

    const { result: invalidResult } = renderHook(() =>
      usePointHistoryItemViewModel({
        id: 0,
        point: 0,
        pointType: '무효',
        createdTimestamp: 1760000000,
      })
    );

    expect(validResult.current.isValid).toBe(true);
    expect(validResult.current.formattedPoint).toBe('+100P');
    expect(invalidResult.current.isValid).toBe(false);
  });

  it('handles point filter dropdown state transitions', () => {
    const { result } = renderHook(() => usePointFilterViewModel());

    expect(result.current.isAllFilter).toBe(true);
    expect(result.current.showDropdown).toBe(false);

    act(() => {
      result.current.toggleDropdown();
    });
    expect(result.current.showDropdown).toBe(true);

    act(() => {
      result.current.selectFilter(PointFilter.EARNED);
    });

    expect(result.current.selectedFilter).toBe(PointFilter.EARNED);
    expect(result.current.isEarnedFilter).toBe(true);
    expect(result.current.isSpentFilter).toBe(false);
    expect(result.current.showDropdown).toBe(false);

    act(() => {
      result.current.toggleDropdown();
      result.current.closeDropdown();
    });

    expect(result.current.showDropdown).toBe(false);
  });
});
