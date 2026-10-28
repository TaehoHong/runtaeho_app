import { isAxiosError } from 'axios';
import { NativeEventEmitter } from 'react-native';
import { useAuthStore, getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { syncWatchRecords, watchSyncBridge } from './watchSyncService';
import type { WatchSyncAttempt, WatchSyncOutcome } from './types';

const hydrate = async (storage: { hasHydrated(): boolean; onFinishHydration(listener: () => void): () => void }, signal?: AbortSignal) => {
  if (storage.hasHydrated() || signal?.aborted) return;
  await new Promise<void>((resolve) => {
    let unsubscribe = () => {};
    const finish = () => { unsubscribe(); signal?.removeEventListener('abort', finish); resolve(); };
    unsubscribe = storage.onFinishHydration(finish);
    signal?.addEventListener('abort', finish, { once: true });
    if (storage.hasHydrated() || signal?.aborted) finish();
  });
};

export const runWatchSyncTask = async (attempt: WatchSyncAttempt = {}): Promise<WatchSyncOutcome> => {
  const generation = useAuthStore.getState().sessionGeneration;
  await Promise.all([hydrate(useAuthStore.persist, attempt.signal), hydrate(useUserStore.persist, attempt.signal)]);
  if (attempt.signal?.aborted || useAuthStore.getState().sessionGeneration !== generation || !useAuthStore.getState().isLoggedIn || useAuthStore.getState().tokensRevoked) return 'blocked-auth';
  const session = getSessionSnapshot();
  try {
    await useAuthStore.getState().initializeTokens();
    if (attempt.signal?.aborted || !isSessionCurrent(session) || !useAuthStore.getState().isLoggedIn || useAuthStore.getState().tokensRevoked) return 'blocked-auth';
    // initializeTokens may return without a token while secure storage is temporarily locked.
    if (!useAuthStore.getState().accessToken) return 'retry';
    return await syncWatchRecords(attempt);
  } catch (error) {
    if (attempt.signal?.aborted || !isSessionCurrent(session) || !useAuthStore.getState().isLoggedIn || useAuthStore.getState().tokensRevoked) return 'blocked-auth';
    if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) return 'blocked-auth';
    return 'retry';
  }
};

// Only scheduled Android jobs use this handshake; iOS and foreground calls keep the existing path.
export const runScheduledWatchSyncTask = async (input?: { jobRunId?: string }): Promise<void> => {
  const runId = input?.jobRunId;
  const bridge = watchSyncBridge;
  if (!runId || !bridge?.isWatchSyncJobActive || !bridge.finishWatchSyncJob) {
    await runWatchSyncTask();
    return;
  }
  const controller = new AbortController();
  const subscription = new NativeEventEmitter(bridge).addListener('watchSyncJobStopped', (event: { jobRunId?: string }) => {
    if (event?.jobRunId === runId) controller.abort();
  });
  const active = () => bridge.isWatchSyncJobActive!(runId);
  try {
    if (!(await active())) return;
    const outcome = await runWatchSyncTask({ signal: controller.signal, isActive: active });
    if (!controller.signal.aborted && await active()) await bridge.finishWatchSyncJob(runId, outcome);
  } finally { subscription.remove(); }
};
