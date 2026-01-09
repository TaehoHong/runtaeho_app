import { router } from 'expo-router';
import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useAuthStore } from '../features/auth/stores/authStore';
import { ViewState, useAppStore } from '../stores';
import { isAgreedOnTermsFromToken } from '~/features/auth/utils/jwtUtils';
import { useLeagueCheck } from '../features/league/hooks/useLeagueCheck';
import { useOfflineSync } from '../features/running/hooks/useOfflineSync';
import { usePermissionRequest } from '../shared/hooks/usePermissionRequest';

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
  const accessToken = useAuthStore((state) => state.accessToken);
  const { verifyAndRefreshToken } = useAuth();
  const { syncOfflineData } = useOfflineSync();
  const { requestPermissionsOnFirstLogin } = usePermissionRequest();
  const { checkUncheckedLeagueResult, skipLeagueCheck, checkStatus } = useLeagueCheck();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  /**
   * 앱 시작 시 저장된 인증 상태 복원 및 오프라인 데이터 동기화
   *
   * 단순화된 로직:
   * 1. Zustand persist가 자동으로 AsyncStorage 복원
   * 2. SecureStorage 토큰 동기화
   * 3. 토큰 검증 (useAuth hook 사용)
   * 4. 오프라인 러닝 데이터 자동 동기화
   */
  const initializeAuthState = useCallback(async () => {
    try {
      console.log('🔍 [AuthProvider] 저장된 인증 상태 확인 중...');

      // 1. AuthStore에 SecureStorage 토큰 동기화
      const initializeTokens = useAuthStore.getState().initializeTokens;
      await initializeTokens();

      // 2. 토큰 검증 및 자동 갱신 (useAuth hook)
      const isTokenValid = await verifyAndRefreshToken();

      // 3. 로그인 상태이고 토큰이 유효하면 오프라인 데이터 동기화 및 리그 결과 확인
      if (isTokenValid && useAuthStore.getState().isLoggedIn) {
        await syncOfflineData();

        // 4. 미확인 리그 결과 확인 (앱 첫 진입 시 결과 화면 표시용)
        await checkUncheckedLeagueResult();
      } else {
        // 로그인 안 된 상태면 리그 결과 확인 스킵 (checked 상태로 설정)
        skipLeagueCheck();
      }

      console.log('✅ [AuthProvider] 인증 상태 복원 완료');
    } catch (error) {
      console.error('⚠️ [AuthProvider] 인증 상태 초기화 실패:', error);
    }
  }, [verifyAndRefreshToken, syncOfflineData, checkUncheckedLeagueResult, skipLeagueCheck]);

  useEffect(() => {
    const init = async () => {
      console.log('🔐 [AuthProvider] 인증 상태 초기화 시작');
      await initializeAuthState();
      // 토큰 초기화 완료 후 네비게이션 준비 완료 표시
      // 기존 100ms setTimeout 제거 → Race Condition 방지
      setIsNavigationReady(true);
    };
    init();
  }, [initializeAuthState]);

  /**
   * 로그인 상태 변경 시 리그 결과 확인
   * - 새로 로그인한 경우에도 리그 결과를 확인해야 함
   */
  useEffect(() => {
    const checkLeagueResultOnLogin = async () => {
      // 로그인 상태이고 아직 리그 결과를 확인하지 않았으면 확인
      if (isLoggedIn && checkStatus === 'idle') {
        console.log('🏆 [AuthProvider] 로그인 상태 변경 감지 → 리그 결과 확인');
        await checkUncheckedLeagueResult();
      }
    };

    checkLeagueResultOnLogin();
  }, [isLoggedIn, checkStatus]);

  /**
   * 인증 상태에 따른 네비게이션 제어
   *
   * 의존성:
   * - isLoggedIn: 로그인 여부
   * - accessToken: 토큰 변경 감지 (약관 동의 후 토큰 재발행 시 필수)
   * - isNavigationReady: 네비게이션 준비 완료 여부
   * - checkStatus: 리그 결과 확인 상태 (idle/checking/checked)
   * - pendingResult: 미확인 리그 결과
   *
   * 플로우:
   * 1. 로그인 → isLoggedIn=true, 약관 미동의 토큰 → /auth/terms-agreement
   * 2. 약관 동의 완료 → 토큰 재발행 (isAgreedOnTerms=true) → accessToken 변경 → useEffect 재실행
   * 3. 새 토큰 확인 → isAgreedOnTerms=true
   * 4. 미확인 리그 결과 있으면 → /league/result
   * 5. 미확인 리그 결과 없으면 → /(tabs)/running
   */
  useEffect(() => {
    console.log('🔄 [AuthProvider] useEffect 실행 - isLoggedIn:', isLoggedIn, 'hasToken:', !!accessToken, 'isNavigationReady:', isNavigationReady, 'checkStatus:', checkStatus);

    // 네비게이션이 준비되지 않았으면 대기
    if (!isNavigationReady) {
      console.log('⏳ [AuthProvider] 네비게이션 준비 대기 중...');
      return;
    }

    console.log('🔄 [AuthProvider] 인증 상태 확인 - isLoggedIn:', isLoggedIn, 'hasToken:', !!accessToken);

    // 로그인 상태에 따라 네비게이션 제어
    try {
      if (isLoggedIn) {
        // 토큰에서 약관 동의 여부 확인
        const accessToken = useAuthStore.getState().accessToken;

        if (accessToken) {
          const isAgreedOnTerms = isAgreedOnTermsFromToken(accessToken);

          if (!isAgreedOnTerms) {
            // 약관 미동의 → 약관 동의 화면으로
            console.log('📄 [AuthProvider] 약관 미동의 → 약관 동의 화면으로 이동');
            router.replace('/auth/terms-agreement');
            return;
          }
        }

        // 리그 결과 확인이 완료될 때까지 대기
        if (checkStatus !== 'checked') {
          console.log('⏳ [AuthProvider] 리그 결과 확인 대기 중... (checkStatus:', checkStatus, ')');
          return;
        }

        // ViewState를 Loaded로 설정하여 탭바 표시 보장
        setViewState(ViewState.Loaded);

        // 미확인 리그 결과가 있어도 러닝 탭으로 이동
        // RunningView/LeagueView에서 pendingResult 감지하여 결과 화면으로 push
        // 이렇게 하면 back 스택에 탭이 유지되어 확인 후 해당 탭으로 정상 복귀
        console.log('✅ [AuthProvider] 로그인 상태 - 메인 화면으로 이동');
        router.replace('/(tabs)/running');
        console.log('✅ [AuthProvider] 네비게이션 성공: /(tabs)');

        // iOS와 동일한 권한 요청 (로그인 완료 후 한 번만, Hook 내부에서 중복 방지)
        requestPermissionsOnFirstLogin();
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
  }, [isLoggedIn, accessToken, isNavigationReady, checkStatus, setViewState]);

  return <>{children}</>;
};
