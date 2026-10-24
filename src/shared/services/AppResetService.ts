import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAppStore } from '~/stores/app/appStore';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { useUnityStore } from '~/stores/unity/unityStore';
import { useTermsStore } from '~/features/terms/stores/termsStore';
import { useLeagueCheckStore } from '~/stores/league/leagueCheckStore';
import { clearUserContext } from '~/config/sentry';
import { tokenStorage } from '~/utils/storage';
import { detachPushRegistration } from '~/features/notifications/services/pushRegistration';

let logoutBarrier: Promise<void> | null = null;
let cleanupFailed = false;
let clearAllRequested = false;
let retryCleanup: (() => Promise<void>) | null = null;

/** Login must not race old Google sign-out or storage cleanup. */
export const waitForLogout = async (): Promise<void> => {
  if (cleanupFailed && retryCleanup) await retryCleanup();
  else if (logoutBarrier) await logoutBarrier;
};

export const resetAllAppData = (
  queryClient: QueryClient,
  reason: 'manual' | 'auth-expired' = 'manual'
): Promise<void> => {
  if (logoutBarrier && !cleanupFailed) {
    if (reason === 'manual') clearAllRequested = true;
    return logoutBarrier;
  }
  cleanupFailed = false;
  clearAllRequested = reason === 'manual';
  retryCleanup = () => resetAllAppData(queryClient, clearAllRequested ? 'manual' : 'auth-expired');
  // Revoke old asynchronous work before any external operation can yield.
  const pushCleanup = detachPushRegistration();
  useAuthStore.getState().logout();
  queryClient.clear();
  useAppStore.getState().resetAppState();
  useUserStore.getState().logout();
  useUnityStore.getState().resetUnityState();
  useTermsStore.getState().reset();
  useLeagueCheckStore.getState().reset();
  clearUserContext();
  const tokenCleanup = tokenStorage.clearTokens();
  const operation = (async () => {
    const results = await Promise.allSettled([
      pushCleanup,
      tokenCleanup,
      (async () => {
        try { await GoogleSignin.signOut(); }
        catch { console.warn('[AppReset] Google sign-out failed'); }
        if (clearAllRequested) await AsyncStorage.clear();
        else {
          await AsyncStorage.multiRemove(['auth-storage', 'user-storage', 'backgroundEnterTime']);
          // A manual logout can join an automatic cleanup while it is awaiting storage.
          if (clearAllRequested) await AsyncStorage.clear();
        }
      })(),
    ]);
    if (results.some(result => result.status === 'rejected')) {
      throw new Error('Session cleanup failed');
    }
  })();
  // Keep a failed barrier: do not permit a new login over undeleted credentials.
  logoutBarrier = operation;
  void operation.then(() => {
    if (logoutBarrier === operation) logoutBarrier = null;
  }, () => { cleanupFailed = true; });
  return operation;
};
