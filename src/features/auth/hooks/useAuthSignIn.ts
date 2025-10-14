import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { AuthProviderType } from '../models/AuthType';
import { AuthViewModel } from '../viewmodels/AuthViewModel';
import { AuthMessages } from '../constants/AuthMessages';
import { AuthError, AuthErrorType } from '../models/AuthError';

/**
 * 로그인 처리를 위한 커스텀 Hook
 */
export const useAuthSignIn = () => {
  const [isLoading, setIsLoading] = useState(false);

  const authViewModel = useMemo(() => {
    console.log('🏗️ [LOGIN] AuthViewModel 생성');
    return new AuthViewModel();
  }, []);

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
   */
  const handleSignIn = async (
    provider: AuthProviderType,
    signInMethod: () => Promise<{ success: boolean; error?: AuthError }>
  ): Promise<void> => {
    if (isLoading) return;

    console.log(`[LOGIN] ${provider} 로그인 시도`);

    setIsLoading(true);

    try {
      const result = await signInMethod();

      if (result.success) {
        // 로깅: 로그인 성공
        console.log(`✅ [LOGIN] ${provider} 로그인 성공`);

        // 성공 시 메인 화면으로 이동
        router.replace('/(tabs)');
        console.log('✅ [LOGIN] 라우팅 성공: /(tabs)');
      } else {
        // 로깅: 로그인 실패
        console.log(`❌ [LOGIN] ${provider} 로그인 실패:`, result.error);

        // AuthError 타입별 처리
        if (result.error) {
          handleAuthError(provider, result.error);
        } else {
          Alert.alert(AuthMessages.LOGIN_FAILED, AuthMessages.UNKNOWN_ERROR);
        }
      }
    } catch (error: any) {
      // 로깅: 로그인 예외
      console.error(`❌ [LOGIN] ${provider} 로그인 예외:`, error);

      Alert.alert(
        AuthMessages.LOGIN_FAILED,
        AuthMessages.LOGIN_ERROR
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Google 로그인 핸들러
   */
  const signInWithGoogle = async () => {
    await handleSignIn(
      AuthProviderType.GOOGLE,
      () => authViewModel.signInWithGoogle()
    );
  };

  /**
   * Apple 로그인 핸들러
   */
  const signInWithApple = async () => {
    await handleSignIn(
      AuthProviderType.APPLE,
      () => authViewModel.signInWithApple()
    );
  };

  return {
    isLoading,
    signInWithGoogle,
    signInWithApple,
  };
};