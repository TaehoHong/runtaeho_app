import { renderHook } from '@testing-library/react-native';
import { keepPreviousData } from '@tanstack/react-query';
import { Period } from '~/features/statistics/models';
import { useGetStatisticsSummary } from '~/features/statistics/services/statisticsQueries';
import { statisticsService } from '~/features/statistics/services/statisticsService';
import { queryKeys } from '~/services/queryClient';

const mockUseQuery = jest.fn();

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: (options: unknown) => mockUseQuery(options),
  };
});

jest.mock('~/features/statistics/services/statisticsService', () => ({
  statisticsService: {
    getStatisticsSummary: jest.fn(),
  },
}));

describe('useGetStatisticsSummary', () => {
  const startDateTime = new Date('2026-01-01T00:00:00.000Z');
  const endDateTime = new Date('2026-01-31T23:59:59.000Z');

  const renderSummaryHook = (enabled = false) =>
    renderHook(() =>
      useGetStatisticsSummary(
        {
          startDateTime,
          endDateTime,
          statisticType: Period.MONTH,
        },
        { enabled }
      )
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  const getLastQueryOptions = () =>
    mockUseQuery.mock.calls[0]?.[0] as {
      queryKey: readonly unknown[];
      enabled: boolean;
      placeholderData: unknown;
      queryFn: () => Promise<unknown>;
    };

  it('STAT-QUERY-001 builds stable query key with ISO dates', () => {
    renderSummaryHook();

    const queryOptions = getLastQueryOptions();

    expect(queryOptions.queryKey).toEqual(
      queryKeys.statistics.summary(
        Period.MONTH,
        startDateTime.toISOString(),
        endDateTime.toISOString()
      )
    );
  });

  it('STAT-QUERY-002 forwards enabled and placeholder options', () => {
    renderSummaryHook();

    const queryOptions = getLastQueryOptions();

    expect(queryOptions.enabled).toBe(false);
    expect(queryOptions.placeholderData).toBe(keepPreviousData);
  });

  it('STAT-QUERY-003 forwards original params to service via queryFn', async () => {
    renderSummaryHook();

    const queryOptions = getLastQueryOptions();

    (statisticsService.getStatisticsSummary as jest.Mock).mockResolvedValueOnce({});
    await queryOptions.queryFn();

    expect(statisticsService.getStatisticsSummary).toHaveBeenCalledWith({
      startDateTime,
      endDateTime,
      statisticType: Period.MONTH,
    });
  });
});
