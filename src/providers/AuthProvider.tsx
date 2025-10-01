import { router } from 'expo-router';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { UserStateManager } from '../shared/services/userStateManager';
import { useAppStore, ViewState } from '../stores/app/appStore';
import { useAuthStore } from '../stores/auth/authStore';
import { useUserStore } from '~/stores';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 인증 상태를 관리하고 로그인 상태에 따라 네비게이션을 제어하는 Provider
 * iOS RootView와 UserStateManager 로직 대응
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const setViewState = useAppStore((state) => state.setViewState);
  const { isLoggedIn, restoreAuthState } = useUserStore();
  const [hasRequestedPermissions, setHasRequestedPermissions] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  /**
   * 앱 시작 시 저장된 인증 상태 복원
   * iOS UserStateManager.loadUserState() 대응
   */
  const initializeAuthState = useCallback(async () => {
    try {
      console.log('🔍 [AuthProvider] 저장된 인증 상태 확인 중...');

      const userStateManager = UserStateManager.getInstance();

      // UserStateManager에서 인증 상태 복원 및 동기화 처리
      const authResult = await userStateManager.initializeWithBackendSync();

      if (authResult.success && authResult.userData) {
        console.log('✅ [AuthProvider] 인증 상태 복원 및 동기화 성공');
        restoreAuthState(authResult.userData);
      } else {
        console.log('❌ [AuthProvider] 인증 상태 복원 실패 또는 로그아웃 상태');
      }
    } catch (error) {
      console.error('⚠️ [AuthProvider] 인증 상태 초기화 실패:', error);
    }
  }, [restoreAuthState]);

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

        // 네비게이션 시도 (여러 방법 시도)
        try {
          router.replace('/(tabs)/running');
          console.log('✅ [AuthProvider] 네비게이션 성공: /(tabs)/running');
        } catch (navError) {
          console.log('⚠️ [AuthProvider] /(tabs)/running 실패, /(tabs) 시도');
          try {
            router.replace('/(tabs)' as any);
            console.log('✅ [AuthProvider] 네비게이션 성공: /(tabs)');
          } catch (navError2) {
            console.log('⚠️ [AuthProvider] /(tabs) 실패, push 시도');
            router.push('/(tabs)/running');
          }
        }

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
   * JWT 토큰 유효성 간단 검증
   * iOS UserStateManager.parseTokenPayload() 대응
   */
  const isTokenValid = (token: string): boolean => {
    try {
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      const currentTime = Math.floor(Date.now() / 1000);

      return decodedPayload.exp > currentTime;
    } catch (error) {
      console.error('⚠️ [AuthProvider] 토큰 파싱 실패:', error);
      return false;
    }
  };

  /**
   * 로그인 완료 후 권한 요청
   * iOS PermissionManager.shared.requestAllPermissionsOnFirstLaunch() 대응
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
