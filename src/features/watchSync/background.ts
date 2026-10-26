import { useAuthStore, getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { syncWatchRecords } from './watchSyncService';

export const runWatchSyncTask = async (): Promise<void> => {
  const generation = useAuthStore.getState().sessionGeneration;
  await Promise.all([
    useAuthStore.persist.hasHydrated() ? Promise.resolve() : new Promise<void>((resolve) => {
      const unsubscribe = useAuthStore.persist.onFinishHydration(() => { unsubscribe(); resolve(); });
    }),
    useUserStore.persist.hasHydrated() ? Promise.resolve() : new Promise<void>((resolve) => {
      const unsubscribe = useUserStore.persist.onFinishHydration(() => { unsubscribe(); resolve(); });
    }),
  ]);
  if (useAuthStore.getState().sessionGeneration !== generation) return;
  if (!useAuthStore.getState().isLoggedIn) return;
  const session = getSessionSnapshot();
  await useAuthStore.getState().initializeTokens();
  if (!isSessionCurrent(session) || !useAuthStore.getState().accessToken) return;
  await syncWatchRecords();
};
