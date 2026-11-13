import { Stack } from 'expo-router/stack';
import { useNavigationContainerRef } from 'expo-router';
import { DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { useEffect } from 'react';
import { AdsProvider } from '~/features/ads/AdsProvider';
import { NotificationProvider } from '~/features/notifications/NotificationProvider';
import { LanguageProvider } from '~/i18n/LanguageProvider';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '~/services/queryClient';
import { AuthProvider } from '~/providers/AuthProvider';
import { AppStateProvider } from '~/providers/AppStateProvider';
import { UpdateProvider } from '~/features/updates';
import { ForceUpdateProvider } from '~/features/forceUpdate';
import { GlobalUnityHost } from '~/features/unity/components/GlobalUnityHost';
import { initializeSentry, isSentryEnabled, registerSentryNavigationContainer, Sentry } from '~/config/sentry';
import { ErrorBoundary } from '~/shared/components/ErrorBoundary';
import { GREY } from '~/shared/styles';
import { useShareEntryTransitionStore } from '~/features/share/stores/shareEntryTransitionStore';
import { useUnityStore } from '~/stores/unity/unityStore';
import { releaseTransitionSnapshot } from '~/features/unity/services/transitionSnapshot';

// Sentry 초기화
initializeSentry();

// 🔧 개발 환경 전용: API 로깅 인터셉터 등록
if (__DEV__) {
  void import('~/services/api/interceptors');
}

const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent' },
};

function RootLayout() {
  const navigationRef = useNavigationContainerRef();
  const exitSnapshot = useUnityStore((state) => state.exitSnapshot);
  useEffect(() => () => {
    if (exitSnapshot?.uri) releaseTransitionSnapshot(exitSnapshot.uri);
  }, [exitSnapshot]);
  useEffect(() => {
    registerSentryNavigationContainer(navigationRef);
  }, [navigationRef]);

  // 권한 요청은 AuthProvider에서 로그인 후 한 번만 실행 (중복 제거)
  const isShareEntryTransitionActive = useShareEntryTransitionStore(
    (state) => state.isEntryTransitionActive
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
        <ForceUpdateProvider
          checkOnLaunch={true}
          checkOnForeground={true}
        >
          <AuthProvider>
            <NotificationProvider />
            <AdsProvider>
            <AppStateProvider>
              <UpdateProvider
                checkOnLaunch={false}
                checkOnForeground={true}
                showBanner={false}
                autoDownload={false}
              >
                <ThemeProvider value={navigationTheme}>
                <View style={{ flex: 1, backgroundColor: GREY.WHITE }}>
                  <GlobalUnityHost />
                  <Stack screenListeners={({ navigation }) => ({
                    transitionEnd: (event) => {
                      const state = navigation.getState();
                      const exit = useUnityStore.getState().pendingViewportExit;
                      const snapshot = useUnityStore.getState().exitSnapshot;
                      if (
                        !event.data.closing
                        && event.target === state.routes[state.index]?.key
                      ) {
                        if (exit) useUnityStore.getState().completeViewportExit(exit.routeKey);
                        if (snapshot && snapshot.sourceRootRouteKey !== event.target) {
                          snapshot.onDestinationReady();
                        }
                      }
                    },
                  })}>
                    <Stack.Screen
                      name="index"
                      options={{
                        headerShown: false,
                      }}
                    />
                    <Stack.Screen
                      name="(tabs)"
                      options={{
                        headerShown: false,
                        // Android replace uses the incoming screen's animation.
                        animation: Platform.OS === 'android' ? 'none' : undefined,
                        contentStyle: { backgroundColor: 'transparent' },
                      }}
                    />
                    <Stack.Screen
                      name="auth/login"
                      options={{
                        headerShown: false,
                        animation: 'none'
                      }}
                    />
                    <Stack.Screen
                      name="shoes/add-shoe"
                      options={{
                        headerShown: false,
                        presentation: 'modal'
                      }}
                    />
                    <Stack.Screen
                      name="user"
                      listeners={({ route }) => ({
                        beforeRemove: () => useUnityStore.getState().beginViewportExit('avatar', route.key),
                      })}
                      options={{
                        headerShown: false,
                        animation: 'none',
                        contentStyle: { backgroundColor: 'transparent' },
                      }}
                    />
                    <Stack.Screen
                      name="league"
                      options={{
                        headerShown: false,
                        contentStyle: { backgroundColor: 'transparent' },
                      }}
                    />
                    <Stack.Screen
                      name="share"
                      listeners={({ route }) => ({
                        beforeRemove: () => useUnityStore.getState().beginViewportExit('share', route.key),
                      })}
                      options={{
                        headerShown: false,
                        animation: 'none',
                        contentStyle: { backgroundColor: 'transparent' },
                      }}
                    />
                    <Stack.Screen
                      name="running-record-detail"
                      options={{
                        headerShown: false,
                        animation: 'none',
                      }}
                    />
                  </Stack>
                  {isShareEntryTransitionActive && (
                    <View
                      pointerEvents="none"
                      style={styles.shareEntryTransitionCover}
                      testID="share-entry-transition-cover"
                    />
                  )}
                  {exitSnapshot && (
                    <View
                      style={[
                        styles.shareEntryTransitionCover,
                        exitSnapshot.uri && styles.snapshotLoadingCover,
                      ]}
                      testID="unity-exit-transition-cover"
                      onLayout={!exitSnapshot.uri ? exitSnapshot.onReady : undefined}
                    >
                      {exitSnapshot.uri && (
                        <Image
                          source={{ uri: exitSnapshot.uri }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="stretch"
                          fadeDuration={0}
                          onLoad={exitSnapshot.onReady}
                          onError={() => {
                            if (useUnityStore.getState().exitSnapshot !== exitSnapshot) return;
                            useUnityStore.getState().setExitSnapshot({ ...exitSnapshot, uri: null });
                            requestAnimationFrame(exitSnapshot.onReady);
                          }}
                        />
                      )}
                    </View>
                  )}
                </View>
                </ThemeProvider>
              </UpdateProvider>
            </AppStateProvider>
            </AdsProvider>
          </AuthProvider>
        </ForceUpdateProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  shareEntryTransitionCover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: GREY[50],
    zIndex: 10,
  },
  snapshotLoadingCover: {
    backgroundColor: 'transparent',
  },
});

// Sentry가 활성화되어 있으면 wrap, 아니면 그냥 export
export default isSentryEnabled() ? Sentry.wrap(RootLayout) : RootLayout;
