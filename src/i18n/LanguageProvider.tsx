import React, { useEffect, useLayoutEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useLocales } from 'expo-localization';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { userConfigurationService } from '~/features/user/services/userConfigurationService';
import { queryKeys } from '~/services/queryClient';
import { useUserStore } from '~/stores/user/userStore';
import { i18n } from './index';
import { isLanguagePreference, resolveLanguage } from './language';

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const locales = useLocales();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const hasToken = useAuthStore((state) => Boolean(state.accessToken));
  const userId = useUserStore((state) => state.currentUser?.id);
  const preference = useUserStore((state) => state.userPreferences.language);
  const authenticated = isLoggedIn && hasToken && userId !== undefined;
  const { data, dataUpdatedAt, isError, refetch } = useQuery({
    queryKey: queryKeys.user.configuration(userId),
    queryFn: ({ signal }) => userConfigurationService.get(signal),
    enabled: authenticated,
    staleTime: 0,
    retry: 1,
  });

  useEffect(() => {
    if (authenticated && data?.userId === userId && isLanguagePreference(data.language)) {
      useUserStore.getState().updateUserPreferences({ language: data.language });
    }
  }, [authenticated, data, dataUpdatedAt, userId]);

  useLayoutEffect(() => {
    const selected = authenticated && isLanguagePreference(preference) ? preference : 'system';
    void i18n.changeLanguage(resolveLanguage(selected, locales[0]?.languageCode ?? null));
  }, [authenticated, preference, locales]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && authenticated) void refetch();
    });
    return () => subscription.remove();
  }, [authenticated, refetch]);

  useEffect(() => {
    if (isError) console.warn('[Language] Could not refresh account language; keeping the cached preference.');
  }, [isError]);

  return <>{children}</>;
};
