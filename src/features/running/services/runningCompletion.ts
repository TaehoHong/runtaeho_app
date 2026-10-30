import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { isSessionCurrent, type SessionSnapshot } from '~/features/auth/stores/authStore';
import { pointService } from '~/features/point/services/pointService';
import { queryKeys } from '~/services/queryClient';
import type { EndRunningRecord } from '../models';

/** Completion side effects must never turn a server ACK into a failed upload. */
export async function completeRunningRecord(
  record: EndRunningRecord,
  session: SessionSnapshot,
  pointRevision: number,
  queryClient: QueryClient,
  rewardChanged = record.acceptanceStatus === undefined || record.acceptanceStatus === 'ACCEPTED',
): Promise<void> {
  if (!isSessionCurrent(session)) return;
  const keys: QueryKey[] = [queryKeys.running.all, queryKeys.statistics.all, ['runningRecords'], queryKeys.league.current];
  if (rewardChanged) keys.push(queryKeys.point.all, queryKeys.user.all);
  await Promise.allSettled([
    ...(record.point === undefined ? [] : [pointService.reconcileCompletedPoint(record.point, pointRevision, session)]),
    ...keys.map(queryKey => queryClient.invalidateQueries({ queryKey })),
  ]);
}
