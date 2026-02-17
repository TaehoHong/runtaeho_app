import { useAuthStore } from '~/features/auth/stores/authStore';
import { useUpdateStore } from '~/features/updates/stores/updateStore';
import { useAppStore } from '~/stores/app/appStore';
import { useLeagueCheckStore } from '~/stores/league/leagueCheckStore';
import { useUnityStore } from '~/stores/unity/unityStore';
import { useUserStore } from '~/stores/user/userStore';

type PersistCapableStore = {
  persist?: {
    clearStorage?: () => Promise<void> | void;
  };
};

export const resetAllStores = () => {
  useAuthStore.getState().logout();
  useAuthStore.getState().setLoading(false);
  useAuthStore.getState().setError(null);

  useUserStore.getState().logout();
  useAppStore.getState().resetAppState();
  useLeagueCheckStore.getState().reset();
  useUnityStore.getState().resetUnityState();
  useUpdateStore.getState().reset();
};

export const clearPersistedStorage = async () => {
  const authStore = useAuthStore as unknown as PersistCapableStore;
  const userStore = useUserStore as unknown as PersistCapableStore;

  await Promise.resolve(authStore.persist?.clearStorage?.());
  await Promise.resolve(userStore.persist?.clearStorage?.());
};
