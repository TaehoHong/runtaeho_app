import { Stack } from 'expo-router/stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '~/services/queryClient';
import { AuthProvider } from '~/providers/AuthProvider';
import { AppStateProvider } from '~/providers/AppStateProvider';
import { registerServices, analyzeDependencies } from '~/shared/di';
import { performComprehensiveArchitectureAnalysis, printArchitectureReport, getHealthGrade } from '~/shared/utils/architectureHealthChecker';

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

    // 개발 모드에서만 아키텍처 분석 수행
    // if (__DEV__) {
    //   const architectureReport = performComprehensiveArchitectureAnalysis();
    //   printArchitectureReport(architectureReport);

    //   const healthGrade = getHealthGrade(architectureReport.healthScore.overall);
    //   console.log(`🏥 아키텍처 건강성: ${architectureReport.healthScore.overall}/100 (${healthGrade})`);

    //   if (architectureReport.healthScore.overall < 70) {
    //     console.warn('⚠️ 아키텍처 개선이 필요합니다.');
    //   }
    // }

    console.log('✅ DI 컨테이너 및 아키텍처 분석 완료');
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
              <Stack.Screen
                name="unity-test"
                options={{
                  title: 'Unity Bridge 테스트',
                  headerShown: true
                }}
              />
            </Stack>
        </AppStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}