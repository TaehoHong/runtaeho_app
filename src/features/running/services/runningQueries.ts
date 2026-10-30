import { getSessionSnapshot, isSessionCurrent, type SessionSnapshot } from '~/features/auth/stores/authStore';
/**
 * Running React Query Hooks
 * 기존 runningApi.ts의 RTK Query hooks를 React Query로 마이그레이션
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RunningRecord } from '~/features/running/models';
import type { CursorResult } from '~/shared/utils/dto/CursorResult';
import { queryKeys } from '../../../services/queryClient';
import {
  runningService,
  type RunningRecordItemResponse,
  type UpdateRunningRecordShoeParams,
} from './runningService';
import { pointService } from '~/features/point/services/pointService';
import { completeRunningRecord } from './runningCompletion';

/**
 * 러닝 시작
 */
export const useStartRunning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (session: SessionSnapshot = getSessionSnapshot()) => runningService.startRunning(session),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.running.all });
    },
  });
};

/**
 * 러닝 종료
 * 기존: useEndRunningMutation()
 *
 * 완료 시점의 포인트와 관련 query를 공통 완료 소유자를 통해 동기화합니다.
 */
export const useEndRunning = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ record, session }: { record: RunningRecord; session: SessionSnapshot }) => runningService.endRunning(record, session),
    onMutate: () => pointService.captureUserPointRevision(),
    onSuccess: (endRecord, { session }, pointRevision) => {
      // The lifecycle awaits this mutation inside the replay lock. Reconciliation
      // must not keep uploads locked while a point GET or query refetch is pending.
      void completeRunningRecord(endRecord, session, pointRevision!, queryClient);
    },
  });
  return {
    ...mutation,
    mutateAsync: (record: RunningRecord, session: SessionSnapshot = getSessionSnapshot()) =>
      mutation.mutateAsync({ record, session }),
  };
};

/**
 * 러닝 기록 업데이트
 * 기존: useUpdateRunningRecordMutation()
 */
export const useUpdateRunningRecord = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ record, session }: { record: RunningRecord; session: SessionSnapshot }) =>
      runningService.updateRunningRecord(record, session),
    onSuccess: (_, { record: runningRecord, session }) => {
      if (!isSessionCurrent(session)) return;
      queryClient.invalidateQueries({ queryKey: [...queryKeys.running.all, runningRecord.id] });
    },
  });
  return {
    ...mutation,
    mutateAsync: (record: RunningRecord, session: SessionSnapshot = getSessionSnapshot()) =>
      mutation.mutateAsync({ record, session }),
  };
};

/**
 * 러닝 기록 연결 신발 변경
 */
export const useUpdateRunningRecordShoe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateRunningRecordShoeParams) =>
      runningService.updateRunningRecordShoe(params),
    onSuccess: (updatedRecord, variables) => {
      queryClient.setQueryData(
        queryKeys.running.detail(variables.runningRecordId),
        updatedRecord
      );

      queryClient.invalidateQueries({ queryKey: queryKeys.running.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.all });
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
      runningService.getRunningRecords({
        ...(pageParam !== undefined && { cursor: pageParam as number }),
        size: params.size,
        ...(params.startDate && { startDate: params.startDate }),
        ...(params.endDate && { endDate: params.endDate }),
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
    queryKey: queryKeys.running.detail(id),
    queryFn: () => runningService.getRunningRecord(id),
    enabled: options?.enabled ?? true,
  });
};

/**
 * 러닝 기록 아이템 조회 (GPS 복원용)
 */
export const useGetRunningRecordItems = (
  id: number,
  options?: { enabled?: boolean }
) => {
  return useQuery<RunningRecordItemResponse[]>({
    queryKey: queryKeys.running.items(id),
    queryFn: () => runningService.getRunningRecordItems(id),
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
