import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { getSessionSnapshot, isSessionCurrent, useAuthStore } from '~/features/auth/stores/authStore';
import { isAgreedOnTermsFromToken } from '~/features/auth/utils/jwtUtils';
import { useUserStore } from '~/stores/user/userStore';
import { useAppStore, ViewState } from '~/stores/app/appStore';
import { t, useAppLanguage } from '~/i18n';
import { notificationIdFromData, notificationService } from './services/notificationService';
import { syncPushRegistration } from './services/pushRegistration';
import { queryKeys } from '~/services/queryClient';
import { useUpdateStore } from '~/features/updates/stores/updateStore';

export function NotificationProvider() {
  const language = useAppLanguage();
  const loggedIn = useAuthStore(state => state.isLoggedIn);
  const userId = useUserStore(state => state.currentUser?.id);
  const generation = useAuthStore(state => state.sessionGeneration);
  const termsAgreed = useAuthStore(state => !!state.accessToken && isAgreedOnTermsFromToken(state.accessToken));
  const loaded = useAppStore(state => state.viewState === ViewState.Loaded);
  const navigationSession = useAppStore(state => state.authenticatedNavigationSession);
  const updateCompleted = useUpdateStore(state => state.isAutoUpdateCompleted);
  const ready = loggedIn && userId !== undefined && loaded && termsAgreed && updateCompleted &&
    navigationSession?.generation === generation && navigationSession.userId === userId;
  const queryClient = useQueryClient();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    Notifications.setNotificationHandler({ handleNotification: async notification => {
      const data = notification.request.content.data ?? {};
      const trigger = notification.request.trigger;
      const ownPush = notificationIdFromData(data) !== null || (!!trigger && 'type' in trigger && trigger.type === 'push');
      const recipientId = notificationIdFromData({ notificationId: data.recipientUserId });
      const show = !ownPush || (useAuthStore.getState().isLoggedIn && recipientId !== null &&
        recipientId === useUserStore.getState().currentUser?.id);
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    } });
    const received = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    });
    return () => { received.remove(); Notifications.setNotificationHandler(null); };
  }, [queryClient]);

  useEffect(() => {
    if (!ready) return;
    const sync = (devicePushToken?: Notifications.DevicePushToken) => {
      void syncPushRegistration(devicePushToken).catch(() => console.warn('[Notifications] Registration sync failed'));
    };
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
    const data = response.notification.request.content.data ?? {};
    const id = notificationIdFromData(data);
    const recipientId = notificationIdFromData({ notificationId: data.recipientUserId });
    const consume = () => {
      handled.current = identifier;
      void Notifications.clearLastNotificationResponseAsync().catch(() => console.warn('[Notifications] Could not clear response'));
    };
    if (id === null || (data.recipientUserId !== undefined && recipientId !== userId)) {
      consume();
      return;
    }
    const snapshot = getSessionSnapshot();
    let active = true;
    const open = async () => {
      try {
        // Legacy payloads have no recipient: opening validates ownership with the current session.
        if (recipientId === null) await notificationService.open(id, language);
        if (!active || !isSessionCurrent(snapshot)) return;
        router.push({ pathname: '/user/notification', params: { id: String(id) } });
        consume();
      } catch {
        if (active && isSessionCurrent(snapshot)) Alert.alert(t('조회 실패'), t('알림을 불러오지 못했어요.'));
      }
    };
    void open();
    return () => { active = false; };
  }, [ready, response, generation, userId, language]);
  return null;
}
