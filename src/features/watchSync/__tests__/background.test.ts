import { runWatchSyncTask, runScheduledWatchSyncTask } from '../background';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { syncWatchRecords, watchSyncBridge } from '../watchSyncService';
let mockStopListener: ((event: { jobRunId: string }) => void) | undefined;
const mockRemove = jest.fn();
jest.mock('react-native', () => ({ NativeEventEmitter: jest.fn().mockImplementation(() => ({
  addListener: (_name: string, listener: typeof mockStopListener) => { mockStopListener = listener; return { remove: mockRemove }; },
})) }));
jest.mock('../watchSyncService', () => ({ syncWatchRecords: jest.fn(), watchSyncBridge: {
  isWatchSyncJobActive: jest.fn(), finishWatchSyncJob: jest.fn(),
} }));
jest.mock('~/features/auth/stores/authStore', () => {
  const state = { isLoggedIn: true, tokensRevoked: false, sessionGeneration: 1, accessToken: 'available', initializeTokens: jest.fn() };
  return {
    useAuthStore: { getState: () => state, persist: { hasHydrated: jest.fn(() => true), onFinishHydration: jest.fn(), rehydrate: jest.fn() } },
    getSessionSnapshot: () => ({ generation: state.sessionGeneration, userId: 7 }),
    isSessionCurrent: (snapshot: { generation: number }) => snapshot.generation === state.sessionGeneration,
  };
});
jest.mock('~/stores/user/userStore', () => ({ useUserStore: { persist: { hasHydrated: () => true, onFinishHydration: jest.fn(), rehydrate: jest.fn() } } }));
beforeEach(() => { jest.clearAllMocks(); mockStopListener = undefined;
  (watchSyncBridge!.isWatchSyncJobActive as jest.Mock).mockResolvedValue(true);
  (watchSyncBridge!.finishWatchSyncJob as jest.Mock).mockResolvedValue(true);
  (useAuthStore.getState().initializeTokens as jest.Mock).mockReset(); (syncWatchRecords as jest.Mock).mockResolvedValue("success"); useAuthStore.getState().sessionGeneration = 1; useAuthStore.getState().isLoggedIn = true; useAuthStore.getState().tokensRevoked = false; useAuthStore.getState().accessToken = "available"; });
it('uses hydrated session without rehydrating live state', async () => {
  await runWatchSyncTask();
  expect(useAuthStore.persist.rehydrate).not.toHaveBeenCalled();
  expect(syncWatchRecords).toHaveBeenCalledTimes(1);
});
it('does not upload when logout happens while native tokens initialize', async () => {
  (useAuthStore.getState().initializeTokens as jest.Mock).mockImplementationOnce(async () => { useAuthStore.getState().sessionGeneration += 1; });
  await runWatchSyncTask();
  expect(syncWatchRecords).not.toHaveBeenCalled();
});

it('keeps a logged-in session retryable when native token storage is temporarily unavailable', async () => {
  useAuthStore.getState().accessToken = null;
  await expect(runWatchSyncTask()).resolves.toBe('retry');
  expect(syncWatchRecords).not.toHaveBeenCalled();
});

it('reports transient upload failure to the Android job for OS retry', async () => {
  (syncWatchRecords as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await runScheduledWatchSyncTask({ jobRunId: 'attempt-1' });
  expect(watchSyncBridge!.finishWatchSyncJob).toHaveBeenCalledWith('attempt-1', 'retry');
  expect(mockRemove).toHaveBeenCalledTimes(1);
});
it('reports final HTTP authentication failure without an automatic retry loop', async () => {
  (syncWatchRecords as jest.Mock).mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });
  await runScheduledWatchSyncTask({ jobRunId: 'attempt-1' });
  expect(watchSyncBridge!.finishWatchSyncJob).toHaveBeenCalledWith('attempt-1', 'blocked-auth');
});
it('does not invoke Android job methods for foreground or iOS execution', async () => {
  await runWatchSyncTask();
  expect(watchSyncBridge!.isWatchSyncJobActive).not.toHaveBeenCalled();
  expect(watchSyncBridge!.finishWatchSyncJob).not.toHaveBeenCalled();
});
it('does not upload or finish a stale Android job token', async () => {
  (watchSyncBridge!.isWatchSyncJobActive as jest.Mock).mockResolvedValueOnce(false);
  await runScheduledWatchSyncTask({ jobRunId: 'old-attempt' });
  expect(syncWatchRecords).not.toHaveBeenCalled();
  expect(watchSyncBridge!.finishWatchSyncJob).not.toHaveBeenCalled();
  expect(mockRemove).toHaveBeenCalledTimes(1);
});
it('aborts only the matching stopped attempt and ignores its late result', async () => {
  let release!: (value: string) => void;
  let attemptSignal!: AbortSignal;
  let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  (syncWatchRecords as jest.Mock).mockImplementationOnce(({ signal }: { signal: AbortSignal }) => {
    attemptSignal = signal;
    started();
    return new Promise<string>(resolve => { release = resolve; }).then(value => { expect(signal.aborted).toBe(true); return value; });
  });
  const running = runScheduledWatchSyncTask({ jobRunId: 'attempt-1' });
  await ready;
  mockStopListener!({ jobRunId: 'another-attempt' });
  expect(attemptSignal.aborted).toBe(false);
  mockStopListener!({ jobRunId: 'attempt-1' });
  expect(attemptSignal.aborted).toBe(true);
  release('success');
  await running;
  expect(watchSyncBridge!.finishWatchSyncJob).not.toHaveBeenCalled();
  expect(mockRemove).toHaveBeenCalledTimes(1);
});
it('native bridges without optional Android methods retain the original foreground path', async () => {
  const active = watchSyncBridge!.isWatchSyncJobActive;
  const finish = watchSyncBridge!.finishWatchSyncJob;
  delete watchSyncBridge!.isWatchSyncJobActive;
  delete watchSyncBridge!.finishWatchSyncJob;
  try {
    await runScheduledWatchSyncTask();
    expect(syncWatchRecords).toHaveBeenCalledTimes(1);
  } finally {
    if (active) watchSyncBridge!.isWatchSyncJobActive = active;
    if (finish) watchSyncBridge!.finishWatchSyncJob = finish;
  }
});

it('does not retry token storage after the current session explicitly revoked its tokens', async () => {
  useAuthStore.getState().tokensRevoked = true;
  await expect(runWatchSyncTask()).resolves.toBe('blocked-auth');
  expect(useAuthStore.getState().initializeTokens).not.toHaveBeenCalled();
  expect(syncWatchRecords).not.toHaveBeenCalled();
});
