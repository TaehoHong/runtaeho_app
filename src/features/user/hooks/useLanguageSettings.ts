import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { isLanguagePreference, type LanguagePreference } from '~/i18n/language';
import { queryKeys } from '~/services/queryClient';
import { useUserStore } from '~/stores/user/userStore';
import { userConfigurationService } from '../services/userConfigurationService';

export const useLanguageSettings = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (language: LanguagePreference) => {
      const userId = useUserStore.getState().currentUser?.id;
      const token = useAuthStore.getState().accessToken;
      if (userId === undefined || !useAuthStore.getState().isLoggedIn || !token) {
        throw new Error('A signed-in account is required.');
      }
      const controller = new AbortController();
      const unsubscribeUser = useUserStore.subscribe((state) => {
        if (state.currentUser?.id !== userId) controller.abort();
      });
      const unsubscribeAuth = useAuthStore.subscribe((state) => {
        if (!state.isLoggedIn) controller.abort();
      });
      try {
        await client.cancelQueries({ queryKey: queryKeys.user.configuration(userId) });
        if (controller.signal.aborted) throw new Error('Account changed before saving language.');
        // Cancel even if the shared API client is still waiting for token renewal.
        const configuration = await userConfigurationService.update({ language }, controller.signal);
        if (!isLanguagePreference(configuration.language) || configuration.userId !== userId) {
          throw new Error('Invalid language configuration response.');
        }
        await client.cancelQueries({ queryKey: queryKeys.user.configuration(userId) });
        if (!controller.signal.aborted) {
          useUserStore.getState().updateUserPreferences({ language: configuration.language });
          client.setQueryData(queryKeys.user.configuration(userId), configuration);
        }
        return configuration;
      } finally {
        unsubscribeUser();
        unsubscribeAuth();
      }
    },
    retry: false,
  });
};
