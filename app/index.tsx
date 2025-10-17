import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppStore, ViewState } from '~/stores/app/appStore';
import { router } from 'expo-router';
import '~/config/apiSetup';
import { useAuthStore } from '~/stores';
import * as Font from 'expo-font'

/**
 * 앱의 메인 진입점
 * 인증 상태에 따라 로그인/메인 화면으로 분기
 */
export default function Index() {
  console.log('🚀 [APP] 앱 메인 진입점 시작');

  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const viewState = useAppStore((state) => state.viewState);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fontsLoaded] = Font.useFonts({
    'Pretendard-Thin': require('../assets/fonts/Pretendard-Thin.ttf'),
    'Pretendard-ExtraLight': require('../assets/fonts/Pretendard-ExtraLight.ttf'),
    'Pretendard-Light': require('../assets/fonts/Pretendard-Light.ttf'),
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.ttf'),
    'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.ttf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.ttf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.ttf'),
    'Pretendard-ExtraBold': require('../assets/fonts/Pretendard-ExtraBold.ttf'),
    'Pretendard-Black': require('../assets/fonts/Pretendard-Black.ttf'),
    'Cafe24Proup': require('../assets/fonts/Cafe24PROUP.ttf'),
  });

  useEffect(() => {
    console.log('🔄 [APP] 앱 초기화 시작');

    const initializeApp = async () => {
      try {
        // 약간의 딜레이를 둘어 초기화 완료 보장
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ [APP] 앱 초기화 실패:', error);
        setIsInitialized(true); // 오류가 있어도 계속 진행
      }
    };
    initializeApp();
  }, []);

  useEffect(() => {
    // 초기화가 완료된 후 로그인 상태에 따라 네비게이션
    if (isInitialized && viewState === ViewState.Loaded) {
      console.log('🔄 [APP] 로그인 상태 확인:', isLoggedIn);

      if (isLoggedIn) {
        console.log('✅ [APP] 로그인 상태 - 메인 탭으로 이동');
        // 여러 경로 시도
        try {
          router.replace('/(tabs)/running');
          console.log('✅ [APP] 네비게이션 성공: /(tabs)/running');
        } catch (error) {
          console.log('⚠️ [APP] /(tabs)/running 실패, /(tabs) 시도');
          try {
            router.replace('/(tabs)' as any);
        console.log('✅ [APP] 네비게이션 성공: /(tabs)');
          } catch (error2) {
            console.log('⚠️ [APP] /(tabs) 실패, push 시도');
            router.push('/(tabs)' as any);
          }
        }
      } else {
        console.log('❌ [APP] 로그아웃 상태 - 로그인 화면으로 이동');
        router.replace('/auth/login');
      }
    }
  }, [isInitialized, isLoggedIn, viewState]);

  // iOS RootView와 동일한 로딩 화면
  if (!isInitialized || viewState === ViewState.Loading) {
    console.log('⏳ [APP] 초기화 로딩 화면 표시');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4d99e5" />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  // 초기화 완료 후 대기 화면
  // AuthProvider에서 자동으로 로그인/메인 화면으로 리다이렉트
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4d99e5" />
      <Text style={styles.loadingText}>네비게이션 준비 중...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  fonts: {
    fontFamily: "Pretendard"
  }
});