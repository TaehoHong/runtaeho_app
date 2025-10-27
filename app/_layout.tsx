import { useEffect } from 'react';
import { Stack } from 'expo-router/stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '~/services/queryClient';
import { AuthProvider } from '~/providers/AuthProvider';
import { AppStateProvider } from '~/providers/AppStateProvider';
import { PermissionManager } from '~/features/running/services/PermissionManager';

// 🔧 개발 환경 전용: API 로깅 인터셉터 등록
// 프로덕션 배포 시 이 라인을 제거하거나 Sentry 등으로 대체
if (__DEV__) {
  require('~/config/devSetup');
}

export default function RootLayout() {

  // 권한 요청은 AuthProvider에서 로그인 후 한 번만 실행 (중복 제거)

  return (
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
                name="user"
                options={{
                  headerShown: false
                }}
              />
            </Stack>
        </AppStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}