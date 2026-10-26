import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { t, useAppLanguage } from '~/i18n';
import { TopScreenSafeAreaView } from '~/shared/components';
import { Text } from '~/shared/components/typography';
import { GREY } from '~/shared/styles';
import { getSessionSnapshot, isSessionCurrent, useAuthStore, type SessionSnapshot } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { queryKeys } from '~/services/queryClient';
import { SessionSupersededError } from '~/utils/storage/errors';
import { activityConnectionProviders } from '../providers';
import type { ActivityConnectionProvider } from '../types';

export function ActivityConnectionView() {
  const generation = useAuthStore(state => state.sessionGeneration);
  const userId = useUserStore(state => state.currentUser?.id);
  return <ActivityConnectionScreen key={`${generation}:${userId}`} snapshot={getSessionSnapshot()} />;
}

function ActivityConnectionScreen({ snapshot }: { snapshot: SessionSnapshot }) {
  useAppLanguage();
  const router = useRouter();
  return (
    <TopScreenSafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('뒤로 가기')}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('운동 기록 연동')}</Text><View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {activityConnectionProviders.map(provider => (
          <ActivityConnectionRow key={provider.id} provider={provider} snapshot={snapshot} />
        ))}
      </ScrollView>
    </TopScreenSafeAreaView>
  );
}

function ActivityConnectionRow({ provider, snapshot }: { provider: ActivityConnectionProvider; snapshot: SessionSnapshot }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const key = queryKeys.activityConnections.connection(provider.id, snapshot.userId, snapshot.generation);
  const query = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      if (!isSessionCurrent(snapshot)) throw new SessionSupersededError();
      const connection = await provider.connection(signal);
      if (!isSessionCurrent(snapshot)) throw new SessionSupersededError();
      return connection;
    },
    enabled: snapshot.userId !== null,
    staleTime: 0,
    refetchInterval: query => query.state.data?.status === 'DISCONNECTING' ? 10000 : false,
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (snapshot.userId !== null && isSessionCurrent(snapshot)) void refetch(); }, [refetch, snapshot]));
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active' && isSessionCurrent(snapshot)) void refetch();
    });
    return () => listener.remove();
  }, [refetch, snapshot]);

  const value = query.data;
  const connected = value?.status === 'CONNECTED';
  const reconnect = value?.status === 'RECONNECT_REQUIRED';
  const disconnecting = value?.status === 'DISCONNECTING';
  const disabled = busy || query.isPending || query.isError || !value?.available || disconnecting;
  const status = disconnecting ? t('연결 해제 중') : connected ? t('연결됨')
    : reconnect ? t('재연결이 필요해요') : value && !value.available ? t('준비 중') : undefined;

  async function connect() {
    if (busy || !isSessionCurrent(snapshot)) return;
    setBusy(true);
    try {
      await provider.connect();
      if (isSessionCurrent(snapshot)) await client.invalidateQueries({ queryKey: key });
    } catch (error) {
      if (isSessionCurrent(snapshot) && !(error instanceof SessionSupersededError)) {
        Alert.alert(t(provider.messages.title), t(provider.messages.connectError));
        await client.invalidateQueries({ queryKey: key });
      }
    } finally { if (isSessionCurrent(snapshot)) setBusy(false); }
  }

  async function disconnect() {
    if (busy || !isSessionCurrent(snapshot)) return;
    setBusy(true);
    try {
      const response = await provider.disconnect();
      if (isSessionCurrent(snapshot)) client.setQueryData(key, response);
    } catch (error) {
      if (isSessionCurrent(snapshot) && !(error instanceof SessionSupersededError)) {
        Alert.alert(t(provider.messages.title), t('연결 해제 상태를 확인하지 못했어요. 다시 시도해 주세요.'));
        await client.invalidateQueries({ queryKey: key });
      }
    } finally { if (isSessionCurrent(snapshot)) setBusy(false); }
  }

  function confirmDisconnect() {
    if (disabled || !isSessionCurrent(snapshot)) return;
    Alert.alert(t(provider.messages.disconnectTitle), t(provider.messages.disconnectDescription), [
      { text: t('취소'), style: 'cancel' },
      { text: t('연결 해제'), style: 'destructive', onPress: () => { void disconnect(); } },
    ]);
  }

  return (
    <>
        <Pressable accessibilityRole="button" accessibilityLabel={provider.name}
          accessibilityHint={connected ? t('연결 해제 확인') : t(provider.messages.loginHint)}
          accessibilityValue={{ text: query.isPending ? t('연결 상태 불러오는 중') : status ?? t('연결 안 됨') }}
          accessibilityState={{ disabled, busy: busy || query.isPending || disconnecting }} disabled={disabled}
          style={({ pressed }) => [styles.appRow, pressed && styles.pressed]}
          onPress={connected ? confirmDisconnect : () => { void connect(); }}>
          <Image source={provider.icon} style={styles.appIcon}
            resizeMode="contain" accessible={false} importantForAccessibility="no" />
          <View style={styles.appLabels}>
            <Text style={styles.appName}>{provider.name}</Text>
            {status && <Text style={styles.status}>{status}</Text>}
          </View>
          <View accessible={false} importantForAccessibility="no-hide-descendants">
            {busy || query.isPending || disconnecting ? <ActivityIndicator color={GREY[700]} />
              : <Ionicons name="chevron-forward" size={20} color={GREY[700]} />}
          </View>
        </Pressable>
        {query.isError && <View style={styles.feedback}>
          <Text accessibilityRole="alert" style={styles.status}>{t('연결 상태를 불러오지 못했어요.')}</Text>
          <Pressable accessibilityRole="button" onPress={() => { void refetch(); }}
            style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
            <Text style={styles.actionLabel}>{t('다시 시도')}</Text>
          </Pressable>
        </View>}
        {value && !value.available && !query.isError && <Text style={styles.status}>
          {t(provider.messages.unavailable)}
        </Text>}
        {reconnect && <Pressable accessibilityRole="button" disabled={disabled}
          accessibilityState={{ disabled }} onPress={confirmDisconnect}
          style={({ pressed }) => [styles.textButton, disabled && styles.disabled, pressed && styles.pressed]}>
          <Text style={styles.actionLabel}>{t('연결 해제')}</Text>
        </Pressable>}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GREY[50] },
  header: { minHeight: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flexShrink: 1, fontSize: 16, fontWeight: '500', color: GREY[900] },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, paddingTop: 12, gap: 12 },
  appRow: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: GREY.WHITE, borderRadius: 8, padding: 16 },
  appIcon: { width: 44, height: 44 },
  appLabels: { flex: 1, gap: 2 },
  appName: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: GREY[900] },
  status: { fontSize: 14, lineHeight: 22, fontWeight: '500', color: GREY[600] },
  feedback: { gap: 4 },
  textButton: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 16 },
  actionLabel: { fontSize: 14, fontWeight: '500', color: GREY[700] },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
