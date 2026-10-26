import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEndRunning } from '../services/runningQueries';
import { runningService } from '../services/runningService';
import { createRunningRecord } from '../models/RunningRecord';
import { useUserStore } from '~/stores/user/userStore';
import { isSessionCurrent } from '~/features/auth/stores/authStore';
import { queryKeys } from '~/services/queryClient';
import { createTestQueryClient } from '~/test-utils/queryClient';

jest.mock('../services/runningService', () => ({ runningService: { endRunning: jest.fn() } }));
jest.mock('~/features/auth/stores/authStore', () => ({
  getSessionSnapshot: () => ({ generation: 1, userId: 7 }),
  isSessionCurrent: jest.fn(() => true),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(isSessionCurrent).mockReturnValue(true);
  useUserStore.setState({ totalPoint: 350 });
});

it('keeps the server total balance for a duplicate and refreshes history and league queries', async () => {
  jest.mocked(runningService.endRunning).mockResolvedValue({
    id: 10, distance: 1000, durationSec: 300, cadence: 0, heartRate: 0, calorie: 0,
    point: 350, acceptanceStatus: 'DUPLICATE',
  });
  const client = createTestQueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useEndRunning(), { wrapper });

  await act(async () => { await result.current.mutateAsync(createRunningRecord(10)); });

  expect(useUserStore.getState().totalPoint).toBe(350);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.running.all });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.statistics.all });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['runningRecords'] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.league.current });
  expect(invalidate).not.toHaveBeenCalledWith({ queryKey: queryKeys.point.all });
  expect(invalidate).not.toHaveBeenCalledWith({ queryKey: queryKeys.user.all });
});

it('refreshes reward history and user queries after an accepted completion', async () => {
  jest.mocked(runningService.endRunning).mockResolvedValue({
    id: 10, distance: 1000, durationSec: 300, cadence: 0, heartRate: 0, calorie: 0,
    point: 360, acceptanceStatus: 'ACCEPTED',
  });
  const client = createTestQueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useEndRunning(), { wrapper });

  await act(async () => { await result.current.mutateAsync(createRunningRecord(10)); });

  expect(useUserStore.getState().totalPoint).toBe(360);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.point.all });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.user.all });
});

it('does not apply an old account completion balance or invalidate the new account queries', async () => {
  jest.mocked(runningService.endRunning).mockImplementationOnce(async () => {
    jest.mocked(isSessionCurrent).mockReturnValue(false);
    return { id: 10, distance: 1000, durationSec: 300, cadence: 0, heartRate: 0, calorie: 0, point: 400 };
  });
  const client = createTestQueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useEndRunning(), { wrapper });

  await act(async () => { await result.current.mutateAsync(createRunningRecord(10)); });

  expect(useUserStore.getState().totalPoint).toBe(350);
  expect(invalidate).not.toHaveBeenCalled();
});
