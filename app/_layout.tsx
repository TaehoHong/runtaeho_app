import { Stack } from 'expo-router/stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '~/services/queryClient';
import { AuthProvider } from '~/providers/AuthProvider';
import { AppStateProvider } from '~/providers/AppStateProvider';
import { registerServices } from '~/shared/di';

// 🔧 개발 환경 전용: API 로깅 인터셉터 등록
// 프로덕션 배포 시 이 라인을 제거하거나 Sentry 등으로 대체
if (__DEV__) {
  require('~/config/devSetup');
}

export default function RootLayout() {
  console.log('🏠 RootLayout 렌더링 시작 (Redux + Unity Bridge + Auth 포함)');

  // DI 컨테이너 초기화 및 아키텍처 분석
  try {
    registerServices();

  } catch (error) {
    console.error('❌ DI 컨테이너 초기화 실패:', error);
  }

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
                name="auth"
                options={{
                  headerShown: false,
                  presentation: 'modal'
                }}
              />
            </Stack>
        </AppStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}