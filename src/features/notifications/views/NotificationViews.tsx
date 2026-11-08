import React, { useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { ActivityIndicator, Alert, AppState, FlatList, Linking, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { type InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TopScreenSafeAreaView } from '~/shared/components';
import { Text } from '~/shared/components/typography';
import { GREY, PRIMARY } from '~/shared/styles';
import { t, useAppLanguage, useAppTranslation } from '~/i18n';
import { useUserStore } from '~/stores/user/userStore';
import { getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';
import { queryKeys } from '~/services/queryClient';
import { notificationService, type NotificationConfiguration, type NotificationPage } from '../services/notificationService';
import { currentTimezone, getPushPermission, requestPushPermission, syncPushRegistration } from '../services/pushRegistration';
import { useScreenLifetime } from '~/shared/hooks/useScreenLifetime';
import { leagueService } from '~/features/league/services/leagueService';

function Header({ title, settings = false }: { title: string; settings?: boolean }) {
  const translate = useAppTranslation();
  return <View style={styles.header}>
    <TouchableOpacity accessibilityLabel={translate('뒤로')} accessibilityRole="button" onPress={() => router.back()} style={styles.icon}>
      <Ionicons name="chevron-back" size={24} color={GREY[900]} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
    {settings ? <TouchableOpacity accessibilityLabel={translate('알림 설정')} accessibilityRole="button" style={styles.icon}
      onPress={() => router.push('/user/notification-settings')}><Ionicons name="settings-outline" size={22} color={GREY[900]} /></TouchableOpacity> : <View style={styles.icon} />}
  </View>;
}

function Retry({ onPress }: { onPress: () => void }) {
  const translate = useAppTranslation();
  return <View style={styles.message}>
    <Text>{translate('알림을 불러오지 못했어요.')}</Text>
    <TouchableOpacity onPress={onPress} accessibilityRole="button" style={styles.button}><Text>{translate('다시 시도')}</Text></TouchableOpacity>
  </View>;
}

export function NotificationInboxView({ type }: { type?: 'NOTICE' }) {
  const translate = useAppTranslation();
  const language = useAppLanguage();
  const userId = useUserStore(state => state.currentUser?.id);
  const query = useInfiniteQuery({
    queryKey: queryKeys.notifications.inbox(userId, language, type),
    queryFn: ({ pageParam, signal }) => notificationService.list(language, pageParam, signal, type),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: page => page.hasNext && page.cursor !== null ? page.cursor : undefined,
    enabled: userId !== undefined,
    staleTime: 0,
  });
  const refetch = query.refetch;
  useFocusEffect(useCallback(() => { if (userId !== undefined) void refetch(); }, [refetch, userId]));
  const items = query.data?.pages.flatMap(page => page.content) ?? [];
  return <TopScreenSafeAreaView style={styles.container}>
    <Header title={type === 'NOTICE' ? translate('공지사항') : translate('알림함')} settings />
    {query.isPending ? <ActivityIndicator style={styles.message} /> : query.isError && items.length === 0 ?
      <Retry onPress={() => { void query.refetch(); }} /> :
      <FlatList data={items} keyExtractor={item => String(item.id)} refreshing={query.isRefetching}
        ListHeaderComponent={query.isRefetchError && items.length > 0 ? <Retry onPress={() => { void query.refetch(); }} /> : null}
        onRefresh={() => { void query.refetch(); }}
        onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
        renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" style={[styles.item, !item.readDatetime && styles.unread]}
          onPress={() => router.push({ pathname: '/user/notification', params: { id: String(item.id) } })}>
          <View style={styles.row}><Text style={styles.title}>{item.title}</Text>{!item.readDatetime && <Text style={styles.badge}>{translate('읽지 않음')}</Text>}</View>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.date}>{new Date(item.createdDatetime).toLocaleString(language)}</Text>
        </TouchableOpacity>}
        ListEmptyComponent={<Text style={styles.message}>{translate('아직 받은 알림이 없어요.')}</Text>}
        ListFooterComponent={query.isFetchNextPageError ? <Retry onPress={() => { void query.fetchNextPage(); }} /> :
          query.isFetchingNextPage ? <ActivityIndicator /> : <Text style={styles.note}>{translate('알림은 90일 동안 보관돼요.')}</Text>} />}
  </TopScreenSafeAreaView>;
}

export function NotificationDetailView() {
  const translate = useAppTranslation();
  const captureLifetime = useScreenLifetime();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Number(rawId);
  const language = useAppLanguage();
  const userId = useUserStore(state => state.currentUser?.id);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.notifications.detail(userId, id, language),
    queryFn: () => notificationService.open(id, language),
    enabled: userId !== undefined && Number.isSafeInteger(id) && id > 0,
    staleTime: 0,
    retry: false,
  });
  useEffect(() => {
    const item = query.data;
    if (!item) return;
    const snapshot = getSessionSnapshot();
    const key = ['notifications', 'inbox', userId];
    void queryClient.cancelQueries({ queryKey: key }).then(() => {
      if (!isSessionCurrent(snapshot)) return;
      queryClient.setQueriesData<InfiniteData<NotificationPage>>({ queryKey: key }, previous => previous && ({
        ...previous,
        pages: previous.pages.map(page => ({ ...page, content: page.content.map(row =>
          row.id === item.id ? { ...row, readDatetime: item.readDatetime } : row) })),
      }));
      void queryClient.invalidateQueries({ queryKey: key });
    });
  }, [query.data, queryClient, userId]);
  const openLeague = useMutation({ mutationFn: async () => {
    const participantId = query.data?.leagueParticipantId;
    if (!participantId) return;
    const snapshot = getSessionSnapshot();
    const isScreenCurrent = captureLifetime();
    const isCurrent = () => isScreenCurrent() && isSessionCurrent(snapshot);
    try {
      const result = await leagueService.getResult(participantId);
      if (!isCurrent()) return;
      router.push({ pathname: '/league/result', params: { resultData: JSON.stringify(result), participantId: String(participantId) } });
    } catch {
      if (isCurrent()) Alert.alert(t('조회 실패'), t('리그 결과를 불러오지 못했어요.'));
    }
  } });
  const unavailable = !Number.isSafeInteger(id) || id <= 0 || (isAxiosError(query.error) && query.error.response?.status === 404);
  return <TopScreenSafeAreaView style={styles.container}>
    <Header title={translate('알림')} />
    {unavailable ? <View style={styles.message}>
      <Text>{translate('알림을 찾을 수 없거나 보관 기간이 지났어요.')}</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => router.dismissTo('/user/notifications')}><Text>{translate('알림함')}</Text></TouchableOpacity>
    </View> : query.isError ? <Retry onPress={() => { void query.refetch(); }} /> : query.isPending ? <ActivityIndicator style={styles.message} /> : <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{query.data.title}</Text>
      <Text style={styles.date}>{new Date(query.data.createdDatetime).toLocaleString(language)}</Text>
      <Text style={styles.body}>{query.data.body}</Text>
      {query.data.type === 'LEAGUE_RESULT' && <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: openLeague.isPending, busy: openLeague.isPending }} style={styles.button} disabled={openLeague.isPending}
        onPress={() => openLeague.mutate()}><Text>{translate('결과 확인')}</Text></TouchableOpacity>}
      {query.data.type === 'RUNNING_REMINDER' && <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => router.dismissTo('/(tabs)/running')}>
        <Text>{translate('러닝하러 가기')}</Text></TouchableOpacity>}
    </ScrollView>}
  </TopScreenSafeAreaView>;
}

