import { isAxiosError } from 'axios';
import { NativeModules } from 'react-native';
import { getSessionSnapshot, isSessionCurrent, useAuthStore } from '~/features/auth/stores/authStore';
import { offlineStorageService } from '~/features/running/services/OfflineStorageService';
import { getRunningRejectionCode } from '~/features/running/services/runningRejection';
import { apiClient } from '~/services/api/client';
import { queryClient, queryKeys } from '~/services/queryClient';
import type { WatchSyncNativeBridge, WatchSyncAttempt, WatchSyncOutcome } from './types';
import { watchRecordIdentity, watchRejectionStorage } from './watchRejectionStorage';

export const watchSyncBridge = NativeModules.RNWatchSyncBridge as WatchSyncNativeBridge | undefined;

// The native inbox is the durable queue. Reuse the phone replay lock so foreground,
// reconnect, and background attempts cannot race each other.
export const syncWatchRecords = async (attempt: WatchSyncAttempt = {}): Promise<WatchSyncOutcome> => {
  if (!watchSyncBridge || !useAuthStore.getState().isLoggedIn || useAuthStore.getState().tokensRevoked) return 'blocked-auth';
  if (!useAuthStore.getState().accessToken) return 'retry';
  const snapshot = getSessionSnapshot();
  if (snapshot.userId === null) return 'blocked-auth';
  const active = async () => {
    const nativeActive = await attempt.isActive?.() ?? true;
    return nativeActive && !attempt.signal?.aborted && isSessionCurrent(snapshot);
  };
  return offlineStorageService.serializeReplay(async (): Promise<WatchSyncOutcome> => {
    if (!(await active())) return 'blocked-auth';
    const records = await watchSyncBridge.getPendingRecords();
    if (!(await active())) return 'blocked-auth';
    const rejected = await watchRejectionStorage.readPending(records, snapshot, attempt);
    for (const record of records) {
      if (!(await active())) return 'blocked-auth';
      if (record.ownerUserId !== snapshot.userId) continue;
      if (rejected.has(watchRecordIdentity(record))) continue;
      try {
        const { data } = await apiClient.post<{ sessionId: string; runningRecordId: number; status: string }>(
          '/running/completed-records', record, { sessionSnapshot: snapshot, ...(attempt.signal ? { signal: attempt.signal } : {}) }
        );
        if (!(await active())) return 'blocked-auth';
        if (data.sessionId !== record.sessionId || !Number.isSafeInteger(data.runningRecordId) || data.runningRecordId <= 0 ||
            (data.status !== 'CREATED' && data.status !== 'DUPLICATE')) throw new Error('Invalid watch completion response');
        await watchSyncBridge.acknowledgeRecord(record.sessionId, record.source, String(record.ownerUserId), String(data.runningRecordId));
        if (!(await active())) return 'blocked-auth';
        for (const queryKey of [queryKeys.running.all, queryKeys.statistics.all, ['runningRecords'], queryKeys.league.current, queryKeys.point.all, queryKeys.user.all]) {
          if (!(await active())) return 'blocked-auth';
          await queryClient.invalidateQueries({ queryKey });
        }
      } catch (error) {
        if (!(await active())) return 'blocked-auth';
        const rejectionCode = getRunningRejectionCode(error);
        if (rejectionCode) {
          await watchRejectionStorage.add(record, rejectionCode, snapshot, attempt);
          rejected.add(watchRecordIdentity(record));
          console.warn('[WatchSync] Invalid record retained without automatic retry', { code: rejectionCode });
          continue;
        }
        if (isAxiosError(error) && error.response?.status === 400) {
          console.warn('[WatchSync] Invalid record retained for review');
          continue;
        }
        if (isAxiosError(error) && error.response?.status !== undefined && error.response.status >= 400 &&
            error.response.status < 500 && ![408, 429].includes(error.response.status)) return 'blocked-auth';
        throw error;
      }
    }
    return 'success';
  });
};
