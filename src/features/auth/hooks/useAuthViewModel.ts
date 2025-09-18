import { useState, useCallback } from 'react';
import { AuthService } from '../services/AuthService';
import { AuthProvider } from '../types/AuthTypes';

export const useAuthViewModel = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (provider: AuthProvider, authCode: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const userData = await AuthService.getToken(provider, authCode);

      // 로그인 성공 시 UserStateManager 업데이트
      // TODO: UserStateManager 구현 후 연결
      console.log('로그인 성공:', userData);

    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.');
      console.error('로그인 에러:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signIn,
    clearError,
    isLoading,
    error,
  };
};