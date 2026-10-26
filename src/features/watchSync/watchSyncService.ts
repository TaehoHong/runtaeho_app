import { isAxiosError } from 'axios';
import { NativeModules } from 'react-native';
import { getSessionSnapshot, isSessionCurrent, useAuthStore } from '~/features/auth/stores/authStore';
import { offlineStorageService } from '~/features/running/services/OfflineStorageService';
import { getRunningRejectionCode } from '~/features/running/services/runningRejection';
import { apiClient } from '~/services/api/client';
import { queryClient, queryKeys } from '~/services/queryClient';
import type { WatchSyncNativeBridge } from './types';
import { watchRecordIdentity, watchRejectionStorage } from './watchRejectionStorage';

export const watchSyncBridge = NativeModules.RNWatchSyncBridge as WatchSyncNativeBridge | undefined;

// The native inbox is the durable queue. Reuse the phone replay lock so foreground,
// reconnect, and background attempts cannot race each other.
export const syncWatchRecords = async (): Promise<void> => {
  if (!watchSyncBridge || !useAuthStore.getState().isLoggedIn || !useAuthStore.getState().accessToken) return;
  const snapshot = getSessionSnapshot();
  if (snapshot.userId === null) return;
  await offlineStorageService.serializeReplay(async () => {
    if (!isSessionCurrent(snapshot)) return;
    const records = await watchSyncBridge.getPendingRecords();
    if (!isSessionCurrent(snapshot)) return;
    const rejected = await watchRejectionStorage.readPending(records, snapshot);
    for (const record of records) {
      if (!isSessionCurrent(snapshot)) return;
      if (record.ownerUserId !== snapshot.userId) continue;
      if (rejected.has(watchRecordIdentity(record))) continue;
      try {
        const { data } = await apiClient.post<{ sessionId: string; runningRecordId: number; status: string }>(
          '/running/completed-records', record, { sessionSnapshot: snapshot }
        );
        if (!isSessionCurrent(snapshot)) return;
        if (data.sessionId !== record.sessionId || !Number.isSafeInteger(data.runningRecordId) || data.runningRecordId <= 0 ||
            (data.status !== 'CREATED' && data.status !== 'DUPLICATE')) throw new Error('Invalid watch completion response');
        await watchSyncBridge.acknowledgeRecord(record.sessionId, record.source, String(record.ownerUserId), String(data.runningRecordId));
        if (!isSessionCurrent(snapshot)) return;
        for (const queryKey of [queryKeys.running.all, queryKeys.statistics.all, ['runningRecords'], queryKeys.league.current, queryKeys.point.all, queryKeys.user.all]) {
          if (!isSessionCurrent(snapshot)) return;
          await queryClient.invalidateQueries({ queryKey });
        }
      } catch (error) {
        if (!isSessionCurrent(snapshot)) return;
        const rejectionCode = getRunningRejectionCode(error);
        if (rejectionCode) {
          await watchRejectionStorage.add(record, rejectionCode, snapshot);
          rejected.add(watchRecordIdentity(record));
          console.warn('[WatchSync] Invalid record retained without automatic retry', { code: rejectionCode });
          continue;
        }
        if (isAxiosError(error) && error.response?.status === 400) {
          console.warn('[WatchSync] Invalid record retained for review');
          continue;
        }
        throw error;
      }
    }
  });
};
