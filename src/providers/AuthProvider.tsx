import { useWatchSync } from '~/features/watchSync/useWatchSync';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useAuthStore, getSessionSnapshot, isSessionCurrent, isSessionGenerationCurrent, waitForAuthHydration } from '../features/auth/stores/authStore';
import { isAgreedOnTermsFromToken } from '~/features/auth/utils/jwtUtils';
import { useOfflineSync } from '../features/running/hooks/useOfflineSync';
import { useAppStore, ViewState } from '~/stores';
import { useUpdateStore } from '~/features/updates';

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
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const sessionGeneration = useAuthStore((state) => state.sessionGeneration);
  const requiresTermsAgreement = useAuthStore((state) =>
    state.isLoggedIn && !!state.accessToken && !isAgreedOnTermsFromToken(state.accessToken)
  );
  const { verifyAndRefreshToken, refreshUserData, user } = useAuth();
  const userId = user?.id;
  const { syncOfflineData } = useOfflineSync();
  const startupGeneration = useRef(sessionGeneration);
  const [isBootstrapComplete, setIsNavigationReady] = useState(false);
  const [didRestorePersistedState, setDidRestorePersistedState] = useState(false);
  const [initializedSession, setInitializedSession] = useState<{
    generation: number; userId: number | null; canReplay: boolean;
  } | null>(null);
  const isNavigationReady = isBootstrapComplete && initializedSession?.generation === sessionGeneration;
  useWatchSync(isNavigationReady);

  // OTA 자동 업데이트 완료 여부 확인
  const isAutoUpdateCompleted = useUpdateStore((state) => state.isAutoUpdateCompleted);

  /**
   * 현재 세션의 저장된 인증 상태와 사용자 데이터 복원
   *
   * 단순화된 로직:
   * 1. Zustand persist가 자동으로 AsyncStorage 복원
   * 2. SecureStorage 토큰 동기화
   * 3. 토큰 검증 (useAuth hook 사용)
   * 4. 사용자 데이터 복원 (오프라인 재전송은 별도 실행)
   *
   * NOTE: 리그 결과 확인은 RunningView/LeagueView에서 처리
   */
  const initializeAuthState = useCallback(async (isActive: () => boolean): Promise<boolean> => {
    const generation = useAuthStore.getState().sessionGeneration;
    try {
      console.log('🔍 [AuthProvider] 저장된 인증 상태 확인 중...');

      // 1. AuthStore에 SecureStorage 토큰 동기화
      const initializeTokens = useAuthStore.getState().initializeTokens;
      await initializeTokens();
      if (!isActive() || !isSessionGenerationCurrent(generation)) return false;

      // 2. 토큰 검증 및 자동 갱신 (useAuth hook)
      const isTokenValid = await verifyAndRefreshToken();

      if (!isActive() || !isSessionGenerationCurrent(generation)) return false;

      // 3. 로그인 상태이고 토큰이 유효하면 사용자 데이터 복원
      if (isTokenValid && useAuthStore.getState().isLoggedIn) {
        await refreshUserData();
        return isActive() && isSessionGenerationCurrent(generation);
      }
      return false;
    } catch {
      console.error('⚠️ [AuthProvider] 인증 상태 초기화 실패:');
      return false;
    }
  }, [verifyAndRefreshToken, refreshUserData]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      const restored = await waitForAuthHydration();
      if (!active || !isSessionGenerationCurrent(sessionGeneration)) return;
      const isNewSession = sessionGeneration !== startupGeneration.current;
      setDidRestorePersistedState(restored || isNewSession);
      if (isNewSession) {
        // 새 로그인은 useAuth가 토큰과 사용자 복원을 완료한 뒤 세션을 교체한다.
        setInitializedSession({ ...getSessionSnapshot(), canReplay: useAuthStore.getState().isLoggedIn });
        setIsNavigationReady(true);
        return;
      }
      console.log('🔐 [AuthProvider] 인증 상태 초기화 시작');
      const canReplay = restored && await initializeAuthState(() => active);
      if (!active || !isSessionGenerationCurrent(sessionGeneration)) return;
      setInitializedSession({ ...getSessionSnapshot(), canReplay });
      setIsNavigationReady(true);
    };
    void init();
    return () => { active = false; };
  }, [initializeAuthState, sessionGeneration]);

  useEffect(() => {
    if (!initializedSession?.canReplay || !isSessionCurrent(initializedSession) ||
        !isLoggedIn || userId == null) return;
    // 재전송 완료는 화면 준비 조건이 아니다. 큐·세션 수명은 useOfflineSync가 소유한다.
    void syncOfflineData().catch((error) => {
      console.error('⚠️ [AuthProvider] 오프라인 데이터 동기화 실패:', error);
    });
  }, [initializedSession, sessionGeneration, isLoggedIn, userId, syncOfflineData]);


  /**
   * 인증 상태에 따른 네비게이션 제어
   *
   * AuthProvider는 인증(로그인/로그아웃)만 담당
   * - 로그인 → 러닝탭으로 이동
   * - 로그아웃 → 로그인 화면으로 이동
   *
   * NOTE: 리그 결과 확인은 RunningView/LeagueView에서 처리
   *
   * 의존성:
   * - isLoggedIn: 로그인 여부
   * - requiresTermsAgreement: 토큰 문자열 대신 실제 약관 접근 상태 변경 감지
   * - sessionGeneration / userId: 실제 로그인 세션·사용자 변경 감지
   * - isNavigationReady: 네비게이션 준비 완료 여부
   * - isAutoUpdateCompleted: OTA 자동 업데이트 완료 여부
   *
   * 플로우:
   * 1. 앱 시작 → 로그인 화면으로 이동 (업데이트 처리)
   * 2. 업데이트 완료 (isAutoUpdateCompleted=true)
   * 3. 로그인 상태 확인 → 러닝 탭 또는 로그인 화면
   * 4. 약관 미동의 → /auth/terms-agreement
   */
  useEffect(() => {
    console.log('🔄 [AuthProvider] useEffect 실행 - isLoggedIn:', isLoggedIn, 'requiresTermsAgreement:', requiresTermsAgreement, 'sessionGeneration:', sessionGeneration, 'userId:', userId, 'isNavigationReady:', isNavigationReady, 'isAutoUpdateCompleted:', isAutoUpdateCompleted);

    // 네비게이션이 준비되지 않았으면 대기
    if (!isNavigationReady) {
      console.log('⏳ [AuthProvider] 네비게이션 준비 대기 중...');
      return;
    }

    // OTA 자동 업데이트가 완료되지 않았으면 대기 (로그인 화면에서 업데이트 처리)
    if (!isAutoUpdateCompleted) {
      console.log('⏳ [AuthProvider] OTA 업데이트 완료 대기 중... 로그인 화면 유지');
      // 로그인 화면으로 이동하여 업데이트 처리
      router.replace('/auth/login');
      return;
    }

    console.log('🔄 [AuthProvider] 인증 상태 확인 - isLoggedIn:', isLoggedIn, 'requiresTermsAgreement:', requiresTermsAgreement);

    // 로그인 상태에 따라 네비게이션 제어
    try {
      if (isLoggedIn && didRestorePersistedState) {
        if (requiresTermsAgreement) {
          // 약관 미동의 → 약관 동의 화면으로
          console.log('📄 [AuthProvider] 약관 미동의 → 약관 동의 화면으로 이동');
          router.replace('/auth/terms-agreement');
          return;
        }

        // 러닝 탭으로 이동 (리그 결과 확인은 RunningView에서 처리)
        console.log('✅ [AuthProvider] 로그인 상태 - 러닝 탭으로 이동');
        router.replace('/(tabs)/running');

        // ✅ 네비게이션 성공 후 Loaded로 전환 (단일 책임: AuthProvider에서만 관리)
        useAppStore.getState().setViewState(ViewState.Loaded);
        console.log('✅ [AuthProvider] 네비게이션 성공: /(tabs)/running - Loaded 상태로 전환');

        // ⚠️ 권한 요청은 RunningView에서 Unity 로딩 완료 후 실행
        // (권한 팝업이 앱을 inactive 상태로 만들어 Unity 초기화 실패 방지)
      } else {
        console.log('❌ [AuthProvider] 로그아웃 상태 - 로그인 화면으로 이동');
        router.replace('/auth/login');

        // ✅ 로그인 화면 이동 후에도 Loaded로 전환
        useAppStore.getState().setViewState(ViewState.Loaded);
        console.log('✅ [AuthProvider] 로그인 화면 이동 - Loaded 상태로 전환');
      }
    } catch {
      console.warn('⚠️ [AuthProvider] 네비게이션 실패, 재시도 예약:');
      // 네비게이션 실패시 잠시 후 재시도
      setTimeout(() => {
        setIsNavigationReady(false);
        setTimeout(() => setIsNavigationReady(true), 200);
      }, 500);
    }
  }, [isLoggedIn, requiresTermsAgreement, sessionGeneration, userId, isNavigationReady, isAutoUpdateCompleted, didRestorePersistedState]);

  return <>{children}</>;
};
