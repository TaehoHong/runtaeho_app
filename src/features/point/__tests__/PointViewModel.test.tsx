import { act, renderHook, waitFor } from '@testing-library/react-native';
import { PointFilter, type PointHistory } from '~/features/point/models';
import {
  usePointFilterViewModel,
  usePointHistoryItemViewModel,
  usePointViewModel,
} from '~/features/point/viewmodels/PointViewModel';

const mockUseGetRecentPointHistories = jest.fn();
const mockUseGetPointHistories = jest.fn();
const mockUseUserStore = jest.fn();

jest.mock('~/features/point/services', () => ({
  useGetRecentPointHistories: (...args: unknown[]) => mockUseGetRecentPointHistories(...args),
  useGetPointHistories: (...args: unknown[]) => mockUseGetPointHistories(...args),
}));

jest.mock('~/stores/user/userStore', () => ({
  useUserStore: (selector: (state: { totalPoint: number }) => number) => mockUseUserStore(selector),
}));

const createHistory = (overrides?: Partial<PointHistory>): PointHistory => ({
  id: 1,
  point: 100,
  pointType: '적립',
  createdTimestamp: 1760000000,
  ...overrides,
});

describe('usePointViewModel', () => {
  const mockRefetchRecent = jest.fn();
  const mockRefetchOlder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserStore.mockImplementation((selector: (state: { totalPoint: number }) => number) =>
      selector({ totalPoint: 1200 })
    );

    mockUseGetRecentPointHistories.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      refetch: mockRefetchRecent,
    });

    mockUseGetPointHistories.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetchOlder,
    });
  });

  it('POINT-VM-001 maps recent histories and supports earned filter selection', async () => {
    mockUseGetRecentPointHistories.mockReturnValue({
      data: {
        content: [
          createHistory({ id: 10, point: 120, pointType: '러닝 보상' }),
          createHistory({ id: 9, point: -30, pointType: '아이템 구매' }),
        ],
        cursor: 9,
        hasNext: true,
      },
      error: null,
      isLoading: false,
      refetch: mockRefetchRecent,
    });

    const { result } = renderHook(() => usePointViewModel());

    await waitFor(() => {
      expect(result.current.filteredPointHistory).toHaveLength(2);
    });

    expect(result.current.currentPoints).toBe(1200);
    expect(result.current.hasError).toBe(false);
    expect(result.current.totalHistoryCount).toBe(2);

    act(() => {
      result.current.selectFilter(PointFilter.EARNED);
    });

    expect(result.current.filteredPointHistory).toHaveLength(1);
    expect(result.current.filteredPointHistory[0].isPositive).toBe(true);
    expect(mockRefetchOlder).not.toHaveBeenCalled();
  });

  it('POINT-VM-002 reloads older histories when filter changes after pagination data exists', async () => {
    mockUseGetRecentPointHistories.mockReturnValue({
      data: {
        content: [createHistory({ id: 101, point: 200 })],
        cursor: 50,
        hasNext: true,
      },
      error: null,
      isLoading: false,
      refetch: mockRefetchRecent,
    });

    mockUseGetPointHistories.mockReturnValue({
      data: {
        content: [createHistory({ id: 49, point: -70, pointType: '사용' })],
        cursor: 30,
        hasNext: true,
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetchOlder,
    });

    const { result } = renderHook(() => usePointViewModel());

    await waitFor(() => {
      expect(result.current.olderHistories).toHaveLength(1);
    });

    act(() => {
      result.current.selectFilter(PointFilter.SPENT);
    });

    await waitFor(() => {
      expect(result.current.olderHistories).toHaveLength(0);
    });

    expect(mockRefetchOlder).toHaveBeenCalledTimes(1);
    expect(result.current.showFilterDropdown).toBe(false);

    act(() => {
      result.current.selectFilter(PointFilter.SPENT);
    });

    expect(mockRefetchOlder).toHaveBeenCalledTimes(1);
  });

  it('POINT-VM-003 refreshes recent histories and resets cursor when response has no data', async () => {
    mockUseGetRecentPointHistories.mockReturnValue({
      data: {
        content: [createHistory({ id: 10, point: 90 })],
        cursor: 10,
        hasNext: true,
      },
      error: null,
      isLoading: false,
      refetch: mockRefetchRecent,
    });

    mockRefetchRecent.mockResolvedValueOnce({ data: undefined });
    const { result } = renderHook(() => usePointViewModel());

    await waitFor(() => {
      expect(result.current.filteredPointHistory).toHaveLength(1);
    });

    await act(async () => {
      await result.current.refreshPointHistory();
    });

    expect(result.current.filteredPointHistory).toHaveLength(0);

    await act(async () => {
      await result.current.loadMoreHistories();
    });

    expect(mockRefetchOlder).not.toHaveBeenCalled();
  });

  it('loads more histories when cursor exists and exposes loading flags', async () => {
    mockUseGetRecentPointHistories.mockReturnValue({
      data: {
        content: [createHistory({ id: 20, point: 10 })],
        cursor: 20,
        hasNext: true,
      },
      error: null,
      isLoading: true,
      refetch: mockRefetchRecent,
    });

    mockUseGetPointHistories.mockReturnValue({
      data: {
        content: [createHistory({ id: 19, point: -10 })],
        cursor: 10,
        hasNext: true,
      },
      error: new Error('older-failed'),
      isLoading: false,
      isFetching: true,
      refetch: mockRefetchOlder,
    });

    const { result } = renderHook(() => usePointViewModel());

    await waitFor(() => {
      expect(result.current.olderHistories).toHaveLength(1);
    });

    await act(async () => {
      await result.current.loadMoreHistories();
    });

    expect(mockRefetchOlder).toHaveBeenCalledTimes(1);
    expect(result.current.hasError).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLoadingMore).toBe(true);
    expect(result.current.hasMoreData).toBe(true);
    expect(result.current.canLoadMore).toBe(true);
  });

  it('uses override point value and logs debug state safely', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const { result, rerender } = renderHook(({ pointOverride }) => usePointViewModel(pointOverride), {
      initialProps: { pointOverride: undefined as number | undefined },
    });

    expect(result.current.currentPoints).toBe(1200);

    rerender({ pointOverride: 7777 });

    expect(result.current.currentPoints).toBe(7777);

    act(() => {
      result.current.debugLoadingState();
      result.current.toggleDropdown();
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(result.current.showFilterDropdown).toBe(true);
    consoleSpy.mockRestore();
  });
});

describe('point viewmodel helpers', () => {
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
