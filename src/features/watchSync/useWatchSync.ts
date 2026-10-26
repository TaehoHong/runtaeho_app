import { useEffect } from 'react';
import { AppState, NativeEventEmitter } from 'react-native';
import { useAuthStore, getSessionSnapshot } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { watchSyncBridge } from './watchSyncService';
import { runWatchSyncTask } from './background';

export const useWatchSync = (authReady: boolean) => {
  const loggedIn = useAuthStore((state) => state.isLoggedIn);
  const userId = useUserStore((state) => state.currentUser?.id);
  useEffect(() => {
    if (!watchSyncBridge || !authReady) return;
    const retry = () => {
      void runWatchSyncTask().catch(() => console.warn('[WatchSync] Upload deferred; native inbox retained'));
    };
    void watchSyncBridge.setOwnerUserId(loggedIn ? String(getSessionSnapshot().userId ?? '') || null : null)
      .then(retry).catch(() => console.warn('[WatchSync] Owner linkage deferred'));
    const emitter = new NativeEventEmitter(watchSyncBridge);
    const incoming = emitter.addListener('watchSyncPendingRecords', retry);
    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') retry(); });
    const timer = setInterval(retry, 60_000);
    return () => { incoming.remove(); foreground.remove(); clearInterval(timer); };
  }, [authReady, loggedIn, userId]);
};
