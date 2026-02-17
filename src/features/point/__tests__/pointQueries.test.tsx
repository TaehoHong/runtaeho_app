import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useGetPointHistories,
  useGetRecentPointHistories,
  useGetUserPoint,
  useInfinitePointHistories,
} from '~/features/point/services/pointQueries';
import { pointService } from '~/features/point/services/pointService';
import { createTestQueryClient } from '~/test-utils/queryClient';

jest.mock('~/features/point/services/pointService', () => ({
  pointService: {
    getPointHistories: jest.fn(),
    getUserPoint: jest.fn(),
  },
}));

describe('useGetPointHistories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POINT-QUERY-001 does not call API when skip option is true', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useGetPointHistories(
          {
            size: 20,
          },
          { skip: true }
        ),
      { wrapper }
    );

    expect(pointService.getPointHistories).not.toHaveBeenCalled();
  });

  it('does not call API when enabled option is false', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useGetPointHistories(
          {
            size: 20,
          },
          { enabled: false }
        ),
      { wrapper }
    );

    expect(pointService.getPointHistories).not.toHaveBeenCalled();
  });

  it('calls API with given params when enabled', async () => {
    (pointService.getPointHistories as jest.Mock).mockResolvedValue({
      content: [{ id: 1, point: 100, pointType: '적립', createdTimestamp: 1700000000 }],
      cursor: 1,
      hasNext: false,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useGetPointHistories({
          cursor: 1,
          isEarned: true,
          size: 10,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data?.content).toHaveLength(1);
    });

    expect(pointService.getPointHistories).toHaveBeenCalledWith({
      cursor: 1,
      isEarned: true,
      size: 10,
    });
  });

  it('POINT-QUERY-002 merges paginated point history pages with infinite query', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    (pointService.getPointHistories as jest.Mock)
      .mockResolvedValueOnce({
        content: [
          { id: 101, point: 100, pointType: '적립', createdTimestamp: 1700000000 },
        ],
        cursor: 90,
        hasNext: true,
      })
      .mockResolvedValueOnce({
        content: [
          { id: 90, point: -50, pointType: '사용', createdTimestamp: 1699990000 },
        ],
        cursor: undefined,
        hasNext: false,
      });

    const { result } = renderHook(
      () =>
        useInfinitePointHistories({
          size: 1,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(1);
    });
    expect(pointService.getPointHistories).toHaveBeenNthCalledWith(1, { size: 1 });
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
    });

    const mergedIds = result.current.data?.pages.flatMap((page) =>
      page.content.map((item) => item.id)
    );

    expect(mergedIds).toEqual([101, 90]);
    expect(pointService.getPointHistories).toHaveBeenNthCalledWith(2, { size: 1, cursor: 90 });
    expect(result.current.hasNextPage).toBe(false);
  });

  it('POINT-QUERY-003 queries recent histories with start timestamp and fixed page size', async () => {
    (pointService.getPointHistories as jest.Mock).mockResolvedValue({
      content: [{ id: 5, point: 200, pointType: '러닝', createdTimestamp: 1700000000 }],
      cursor: 5,
      hasNext: true,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
    );

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const { result } = renderHook(() => useGetRecentPointHistories({ startDate }), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.content).toHaveLength(1);
    });

    expect(pointService.getPointHistories).toHaveBeenCalledWith({
      startCreatedTimestamp: Math.floor(startDate.getTime() / 1000),
      size: 100,
    });
  });

  it('queries user point balance', async () => {
    (pointService.getUserPoint as jest.Mock).mockResolvedValue({
      userId: 77,
      point: 3200,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useGetUserPoint(), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.point).toBe(3200);
    });

    expect(pointService.getUserPoint).toHaveBeenCalledTimes(1);
    expect(pointService.getPointHistories).not.toHaveBeenCalledWith(
      expect.objectContaining({ startCreatedTimestamp: expect.any(Number) })
    );
  });
});
