import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { PointFilter } from '~/features/point/models';
import { PointHistoryView } from '~/features/point/views/PointHistoryView';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockSelectFilter = jest.fn();
const mockRefreshPointHistory = jest.fn();
const mockLoadMoreHistories = jest.fn();

const mockUsePointViewModel = jest.fn();

jest.mock('~/features/point/viewmodels', () => ({
  usePointViewModel: () => mockUsePointViewModel(),
}));

const buildViewModelState = (overrides?: Record<string, unknown>) => ({
  selectedFilter: PointFilter.ALL,
  currentPoints: 1200,
  filteredPointHistory: [
    {
      id: 1,
      isPositive: true,
      title: '적립',
      point: 100,
      date: new Date('2026-01-01T10:00:00.000Z'),
      formattedPoint: '+100P',
      formattedDate: '2026.01.01 19:00',
    },
  ],
  isLoading: false,
  isLoadingMore: false,
  hasMoreData: true,
  selectFilter: (filter: PointFilter) => mockSelectFilter(filter),
  refreshPointHistory: () => mockRefreshPointHistory(),
  loadMoreHistories: () => mockLoadMoreHistories(),
  ...overrides,
});

describe('PointHistoryView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshPointHistory.mockResolvedValue(undefined);
    mockUsePointViewModel.mockReturnValue(buildViewModelState());
  });

  it('renders current point card and point history item', () => {
    renderWithProviders(<PointHistoryView onClose={jest.fn()} />);

    expect(screen.getByText('현재 보유 포인트')).toBeOnTheScreen();
    expect(screen.getByText('1,200 P')).toBeOnTheScreen();
    expect(screen.getAllByText('적립').length).toBeGreaterThan(0);
    expect(screen.queryByText('포인트 내역이 없습니다.')).not.toBeOnTheScreen();
  });

  it('changes filter when user taps earned tab', () => {
    renderWithProviders(<PointHistoryView onClose={jest.fn()} />);

    fireEvent.press(screen.getByTestId('point-filter-earned'));

    expect(mockSelectFilter).toHaveBeenCalledWith(PointFilter.EARNED);
  });

  it('POINT-SCREEN-001 shows empty state when no histories exist', () => {
    mockUsePointViewModel.mockReturnValue(
      buildViewModelState({
        filteredPointHistory: [],
      })
    );

    renderWithProviders(<PointHistoryView onClose={jest.fn()} />);

    expect(screen.getByText('포인트 내역이 없습니다.')).toBeOnTheScreen();
    expect(screen.getByTestId('point-history-list')).toBeOnTheScreen();
  });

  it('renders loading indicator state while fetching list', () => {
    mockUsePointViewModel.mockReturnValue(
      buildViewModelState({
        isLoading: true,
      })
    );

    renderWithProviders(<PointHistoryView onClose={jest.fn()} />);

    expect(screen.queryByTestId('point-history-list')).not.toBeOnTheScreen();
    expect(screen.queryByText('포인트 내역이 없습니다.')).not.toBeOnTheScreen();
  });

  it('loads more histories when list reaches the end and can load', () => {
    renderWithProviders(<PointHistoryView onClose={jest.fn()} />);

    fireEvent(screen.getByTestId('point-history-list'), 'onEndReached');

    expect(mockLoadMoreHistories).toHaveBeenCalledTimes(1);
  });

  it('POINT-SCREEN-002 does not load more when hasMoreData is false or already loading', () => {
    mockUsePointViewModel.mockReturnValue(
      buildViewModelState({
        hasMoreData: false,
      })
    );

    const { rerender } = renderWithProviders(<PointHistoryView onClose={jest.fn()} />);
    fireEvent(screen.getByTestId('point-history-list'), 'onEndReached');

    expect(mockLoadMoreHistories).not.toHaveBeenCalled();

    mockUsePointViewModel.mockReturnValue(
      buildViewModelState({
        isLoadingMore: true,
      })
    );

    rerender(<PointHistoryView onClose={jest.fn()} />);
    fireEvent(screen.getByTestId('point-history-list'), 'onEndReached');

    expect(mockLoadMoreHistories).not.toHaveBeenCalled();
  });

  it('POINT-SCREEN-003 calls refresh action from pull-to-refresh control', async () => {
    renderWithProviders(<PointHistoryView onClose={jest.fn()} />);

    const list = screen.getByTestId('point-history-list');
    const onRefresh = list.props.refreshControl.props.onRefresh as () => Promise<void>;

    await act(async () => {
      await onRefresh();
    });

    expect(mockRefreshPointHistory).toHaveBeenCalledTimes(1);
  });

  it('calls close handler when header back button is pressed', () => {
    const onClose = jest.fn();
    renderWithProviders(<PointHistoryView onClose={onClose} />);

    fireEvent.press(screen.getByTestId('point-history-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
