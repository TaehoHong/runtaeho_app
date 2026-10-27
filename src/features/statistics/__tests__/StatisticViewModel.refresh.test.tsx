import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '~/test-utils/queryClient';
import type { RunningRecord } from '~/features/running/models';
import { runningService } from '~/features/running/services/runningService';
import { Period, type StatisticsSummary } from '../models';
import { statisticsService } from '../services/statisticsService';
import { useStatisticsViewModel } from '../viewmodels/StatisticViewModel';
import { useRunningRecordList } from '../viewmodels/useRunningRecordList';

jest.mock('~/features/running/services/runningService', () => ({
  runningService: { getRunningRecords: jest.fn() },
}));

jest.mock('~/features/statistics/services/statisticsService', () => ({
  statisticsService: { getStatisticsSummary: jest.fn() },
}));

it('refreshes summary and cached records after an external import without Health uploads', async () => {
  const oldRecord: RunningRecord = {
    id: 101,
    distance: 1000,
    durationSec: 300,
    steps: null,
    cadence: null,
    heartRate: null,
    calorie: 60,
    startTimestamp: 1768000000,
  };
  const newerRecord: RunningRecord = {
    ...oldRecord,
    id: 102,
    distance: 1500,
    durationSec: 450,
    startTimestamp: 1768100000,
  };
  let serverRecords: RunningRecord[] = [oldRecord];
  let serverSummary: StatisticsSummary = {
    statisticType: Period.MONTH,
    chartData: [],
    runningCount: 1,
    totalDistance: 1000,
    totalDurationSec: 300,
    averageDistance: 1000,
    averagePaceSec: 0.3,
  };
  const recordsRequest = jest.mocked(runningService.getRunningRecords);
  recordsRequest.mockImplementation(async () => ({ content: serverRecords, hasNext: false }));
  jest.mocked(statisticsService.getStatisticsSummary).mockImplementation(async () => serverSummary);

  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const referenceDate = new Date(2026, 0, 15);
  const { result, unmount } = renderHook(() => {
    const statistics = useStatisticsViewModel(Period.MONTH, referenceDate);
    const list = useRunningRecordList({
      startDate: statistics.currentPeriodRange.startDate,
      endDate: statistics.currentPeriodRange.endDate,
      pageSize: 7,
    });
    return { statistics, list };
  }, { wrapper });

  await waitFor(() => {
    expect(result.current.statistics.summary?.totalDistance).toBe(1000);
    expect(result.current.list.records.map((record) => record.id)).toEqual([101]);
  });
  const initialListFilters = recordsRequest.mock.calls[0]![0];

  serverRecords = [newerRecord, oldRecord];
  serverSummary = {
    ...serverSummary,
    runningCount: 2,
    totalDistance: 2500,
    totalDurationSec: 750,
    averageDistance: 1250,
  };
  await act(async () => { await result.current.statistics.handleRefresh(); });

  await waitFor(() => {
    expect(result.current.statistics.summary?.totalDistance).toBe(2500);
    expect(result.current.statistics.summary?.runningCount).toBe(2);
    expect(result.current.list.records.map((record) => record.id)).toEqual([102, 101]);
  });
  expect(recordsRequest).toHaveBeenLastCalledWith(initialListFilters);
  expect(initialListFilters.size).toBe(7);
  unmount();
  client.clear();
});
