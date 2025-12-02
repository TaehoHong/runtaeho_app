/**
 * Running React Query Hooks
 * 기존 runningApi.ts의 RTK Query hooks를 React Query로 마이그레이션
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RunningRecord } from '~/features/running/models';
import type { CursorResult } from '~/shared/utils/dto/CursorResult';
import { queryKeys } from '../../../services/queryClient';
import { runningService } from './runningService';
import { useUserStore } from '~/stores/user/userStore';

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
 *
 * 서버 응답의 point는 러닝 완료 후 총 포인트이므로
 * setTotalPoint로 전역 상태를 동기화합니다.
 */
export const useEndRunning = () => {
  const queryClient = useQueryClient();
  const setTotalPoint = useUserStore((state) => state.setTotalPoint);

  return useMutation({
    mutationFn: (runningRecord: RunningRecord) => runningService.endRunning(runningRecord),
    onSuccess: (endRecord) => {
      // 서버 응답의 총 포인트로 전역 상태 동기화
      if (endRecord.point !== undefined) {
        setTotalPoint(endRecord.point);
        console.log(`💰 [useEndRunning] 포인트 동기화: ${endRecord.point}`);
      }
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
