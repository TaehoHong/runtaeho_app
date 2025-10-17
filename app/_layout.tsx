import { useEffect } from 'react';
import { Stack } from 'expo-router/stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '~/services/queryClient';
import { AuthProvider } from '~/providers/AuthProvider';
import { AppStateProvider } from '~/providers/AppStateProvider';
import { registerServices } from '~/shared/di';
import { PermissionManager } from '~/features/running/services/PermissionManager';

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

  // 앱 시작 시 모든 권한 요청
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const permissionManager = PermissionManager.getInstance();
        const result = await permissionManager.requestAllPermissions();

        if (result.allGranted) {
          console.log('✅ 모든 권한 승인됨');
        } else {
          console.warn('⚠️ 일부 권한이 거부됨:', result.missingPermissions);
          // 필수 권한 체크
          const hasRequired = await permissionManager.hasRequiredPermissions();
          if (!hasRequired) {
            console.error('❌ 필수 권한(위치)이 없습니다.');
            // TODO: 권한 요청 실패 시 사용자에게 안내 화면 표시
          }
        }
      } catch (error) {
        console.error('❌ 권한 요청 실패:', error);
      }
    };

    requestPermissions();
  }, []);

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