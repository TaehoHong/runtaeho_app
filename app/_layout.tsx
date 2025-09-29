import { Stack } from 'expo-router/stack';
import { Provider } from 'react-redux';
import { store } from '~/store';
// import { UnityBridgeProvider } from '~/contexts/UnityBridgeContext'; // 제거: Redux + Service 패턴 사용
import { AuthProvider } from '~/providers/AuthProvider';
import { AppStateProvider } from '~/providers/AppStateProvider';
import { registerServices, analyzeDependencies } from '~/shared/di';
import { performComprehensiveArchitectureAnalysis, printArchitectureReport, getHealthGrade } from '~/shared/utils/architectureHealthChecker';

export default function RootLayout() {
  console.log('🏠 RootLayout 렌더링 시작 (Redux + Unity Bridge + Auth 포함)');

  // DI 컨테이너 초기화 및 아키텍처 분석
  try {
    registerServices();

    // 개발 모드에서만 아키텍처 분석 수행
    if (__DEV__) {
      const architectureReport = performComprehensiveArchitectureAnalysis();
      printArchitectureReport(architectureReport);

      const healthGrade = getHealthGrade(architectureReport.healthScore.overall);
      console.log(`🏥 아키텍처 건강성: ${architectureReport.healthScore.overall}/100 (${healthGrade})`);

      if (architectureReport.healthScore.overall < 70) {
        console.warn('⚠️ 아키텍처 개선이 필요합니다.');
      }
    }

    console.log('✅ DI 컨테이너 및 아키텍처 분석 완료');
  } catch (error) {
    console.error('❌ DI 컨테이너 초기화 실패:', error);
  }

  return (
    <Provider store={store}>
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
    </Provider>
  );
}