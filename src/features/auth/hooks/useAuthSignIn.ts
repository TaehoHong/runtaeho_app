import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { userService } from '~/features/user/services/userService';
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
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
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
        Alert.alert('알림', '이미 로그인이 진행 중입니다.');
        break;

      case AuthErrorType.UNAVAILABLE:
        // 사용 불가능
        Alert.alert('오류', error.message);
        break;

      case AuthErrorType.NO_AUTH_CODE:
        // 인증 코드 없음
        Alert.alert(AuthMessages.LOGIN_FAILED, '인증 코드를 받지 못했습니다.');
        break;

      case AuthErrorType.NETWORK_ERROR:
        // 네트워크 오류 - 재시도 버튼 제공
        Alert.alert(
          '네트워크 오류',
          '인터넷 연결을 확인하고 다시 시도해주세요.',
          [
            { text: '확인', style: 'cancel' }
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
   * Service Layer 직접 호출 → useAuth hook으로 상태 저장
   */
  const handleSignIn = async (provider: AuthProviderType): Promise<void> => {
    if (isLoading) return;

    console.log(`🔐 [LOGIN] ${provider} 로그인 시도`);
    setIsLoading(true);

    try {
      // 1. Strategy 패턴으로 OAuth 인증 코드 획득
      const strategy = AuthStrategyFactory.getStrategy(provider);

      if (!strategy.isAvailable()) {
        throw AuthError.unavailable(`${provider} Sign-In not available`);
      }

      const authCodeResult = await strategy.getAuthorizationCode();

      // 2. 백엔드 API로 JWT 토큰 획득
      const tokenDto = await authService.getToken(
        provider,
        authCodeResult.authorizationCode
      );

      // 3. 사용자 전체 데이터 조회
      const userData = await userService.getUserData();

      if (!userData) {
        throw AuthError.networkError('Failed to fetch user data');
      }

      // 4. useAuth hook으로 로그인 처리 (Store + TokenStorage)
      await login(userData, tokenDto.accessToken, tokenDto.refreshToken);

      // 5. 성공 시 메인 화면으로 이동
      console.log(`✅ [LOGIN] ${provider} 로그인 성공`);
      router.replace('/(tabs)');

    } catch (error: any) {
      console.error(`❌ [LOGIN] ${provider} 로그인 실패:`, error);

      // AuthError 타입별 처리
      if (error instanceof AuthError) {
        handleAuthError(provider, error);
      } else {
        Alert.alert(AuthMessages.LOGIN_FAILED, error.message || AuthMessages.UNKNOWN_ERROR);
      }
    } finally {
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