import { t, useAppLanguage } from '~/i18n';
import { useState, useRef } from 'react';
import { useAuthStore, isLoginAttemptCurrent, waitForAuthHydration } from '../stores/authStore';
import { waitForLogout } from '~/shared/services/AppResetService';
import { SessionSupersededError } from '~/utils/storage/errors';
import { Alert } from 'react-native';
import { AuthMessages } from '../constants/AuthMessages';
import { AuthError, AuthErrorType } from '../models/AuthError';
import { AuthProviderType } from '../models/AuthType';
import { AuthenticationService } from '../services/AuthenticationService';
import { AuthStrategyFactory } from '../strategies/AuthStrategyFactory';
import { useAuth } from './useAuth';

/**
 * 로그인 처리를 위한 커스텀 Hook
 *
 * 현업 표준 패턴:
 * - AuthViewModel 대신 useAuth hook 사용
 * - Service Layer 직접 호출
 * - React Hook 기반 상태 관리
 */
export const useAuthSignIn = () => {
  useAppLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const inFlight = useRef(false);
  const { completeLogin } = useAuth();
  const authService = AuthenticationService.shared;

  /**
   * AuthError 타입별 처리 함수
   */
  const handleAuthError = (provider: AuthProviderType, error: AuthError): void => {
    switch (error.type) {
      case AuthErrorType.CANCELLED:
        // 사용자 취소 - Alert 표시 안 함
        console.log(`ℹ️ [LOGIN] ${provider} 로그인 취소`);
        break;

      case AuthErrorType.IN_PROGRESS:
        // 이미 진행 중
        Alert.alert(t("알림"), t("이미 로그인이 진행 중입니다."));
        break;

      case AuthErrorType.UNAVAILABLE:
        // 사용 불가능
        Alert.alert(t("오류"), error.message);
        break;

      case AuthErrorType.NO_AUTH_CODE:
        // 인증 코드 없음
        Alert.alert(AuthMessages.LOGIN_FAILED, t("인증 코드를 받지 못했습니다."));
        break;

      case AuthErrorType.NETWORK_ERROR:
        // 네트워크 오류 - 재시도 버튼 제공
        Alert.alert(
          t("네트워크 오류"),
          t("인터넷 연결을 확인하고 다시 시도해주세요."),
          [
            { text: t("확인"), style: 'cancel' }
          ]
        );
        break;

      case AuthErrorType.UNKNOWN:
      default:
        // 기타 오류
        Alert.alert(AuthMessages.LOGIN_FAILED, error.message);
        break;
    }
  };

  /**
   * 공통 로그인 처리 함수
   *
   * OAuth 인증 → JWT 토큰 획득 → completeLogin() 호출
   * 라우팅은 AuthProvider가 자동 처리 (약관 동의 체크 포함)
   */
  const handleSignIn = async (provider: AuthProviderType): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;

    console.log(`🔐 [LOGIN] ${provider} 로그인 시도`);
    setIsLoading(true);

    try {
      await waitForLogout();
      await waitForAuthHydration();
      const attempt = useAuthStore.getState().beginLoginAttempt();
      // 1. Strategy 패턴으로 OAuth 인증 코드 획득
      const strategy = AuthStrategyFactory.getStrategy(provider);

      if (!strategy.isAvailable()) {
        throw AuthError.unavailable(`${provider} Sign-In not available`);
      }

      const authCodeResult = await strategy.getAuthorizationCode();

      if (!isLoginAttemptCurrent(attempt)) throw new SessionSupersededError();

      // 2. 백엔드 API로 JWT 토큰 획득
      const tokenDto = await authService.getToken(
        provider,
        authCodeResult.authorizationCode
      );

      if (!isLoginAttemptCurrent(attempt)) throw new SessionSupersededError();

      // 3. 로그인 완료 처리 (사용자 데이터 조회 + Store 저장)
      await completeLogin(tokenDto.accessToken, tokenDto.refreshToken, attempt);

      // 4. 성공 로그 (라우팅은 AuthProvider가 자동 처리)
      console.log(`✅ [LOGIN] ${provider} 로그인 완료 (AuthProvider가 라우팅 처리)`);

    } catch (error: any) {
      if (error instanceof SessionSupersededError) return;
      console.error(`[Auth] sign-in failed`, { provider, category: error instanceof AuthError ? error.type : 'unknown' });

      // AuthError 타입별 처리
      if (error instanceof AuthError) {
        handleAuthError(provider, error);
      } else {
        Alert.alert(AuthMessages.LOGIN_FAILED, error.message || AuthMessages.UNKNOWN_ERROR);
      }
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  };

  /**
   * Google 로그인 핸들러
   */
  const signInWithGoogle = async () => {
    await handleSignIn(AuthProviderType.GOOGLE);
  };

  /**
   * Apple 로그인 핸들러
   */
  const signInWithApple = async () => {
    await handleSignIn(AuthProviderType.APPLE);
  };

  return {
    isLoading,
    signInWithGoogle,
    signInWithApple,
  };
};
