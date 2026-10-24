import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { useAppStore, ViewState } from '~/stores/app/appStore';
import { useAppLanguage } from '~/i18n';
import { notificationIdFromData } from './services/notificationService';
import { syncPushRegistration } from './services/pushRegistration';
import { queryKeys } from '~/services/queryClient';

export function NotificationProvider() {
  const language = useAppLanguage();
  const loggedIn = useAuthStore(state => state.isLoggedIn);
  const userId = useUserStore(state => state.currentUser?.id);
  const generation = useAuthStore(state => state.sessionGeneration);
  const loaded = useAppStore(state => state.viewState === ViewState.Loaded);
  const ready = loggedIn && userId !== undefined && loaded;
  const queryClient = useQueryClient();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    Notifications.setNotificationHandler({ handleNotification: async notification => {
      const ownPush = notificationIdFromData(notification.request.content.data) !== null;
      const show = !ownPush || useAuthStore.getState().isLoggedIn;
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    } });
    const received = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    });
    return () => { received.remove(); Notifications.setNotificationHandler(null); };
  }, [queryClient]);

  useEffect(() => {
    if (!ready) return;
    const sync = () => { void syncPushRegistration().catch(() => console.warn('[Notifications] Registration sync failed')); };
    sync();
    const token = Notifications.addPushTokenListener(sync);
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') {
        sync();
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      }
    });
    return () => { token.remove(); foreground.remove(); };
  }, [ready, userId, generation, language, queryClient]);

  useEffect(() => {
    if (!ready || !response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const identifier = response.notification.request.identifier;
    if (handled.current === identifier) return;
    handled.current = identifier;
    const id = notificationIdFromData(response.notification.request.content.data);
    if (id !== null) router.push({ pathname: '/user/notification', params: { id: String(id) } });
    void Notifications.clearLastNotificationResponseAsync().catch(() => console.warn('[Notifications] Could not clear response'));
  }, [ready, response, generation]);
  return null;
}
