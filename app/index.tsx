import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppStore, ViewState } from '~/stores/app/appStore';
import '~/config/apiSetup';

/**
 * 앱의 메인 진입점
 * 인증 상태에 따라 로그인/메인 화면으로 분기
 */
export default function Index() {
  console.log('🚀 [APP] 앱 메인 진입점 시작');

  const viewState = useAppStore((state) => state.viewState);
  const [isInitialized, setIsInitialized] = useState(false);

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

  // Navigation은 AuthProvider에서 처리 (이중 navigation 방지)

  // 앱 초기화 완료까지만 로딩 표시
  if (!isInitialized || viewState === ViewState.Loading) {
    console.log('⏳ [APP] 초기화 로딩 화면 표시');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4d99e5" />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  // 초기화 완료 - AuthProvider가 navigation 처리
  console.log('✅ [APP] 초기화 완료, AuthProvider에게 navigation 위임');
  return null;
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
  }
});
