import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Login } from '../src/features/auth/views/login';

export default function Index() {
  console.log('🚀 [APP] 앱 시작 - 로그인 화면으로 이동');

  const [isLoading, setIsLoading] = useState(true);
  const [loginComponent, setLoginComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 [APP] Login 컴포넌트 로딩 시작');

    const loadLoginComponent = async () => {
      try {
        console.log('📦 [APP] Login 컴포넌트 import 시도');

        // Login 컴포넌트가 이미 import되어 있으므로 직접 사용
        setLoginComponent(() => Login);
        console.log('✅ [APP] Login 컴포넌트 로딩 성공');

      } catch (error: any) {
        console.error('❌ [APP] Login 컴포넌트 로딩 실패:', error);
        setError(`로그인 화면 로딩 실패: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    // 약간의 로딩 시간을 두어 자연스럽게 처리
    const timer = setTimeout(loadLoginComponent, 500);

    return () => clearTimeout(timer);
  }, []);

  // 로딩 중
  if (isLoading) {
    console.log('⏳ [APP] 로딩 화면 표시');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>런태호 앱 시작 중...</Text>
      </View>
    );
  }

  // 오류 발생
  if (error) {
    console.log('❌ [APP] 오류 화면 표시:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>앱 시작 오류</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // 로그인 화면 렌더링
  if (loginComponent) {
    console.log('🎯 [APP] 로그인 화면 렌더링');
    const LoginComponent = loginComponent;
    return <LoginComponent />;
  }

  // 예상치 못한 상황
  console.log('⚠️ [APP] 예상치 못한 상태');
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>알 수 없는 오류</Text>
      <Text style={styles.errorText}>앱을 다시 시작해주세요.</Text>
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