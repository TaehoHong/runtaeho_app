import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useUserStore } from '~/stores/user/userStore';
import { useAppStore, ViewState } from '~/stores/app/appStore';
import { router } from 'expo-router';

// API 인터셉터 초기화 (TokenRefreshInterceptor 등록)
import '~/config/apiSetup';
import { useAuthStore } from '~/stores';

/**
 * 앱의 메인 진입점
 * iOS RootView와 RunTaehoApp 로직 대응
 * 인증 상태에 따라 로그인/메인 화면으로 분기
 */
export default function Index() {
  console.log('🚀 [APP] 앱 메인 진입점 시작');

  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const viewState = useAppStore((state) => state.viewState);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('🔄 [APP] 앱 초기화 시작');

    // iOS RootView의 초기화 로직 대응
    const initializeApp = async () => {
      try {
        // 약간의 딩레이를 둘어 초기화 완료 보장
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('✅ [APP] 앱 초기화 완료');
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
  console.log('⏳ [APP] 네비게이션 대기 중...');
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
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
});