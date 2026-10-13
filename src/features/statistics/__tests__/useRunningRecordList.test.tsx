import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '~/test-utils/queryClient';
import { queryKeys } from '~/services/queryClient';
import { runningService } from '~/features/running/services/runningService';
import { useRunningRecordList } from '../viewmodels/useRunningRecordList';

jest.mock('~/features/running/services/runningService', () => ({ runningService: { getRunningRecords: jest.fn() } }));
it('running invalidation refetches period lists and page sizes keep separate cache entries', async () => {
  const client = createTestQueryClient();
  const request = jest.mocked(runningService.getRunningRecords);
  request.mockResolvedValue({ content: [], hasNext: false });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const startDate = new Date('2026-01-01T00:00:00Z');
  renderHook(() => useRunningRecordList({ startDate, pageSize: 20 }), { wrapper });
  renderHook(() => useRunningRecordList({ startDate, pageSize: 30 }), { wrapper });
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  expect(request).toHaveBeenCalledWith({ startDate, size: 20 });
  expect(request).toHaveBeenCalledWith({ startDate, size: 30 });
  await act(async () => { await client.invalidateQueries({ queryKey: queryKeys.running.all }); });
  expect(request).toHaveBeenCalledTimes(4);
});
