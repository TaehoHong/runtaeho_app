import { Stack } from 'expo-router/stack';
import { StyleSheet, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '~/services/queryClient';
import { AuthProvider } from '~/providers/AuthProvider';
import { AppStateProvider } from '~/providers/AppStateProvider';
import { UpdateProvider } from '~/features/updates';
import { ForceUpdateProvider } from '~/features/forceUpdate';
import { GlobalUnityHost } from '~/features/unity/components/GlobalUnityHost';
import { initializeSentry, Sentry } from '~/config/sentry';
import { ErrorBoundary } from '~/shared/components/ErrorBoundary';
import { GREY } from '~/shared/styles';
import { useShareEntryTransitionStore } from '~/features/share/stores/shareEntryTransitionStore';

// Sentry 초기화
initializeSentry();

// 🔧 개발 환경 전용: API 로깅 인터셉터 등록
if (__DEV__) {
  void import('~/services/api/interceptors');
}

// Sentry 활성화 여부 확인
const isSentryEnabled = (process.env.EXPO_PUBLIC_ENV || 'production') !== 'local';

function RootLayout() {
  // 권한 요청은 AuthProvider에서 로그인 후 한 번만 실행 (중복 제거)
  const isShareEntryTransitionActive = useShareEntryTransitionStore(
    (state) => state.isEntryTransitionActive
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ForceUpdateProvider
          checkOnLaunch={true}
          checkOnForeground={true}
        >
          <AuthProvider>
            <AppStateProvider>
              <UpdateProvider
                checkOnLaunch={false}
                checkOnForeground={true}
                showBanner={false}
                autoDownload={false}
              >
                <View style={{ flex: 1, backgroundColor: GREY.WHITE }}>
                  <GlobalUnityHost />
                  <Stack>
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
                      options={{
                        headerShown: false
                      }}
                    />
                    <Stack.Screen
                      name="league"
                      options={{
                        headerShown: false
                      }}
                    />
                    <Stack.Screen
                      name="share"
                      options={{
                        headerShown: false,
                        animation: 'none',
                        contentStyle: { backgroundColor: 'transparent' },
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
                </View>
              </UpdateProvider>
            </AppStateProvider>
          </AuthProvider>
        </ForceUpdateProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  shareEntryTransitionCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GREY[50],
    zIndex: 10,
  },
});

// Sentry가 활성화되어 있으면 wrap, 아니면 그냥 export
export default isSentryEnabled ? Sentry.wrap(RootLayout) : RootLayout;
