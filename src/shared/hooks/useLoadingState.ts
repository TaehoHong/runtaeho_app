import { useState, useCallback, useRef } from 'react';

/**
 * 로딩 상태 관리 Hook
 */
export const useLoadingState = (initialLoading = false) => {
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(loading);

  // loading 상태를 ref로도 추적 (클로저 문제 해결)
  loadingRef.current = loading;

  const startLoading = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);

  const setLoadingError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setLoading(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 비동기 작업을 래핑하여 자동으로 로딩 상태 관리
   */
  const withLoading = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    errorHandler?: (error: any) => string
  ): Promise<T | null> => {
    // 이미 로딩 중이면 중복 실행 방지
    if (loadingRef.current) {
      console.warn('Already loading, skipping duplicate request');
      return null;
    }

    startLoading();
    try {
      const result = await asyncFn();
      stopLoading();
      return result;
    } catch (error) {
      const errorMessage = errorHandler
        ? errorHandler(error)
        : error instanceof Error
          ? error.message
          : '작업 중 오류가 발생했습니다.';

      setLoadingError(errorMessage);
      throw error;
    }
  }, [startLoading, stopLoading, setLoadingError]);

  return {
    loading,
    error,
    startLoading,
    stopLoading,
    setError: setLoadingError,
    clearError,
    withLoading,
    isLoading: loading, // 별칭
  };
};

/**
 * 여러 개의 로딩 상태를 관리하는 Hook
 */
export const useMultipleLoadingState = <T extends string>(keys: T[]) => {
  const [loadingStates, setLoadingStates] = useState<Record<T, boolean>>(
    keys.reduce((acc, key) => ({ ...acc, [key]: false }), {} as Record<T, boolean>)
  );

  const [errors, setErrors] = useState<Record<T, string | null>>(
    keys.reduce((acc, key) => ({ ...acc, [key]: null }), {} as Record<T, string | null>)
  );

  const setLoading = useCallback((key: T, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
    if (loading) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  }, []);

  const setError = useCallback((key: T, error: string | null) => {
    setErrors(prev => ({ ...prev, [key]: error }));
    if (error) {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
    }
  }, []);

  const withLoading = useCallback(async <R>(
    key: T,
    asyncFn: () => Promise<R>,
    errorHandler?: (error: any) => string
  ): Promise<R | null> => {
    if (loadingStates[key]) {
      console.warn(`Already loading for key: ${key}`);
      return null;
    }

    setLoading(key, true);
    try {
      const result = await asyncFn();
      setLoading(key, false);
      return result;
    } catch (error) {
      const errorMessage = errorHandler
        ? errorHandler(error)
        : error instanceof Error
          ? error.message
          : '작업 중 오류가 발생했습니다.';

      setError(key, errorMessage);
      throw error;
    }
  }, [loadingStates, setLoading, setError]);

  const clearError = useCallback((key: T) => {
    setError(key, null);
  }, [setError]);

  const clearAllErrors = useCallback(() => {
    setErrors(keys.reduce((acc, key) => ({ ...acc, [key]: null }), {} as Record<T, string | null>));
  }, [keys]);

  const isAnyLoading = Object.values(loadingStates).some(Boolean);
  const hasAnyError = Object.values(errors).some(Boolean);

  return {
    loadingStates,
    errors,
    setLoading,
    setError,
    withLoading,
    clearError,
    clearAllErrors,
    isAnyLoading,
    hasAnyError,

    // 개별 상태 확인 유틸리티
    isLoading: (key: T) => loadingStates[key],
    getError: (key: T) => errors[key],
  };
};

/**
 * 폼 제출 상태 관리 특화 Hook
 */
export const useFormSubmitState = () => {
  const { loading, error, withLoading, clearError } = useLoadingState();
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const submitForm = useCallback(async <T>(
    submitFn: () => Promise<T>,
    onSuccess?: (result: T) => void,
    errorHandler?: (error: any) => string
  ): Promise<boolean> => {
    setSubmitSuccess(false);

    try {
      const result = await withLoading(submitFn, errorHandler);
      if (result !== null) {
        setSubmitSuccess(true);
        onSuccess?.(result);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }, [withLoading]);

  const resetSubmitState = useCallback(() => {
    setSubmitSuccess(false);
    clearError();
  }, [clearError]);

  return {
    loading,
    error,
    submitSuccess,
    submitForm,
    resetSubmitState,
    clearError,
  };
};