import { runWatchSyncTask } from '../background';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { syncWatchRecords } from '../watchSyncService';
jest.mock('../watchSyncService', () => ({ syncWatchRecords: jest.fn() }));
jest.mock('~/features/auth/stores/authStore', () => {
  const state = { isLoggedIn: true, sessionGeneration: 1, accessToken: 'available', initializeTokens: jest.fn() };
  return {
    useAuthStore: { getState: () => state, persist: { hasHydrated: jest.fn(() => true), onFinishHydration: jest.fn(), rehydrate: jest.fn() } },
    getSessionSnapshot: () => ({ generation: state.sessionGeneration, userId: 7 }),
    isSessionCurrent: (snapshot: { generation: number }) => snapshot.generation === state.sessionGeneration,
  };
});
jest.mock('~/stores/user/userStore', () => ({ useUserStore: { persist: { hasHydrated: () => true, onFinishHydration: jest.fn(), rehydrate: jest.fn() } } }));
beforeEach(() => { jest.clearAllMocks(); useAuthStore.getState().sessionGeneration = 1; useAuthStore.getState().isLoggedIn = true; });
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
