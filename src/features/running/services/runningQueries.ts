/**
 * Running React Query Hooks
 * 기존 runningApi.ts의 RTK Query hooks를 React Query로 마이그레이션
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RunningRecord } from '~/features/running/models';
import type { CursorResult } from '~/shared/utils/dto/CursorResult';
import { queryKeys } from '../../../services/queryClient';
import { runningService } from './runningService';

/**
 * 러닝 시작
 */
export const useStartRunning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => runningService.startRunning(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.running.all });
    },
  });
};

/**
 * 러닝 종료
 * 기존: useEndRunningMutation()
 */
export const useEndRunning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runningRecord: RunningRecord) => runningService.endRunning(runningRecord),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.running.all });
    },
  });
};

/**
 * 러닝 기록 업데이트
 * 기존: useUpdateRunningRecordMutation()
 */
export const useUpdateRunningRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runningRecord: RunningRecord) =>
      runningService.updateRunningRecord(runningRecord),
    onSuccess: (_, runningRecord) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.running.all, runningRecord.id] });
    },
  });
};

/**
 * 러닝 기록 조회 (페이지네이션)
 * 기존: useGetRunningRecordsQuery()
 */
export const useGetRunningRecords = (
  params: {
    cursor?: number;
    size?: number;
    startDate?: Date;
    endDate?: Date;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery<CursorResult<RunningRecord>>({
    queryKey: [...queryKeys.running.list(params), params],
    queryFn: () => runningService.getRunningRecords(params),
    enabled: options?.enabled ?? true,
  });
};

/**
 * 기간별 러닝 기록 전체 로드
 * 기존: useLoadRunningRecordsQuery()
 */
export const useLoadRunningRecords = (
  params: {
    startDate: Date;
    endDate?: Date;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery<RunningRecord[]>({
    queryKey: [...queryKeys.running.all, 'full', params],
    queryFn: () => runningService.loadRunningRecords(params),
    enabled: options?.enabled ?? true,
  });
};

/**
 * 더 많은 기록 로드 (무한 스크롤)
 * 기존: useLoadMoreRecordsQuery()
 * React Query의 useInfiniteQuery 사용
 */
export const useInfiniteRunningRecords = (
  params: {
    size: number;
    startDate?: Date;
    endDate?: Date;
  },
  options?: { enabled?: boolean }
) => {
  return useInfiniteQuery<CursorResult<RunningRecord>>({
    queryKey: queryKeys.running.infinite(params),
    queryFn: ({ pageParam }) =>
      runningService.loadMoreRecords({
        ...(pageParam !== undefined && { cursor: pageParam as number }),
        size: params.size,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.cursor : undefined),
    enabled: options?.enabled ?? true,
  });
};;;

/**
 * 특정 러닝 기록 조회
 * 기존: useGetRunningRecordQuery()
 */
export const useGetRunningRecord = (id: number, options?: { enabled?: boolean }) => {
  return useQuery<RunningRecord>({
    queryKey: [...queryKeys.running.all, id],
    queryFn: () => runningService.getRunningRecord(id),
    enabled: options?.enabled ?? true,
  });
};

/**
 * 러닝 기록 삭제
 * 기존: useDeleteRunningRecordMutation()
 */
export const useDeleteRunningRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => runningService.deleteRunningRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.running.all });
    },
  });
};