export function NotificationSettingsView() {
  const captureLifetime = useScreenLifetime();
  const t = useAppTranslation();
  const userId = useUserStore(state => state.currentUser?.id);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.notifications.configuration(userId), queryFn: notificationService.configuration, enabled: userId !== undefined, staleTime: 0 });
  const refetch = query.refetch;
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const refreshPermission = useCallback(() => {
    const snapshot = getSessionSnapshot();
    const isScreenCurrent = captureLifetime();
    void getPushPermission().then(granted => {
      if (isScreenCurrent() && isSessionCurrent(snapshot)) setPermissionGranted(granted);
    }).catch(() => { /* Leave an unknown permission state until the next focus or foreground read. */ });
  }, [captureLifetime]);
  useFocusEffect(useCallback(() => { refreshPermission(); }, [refreshPermission]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { void refetch(); refreshPermission(); }
    });
    return () => subscription.remove();
  }, [refetch, refreshPermission]);
  const save = async (field: 'pushEnabled' | 'leaguePushEnabled' | 'reminderPushEnabled' | 'noticePushEnabled', enabled: boolean) => {
    if (!query.data || savingRef.current) return;
    const snapshot = getSessionSnapshot();
    const isScreenCurrent = captureLifetime();
    const isCurrent = () => isScreenCurrent() && isSessionCurrent(snapshot);
    savingRef.current = true;
    setSaving(true);
    try {
      if (field === 'pushEnabled' && enabled) {
        const granted = await requestPushPermission();
        if (isCurrent()) setPermissionGranted(granted);
        if (!granted) {
          if (isCurrent()) Alert.alert(t('알림 권한이 필요해요'), t('기기 설정에서 알림을 허용해주세요.'), [
            { text: t('취소'), style: 'cancel' }, { text: t('설정 열기'), onPress: () => { if (isCurrent()) void Linking.openSettings(); } },
          ]);
          return;
        }
      }
      if (!isSessionCurrent(snapshot)) return;
      const value: Partial<NotificationConfiguration> = { [field]: enabled, timezone: currentTimezone() };
      const saved = await notificationService.configure(value);
      if (!isSessionCurrent(snapshot)) return;
      // Foreground reads can start during the save; retire them before committing its result.
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.configuration(userId), exact: true });
      if (!isSessionCurrent(snapshot)) return;
      queryClient.setQueryData(queryKeys.notifications.configuration(userId), saved);
      void syncPushRegistration().catch(() => {
        if (isCurrent()) Alert.alert(t('푸시 알림 등록 실패'), t('설정은 저장했지만 푸시 알림을 등록하지 못했어요. 잠시 후 앱을 다시 열어주세요.'));
      });
    } catch {
      if (isCurrent()) Alert.alert(t('설정 변경 실패'), t('알림 설정을 저장하지 못했어요. 다시 시도해주세요.'));
    } finally { savingRef.current = false; setSaving(false); }
  };
  const rows = [
    ['pushEnabled', t('푸시 알림')], ['leaguePushEnabled', t('리그 결과')],
    ['reminderPushEnabled', t('러닝 리마인더')], ['noticePushEnabled', t('운영 공지')],
  ] as const;
  return <TopScreenSafeAreaView style={styles.container}>
    <Header title={t('알림 설정')} />
    {query.isPending ? <ActivityIndicator style={styles.message} /> : query.isError ? <Retry onPress={() => { void query.refetch(); }} /> :
      <ScrollView contentContainerStyle={styles.content}>
        {query.data.pushEnabled && permissionGranted === false && <Text accessibilityRole="alert" style={styles.body}>{t('이 기기의 알림이 차단돼 있어요. 기기 설정에서 허용해주세요.')}</Text>}
        {rows.map(([field, label]) => <View key={field} style={styles.row}>
          <Text style={styles.title}>{label}</Text>
          <Switch accessibilityLabel={label} value={query.data[field]} onValueChange={enabled => { void save(field, enabled); }}
            disabled={saving || (field !== 'pushEnabled' && !query.data.pushEnabled)}
            trackColor={{ false: GREY[200], true: PRIMARY[600] }} thumbColor={GREY.WHITE} />
        </View>)}
        <Text style={styles.body}>{t('푸시를 꺼도 알림함에는 저장돼요.')}</Text>
        <Text style={styles.body}>{t('러닝 리마인더는 마지막 러닝 완료 후 48시간과 72시간에 한 번씩 알려드려요.')}</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => { void Linking.openSettings(); }}><Text>{t('기기 알림 설정')}</Text></TouchableOpacity>
      </ScrollView>}
  </TopScreenSafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GREY[50] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: GREY.WHITE },
  headerTitle: { fontSize: 16, fontWeight: '500', color: GREY[900] },
  icon: { width: 36, minHeight: 36, justifyContent: 'center' },
  content: { padding: 20, gap: 20 },
  item: { padding: 20, gap: 8, borderBottomWidth: 1, borderBottomColor: GREY[100], backgroundColor: GREY.WHITE },
  unread: { backgroundColor: PRIMARY[50] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 16, fontWeight: '600', color: GREY[900], flexShrink: 1 },
  body: { fontSize: 14, lineHeight: 22, color: GREY[700] },
  date: { fontSize: 12, color: GREY[700] },
  badge: { fontSize: 12, color: GREY[700] },
  message: { padding: 24, alignItems: 'center', gap: 16, color: GREY[600] },
  button: { padding: 16, backgroundColor: PRIMARY[50], borderRadius: 8, alignItems: 'center' },
  note: { padding: 20, fontSize: 12, color: GREY[700], textAlign: 'center' },
});
