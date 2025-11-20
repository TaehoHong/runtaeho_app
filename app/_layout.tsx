import { useEffect } from 'react';
import { Stack } from 'expo-router/stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '~/services/queryClient';
import { AuthProvider } from '~/providers/AuthProvider';
import { AppStateProvider } from '~/providers/AppStateProvider';
import { initializeSentry, Sentry } from '~/config/sentry';
import { ErrorBoundary } from '~/shared/components/ErrorBoundary';

// Sentry 초기화
initializeSentry();

// 🔧 개발 환경 전용: API 로깅 인터셉터 등록
if (__DEV__) {
  require('~/config/devSetup');
}

// Sentry 활성화 여부 확인
const isSentryEnabled = (process.env.EXPO_PUBLIC_ENV || 'production') !== 'local';

function RootLayout() {

  // 권한 요청은 AuthProvider에서 로그인 후 한 번만 실행 (중복 제거)

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppStateProvider>
            <Stack>
              <Stack.Screen
                name="index"
                options={{
                  headerShown: false
                }}
              />
              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false
                }}
              />
              <Stack.Screen
                name="auth/login"
                options={{
                  headerShown: false,
                  presentation: 'modal'
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
            </Stack>
          </AppStateProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// Sentry가 활성화되어 있으면 wrap, 아니면 그냥 export
export default isSentryEnabled ? Sentry.wrap(RootLayout) : RootLayout;