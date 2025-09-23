import { useCallback } from 'react';
import { useErrorHandler } from '../services/ErrorService';

/**
 * API 에러 처리를 위한 Hook
 */
export const useApiError = () => {
  const { handleError } = useErrorHandler();

  /**
   * API 에러를 처리하고 사용자에게 표시
   */
  const handleApiError = useCallback((error: any, context?: Record<string, any>) => {
    return handleError(error, { ...context, source: 'api' });
  }, [handleError]);

  /**
   * RTK Query 에러 처리 특화
   */
  const handleRtkError = useCallback((error: any, context?: Record<string, any>) => {
    let processedError = error;

    // RTK Query 에러 구조 정규화
    if (error?.data) {
      processedError = {
        status: error.status,
        message: error.data.message || error.data.error,
        data: error.data,
      };
    } else if (error?.error) {
      processedError = {
        message: error.error,
        status: error.status,
      };
    }

    return handleApiError(processedError, { ...context, source: 'rtk-query' });
  }, [handleApiError]);

  /**
   * 네트워크 에러 처리
   */
  const handleNetworkError = useCallback((error: any, context?: Record<string, any>) => {
    const networkError = {
      ...error,
      name: 'NetworkError',
      message: '네트워크 연결을 확인해주세요.',
    };

    return handleApiError(networkError, { ...context, source: 'network' });
  }, [handleApiError]);

  /**
   * 401 인증 에러 특별 처리
   */
  const handleAuthError = useCallback((error: any, context?: Record<string, any>) => {
    const authError = {
      status: 401,
      message: '로그인이 필요합니다.',
      ...error,
    };

    return handleApiError(authError, { ...context, source: 'auth' });
  }, [handleApiError]);

  return {
    handleApiError,
    handleRtkError,
    handleNetworkError,
    handleAuthError,
  };
};