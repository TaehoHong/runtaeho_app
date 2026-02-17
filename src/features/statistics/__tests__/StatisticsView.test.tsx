import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { Period } from '~/features/statistics/models';
import { StatisticsView } from '~/features/statistics/views/StatisticsView';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockUseStatisticsViewModel = jest.fn();

jest.mock('~/features/statistics/viewmodels', () => ({
  useStatisticsViewModel: (...args: unknown[]) => mockUseStatisticsViewModel(...args),
}));

jest.mock('~/features/statistics/views/components/StatisticsErrorBoundary', () => ({
  StatisticsErrorBoundary: ({ children }: { children: unknown }) => children,
}));

jest.mock('~/features/statistics/views/components/SwipeablePeriodChart', () => ({
  SwipeablePeriodChart: ({ onSwipePeriodChange }: { onSwipePeriodChange: (direction: number) => void }) => {
    const React = require('react');
    const { Text, TouchableOpacity, View } = require('react-native');
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, 'mock-chart'),
      React.createElement(
        TouchableOpacity,
        {
          testID: 'mock-swipe-next',
          onPress: () => onSwipePeriodChange(1),
        },
        React.createElement(Text, null, 'next')
      )
    );
  },
}));

jest.mock('~/features/statistics/views/components/RunningRecordList', () => ({
  RunningRecordList: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'mock-record-list');
  },
}));

const createViewModelResult = (overrides: Record<string, unknown> = {}) => ({
  summary: null,
  formattedSummary: null,
  chartData: [],
  formattedChartData: null,
  isLoading: false,
  isInitialLoading: false,
  isBackgroundFetching: false,
  hasError: false,
  hasValidData: false,
  error: null,
  handleRefresh: jest.fn(),
  prevChartData: [],
  nextChartData: [],
  prevReferenceDate: new Date('2026-01-01T00:00:00.000Z'),
  nextReferenceDate: new Date('2026-03-01T00:00:00.000Z'),
  prevIsEmpty: true,
  nextIsEmpty: true,
  ...overrides,
});

describe('StatisticsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStatisticsViewModel.mockImplementation(() => createViewModelResult());
  });

  it('STAT-SCREEN-001 renders empty-state summary values when there is no valid data', () => {
    renderWithProviders(<StatisticsView />);

    expect(screen.getByText('주')).toBeTruthy();
    expect(screen.getByText('월')).toBeTruthy();
    expect(screen.getByText('년')).toBeTruthy();
    expect(screen.getByText('0.00 km')).toBeTruthy();
    expect(screen.getByText('0:00"/km')).toBeTruthy();
    expect(screen.getByText('mock-record-list')).toBeTruthy();
  });

  it('renders loading state when data is not ready', () => {
    mockUseStatisticsViewModel.mockImplementation(() =>
      createViewModelResult({
        isLoading: true,
      })
    );

    renderWithProviders(<StatisticsView />);

    expect(screen.getByText('통계를 불러오는 중...')).toBeTruthy();
    expect(screen.queryByText('데이터를 불러올 수 없습니다')).toBeNull();
  });

  it('renders error state when initial loading fails', () => {
    mockUseStatisticsViewModel.mockImplementation(() =>
      createViewModelResult({
        hasError: true,
        error: new Error('network down'),
      })
    );

    renderWithProviders(<StatisticsView />);

    expect(screen.getByText('데이터를 불러올 수 없습니다')).toBeTruthy();
    expect(screen.getByText('network down')).toBeTruthy();
  });

  it('renders non-empty summary values when valid summary exists', () => {
    mockUseStatisticsViewModel.mockImplementation(() =>
      createViewModelResult({
        hasValidData: true,
        summary: {
          runCount: 3,
          totalDistance: 18500,
          averagePace: 6.2,
        },
        formattedSummary: {
          runCount: 3,
          totalDistance: 18500,
          averagePace: 5.4,
        },
      })
    );

    renderWithProviders(<StatisticsView />);

    expect(screen.getByText('18.50 km')).toBeTruthy();
    expect(screen.getByText('5:24"/km')).toBeTruthy();
  });

  it('STAT-SCREEN-002 changes period to WEEK when week tab is pressed', async () => {
    renderWithProviders(<StatisticsView />);

    fireEvent.press(screen.getByText('주'));

    await waitFor(() => {
      expect(mockUseStatisticsViewModel).toHaveBeenLastCalledWith(Period.WEEK, expect.any(Date));
    });
  });

  it('STAT-SCREEN-003 refreshes with pull-to-refresh control', async () => {
    const mockHandleRefresh = jest.fn().mockResolvedValue(undefined);
    mockUseStatisticsViewModel.mockImplementation(() =>
      createViewModelResult({
        handleRefresh: mockHandleRefresh,
      })
    );

    renderWithProviders(<StatisticsView />);
    const scrollView = screen.UNSAFE_getByType(ScrollView);
    const onRefresh = scrollView.props.refreshControl.props.onRefresh as () => Promise<void>;
    const initialCallCount = mockHandleRefresh.mock.calls.length;

    await act(async () => {
      await onRefresh();
    });

    expect(mockHandleRefresh.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('moves reference date forward when swipe callback is triggered', async () => {
    renderWithProviders(<StatisticsView />);
    const firstCallDate = mockUseStatisticsViewModel.mock.calls[0]?.[1] as Date;

    fireEvent.press(screen.getByTestId('mock-swipe-next'));

    await waitFor(() => {
      const latestCallDate = mockUseStatisticsViewModel.mock.calls.at(-1)?.[1] as Date;
      expect(latestCallDate.getTime()).toBeGreaterThan(firstCallDate.getTime());
    });
  });
});
