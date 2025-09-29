import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Base ViewModel Interface
 * 모든 ViewModel이 공통으로 구현해야 하는 인터페이스
 */
export interface IBaseViewModel {
  isLoading: boolean;
  error: string | null;
}

/**
 * 공통 에러 타입
 */
export interface ApiError {
  status?: number;
  message?: string;
  data?: any;
}

/**
 * 스토리지 키 타입
 */
export type StorageKey = string;

/**
 * Base ViewModel Hook
 * 모든 ViewModel에서 공통으로 사용하는 로직들을 제공
 */
export const useBaseViewModel = () => {
  /**
   * API 에러를 사용자 친화적인 메시지로 변환
   */
  const handleError = useCallback((error: ApiError): string => {
    // 네트워크 에러
    if (!error.status) {
      return '네트워크 연결을 확인해주세요.';
    }

    // HTTP 상태코드별 처리
    switch (error.status) {
      case 400:
        return error.message || '잘못된 요청입니다.';
      case 401:
        return '인증이 필요합니다. 다시 로그인해주세요.';
      case 403:
        return '접근 권한이 없습니다.';
      case 404:
        return '요청한 데이터를 찾을 수 없습니다.';
      case 409:
        return error.message || '이미 존재하는 데이터입니다.';
      case 422:
        return error.message || '입력 데이터를 확인해주세요.';
      case 429:
        return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      case 500:
        return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      case 503:
        return '서비스를 일시적으로 사용할 수 없습니다.';
      default:
        return error.message || '알 수 없는 오류가 발생했습니다.';
    }
  }, []);

  /**
   * AsyncStorage 공통 작업
   */
  const storage = {
    get: useCallback(async <T>(key: StorageKey): Promise<T | null> => {
      try {
        const value = await AsyncStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.warn(`Storage get error for key ${key}:`, error);
        return null;
      }
    }, []),

    set: useCallback(async <T>(key: StorageKey, value: T): Promise<boolean> => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn(`Storage set error for key ${key}:`, error);
        return false;
      }
    }, []),

    remove: useCallback(async (key: StorageKey): Promise<boolean> => {
      try {
        await AsyncStorage.removeItem(key);
        return true;
      } catch (error) {
        console.warn(`Storage remove error for key ${key}:`, error);
        return false;
      }
    }, []),

    multiSet: useCallback(async (items: [StorageKey, any][]): Promise<boolean> => {
      try {
        const serializedItems = items.map(([key, value]) => [key, JSON.stringify(value)] as [string, string]);
        await AsyncStorage.multiSet(serializedItems);
        return true;
      } catch (error) {
        console.warn('Storage multiSet error:', error);
        return false;
      }
    }, []),

    multiRemove: useCallback(async (keys: StorageKey[]): Promise<boolean> => {
      try {
        await AsyncStorage.multiRemove(keys);
        return true;
      } catch (error) {
        console.warn('Storage multiRemove error:', error);
        return false;
      }
    }, []),
  };

  /**
   * 입력 데이터 검증 유틸리티
   */
  const validation = {
    isEmail: useCallback((email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }, []),

    isNotEmpty: useCallback((value: string | null | undefined): boolean => {
      return value !== null && value !== undefined && value.trim().length > 0;
    }, []),

    isPositiveNumber: useCallback((value: number): boolean => {
      return !isNaN(value) && value > 0;
    }, []),

    isValidLength: useCallback((value: string, min: number, max?: number): boolean => {
      const length = value.trim().length;
      if (length < min) return false;
      if (max && length > max) return false;
      return true;
    }, []),
  };

  /**
   * 로딩 상태 관리 유틸리티
   */
  const createAsyncHandler = useCallback(<T extends any[], R>(
    asyncFn: (...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        console.error('Async handler error:', error);
        throw error;
      }
    };
  }, []);

  /**
   * 디바운스 유틸리티
   */
  const createDebouncer = useCallback(<T extends any[]>(
    fn: (...args: T) => void,
    delay: number
  ) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: T) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }, []);

  /**
   * 쓰로틀 유틸리티
   */
  const createThrottler = useCallback(<T extends any[]>(
    fn: (...args: T) => void,
    delay: number
  ) => {
    let isThrottled = false;
    return (...args: T) => {
      if (!isThrottled) {
        fn(...args);
        isThrottled = true;
        setTimeout(() => {
          isThrottled = false;
        }, delay);
      }
    };
  }, []);

  return {
    handleError,
    storage,
    validation,
    createAsyncHandler,
    createDebouncer,
    createThrottler,
  };
};

/**
 * 공통 스토리지 키 상수
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  CURRENT_USER: 'currentUser',
  IS_LOGGED_IN: 'isLoggedIn',
  USER_SETTINGS: 'userSettings',
  LAST_RUNNING_RECORD: 'lastRunningRecord',
} as const;

export type StorageKeys = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];