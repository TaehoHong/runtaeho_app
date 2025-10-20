import { router } from 'expo-router';
import React, { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useAppStore, ViewState } from '../stores/app/appStore';
import { useAuthStore } from '../features/auth/stores/authStore';
import { useAuth } from '../features/auth/hooks/useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 인증 상태를 관리하고 로그인 상태에 따라 네비게이션을 제어하는 Provider
 *
 * 현업 표준 패턴:
 * - UserStateManager 제거
 * - useAuth hook으로 통합 인증 관리
 * - Zustand persist 자동 복원
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const setViewState = useAppStore((state) => state.setViewState);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const { verifyAndRefreshToken } = useAuth();
  const [hasRequestedPermissions, setHasRequestedPermissions] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  /**
   * 앱 시작 시 저장된 인증 상태 복원
   *
   * 단순화된 로직:
   * 1. Zustand persist가 자동으로 AsyncStorage 복원
   * 2. SecureStorage 토큰 동기화
   * 3. 토큰 검증 (useAuth hook 사용)
   */
  const initializeAuthState = useCallback(async () => {
    try {
      console.log('🔍 [AuthProvider] 저장된 인증 상태 확인 중...');

      // 1. AuthStore에 SecureStorage 토큰 동기화
      const initializeTokens = useAuthStore.getState().initializeTokens;
      await initializeTokens();

      // 2. 토큰 검증 및 자동 갱신 (useAuth hook)
      await verifyAndRefreshToken();

      console.log('✅ [AuthProvider] 인증 상태 복원 완료');
    } catch (error) {
      console.error('⚠️ [AuthProvider] 인증 상태 초기화 실패:', error);
    }
  }, [verifyAndRefreshToken]);

  useEffect(() => {
    console.log('🔐 [AuthProvider] 인증 상태 초기화 시작');
    initializeAuthState();

    // 네비게이션 준비 완료 표시 (Root Layout 마운트 대기)
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [initializeAuthState]);

  useEffect(() => {
    // 네비게이션이 준비되지 않았으면 대기
    if (!isNavigationReady) {
      console.log('⏳ [AuthProvider] 네비게이션 준비 대기 중...');
      return;
    }

    console.log('🔄 [AuthProvider] 로그인 상태 변경:', isLoggedIn);

    // 로그인 상태에 따라 네비게이션 제어
    try {
      if (isLoggedIn) {
        console.log('✅ [AuthProvider] 로그인 상태 - 메인 화면으로 이동');
        // ViewState를 Loaded로 설정하여 탭바 표시 보장
        setViewState(ViewState.Loaded);

        // 네비게이션 시도
        router.replace('/(tabs)/running');
        console.log('✅ [AuthProvider] 네비게이션 성공: /(tabs)');

        // iOS와 동일한 권한 요청 (로그인 완료 후 한 번만)
        if (!hasRequestedPermissions) {
          requestPermissionsOnFirstLogin();
          setHasRequestedPermissions(true);
        }
      } else {
        console.log('❌ [AuthProvider] 로그아웃 상태 - 로그인 화면으로 이동');
        router.replace('/auth/login');
      }
    } catch (error) {
      console.warn('⚠️ [AuthProvider] 네비게이션 실패, 재시도 예약:', error);
      // 네비게이션 실패시 잠시 후 재시도
      setTimeout(() => {
        setIsNavigationReady(false);
        setTimeout(() => setIsNavigationReady(true), 200);
      }, 500);
    }
  }, [isLoggedIn, hasRequestedPermissions, isNavigationReady]);

  /**
   * 로그인 완료 후 권한 요청
   */
  const requestPermissionsOnFirstLogin = async () => {
    try {
      console.log('🔐 [AuthProvider] 로그인 후 권한 요청 시작');

      // 메인 스레드에서 권한 요청을 지연 실행
      setTimeout(async () => {
        try {
          // 동적 import로 권한 모듈 로드
          const [Location, Notifications] = await Promise.all([
            import('expo-location'),
            import('expo-notifications')
          ]);

          // 위치 권한 요청 (러닝 앱에 필수)
          const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
          console.log('📍 [AuthProvider] 위치 권한 상태:', locationStatus);

          // 알림 권한 요청
          const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
          console.log('🔔 [AuthProvider] 알림 권한 상태:', notificationStatus);
        } catch (error) {
          console.error('⚠️ [AuthProvider] 권한 요청 실패:', error);
        }
      }, 1000);

    } catch (error) {
      console.error('⚠️ [AuthProvider] 권한 요청 스케줄링 실패:', error);
    }
  };


  return <>{children}</>;
};
