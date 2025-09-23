import { useState, useEffect, useCallback } from 'react';
import { useBaseViewModel, StorageKeys, STORAGE_KEYS } from '../viewmodels/BaseViewModel';

/**
 * AsyncStorage Hook
 * AsyncStorage 작업을 React Hook으로 래핑
 */
export const useAsyncStorage = <T>(key: StorageKeys, initialValue?: T) => {
  const { storage } = useBaseViewModel();
  const [value, setValue] = useState<T | null>(initialValue || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Storage에서 값 로드
   */
  const loadValue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const storedValue = await storage.get<T>(key);
      setValue(storedValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Storage load failed');
    } finally {
      setLoading(false);
    }
  }, [key, storage]);

  /**
   * Storage에 값 저장
   */
  const saveValue = useCallback(async (newValue: T): Promise<boolean> => {
    try {
      setError(null);
      const success = await storage.set(key, newValue);
      if (success) {
        setValue(newValue);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Storage save failed');
      return false;
    }
  }, [key, storage]);

  /**
   * Storage에서 값 제거
   */
  const removeValue = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const success = await storage.remove(key);
      if (success) {
        setValue(null);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Storage remove failed');
      return false;
    }
  }, [key, storage]);

  /**
   * 값 업데이트 (기존 값을 기반으로)
   */
  const updateValue = useCallback(async (updater: (prev: T | null) => T): Promise<boolean> => {
    const newValue = updater(value);
    return await saveValue(newValue);
  }, [value, saveValue]);

  // 초기 로드
  useEffect(() => {
    loadValue();
  }, [loadValue]);

  return {
    value,
    loading,
    error,
    saveValue,
    removeValue,
    updateValue,
    reloadValue: loadValue,
  };
};

/**
 * 특정 Storage 키들을 위한 전용 Hook들
 */

/**
 * Access Token Hook
 */
export const useAccessToken = () => {
  return useAsyncStorage<string>(STORAGE_KEYS.ACCESS_TOKEN);
};

/**
 * Refresh Token Hook
 */
export const useRefreshToken = () => {
  return useAsyncStorage<string>(STORAGE_KEYS.REFRESH_TOKEN);
};

/**
 * Current User Hook
 */
export const useCurrentUser = () => {
  return useAsyncStorage<any>(STORAGE_KEYS.CURRENT_USER);
};

/**
 * User Settings Hook
 */
export const useUserSettings = () => {
  return useAsyncStorage<any>(STORAGE_KEYS.USER_SETTINGS, {});
};

/**
 * 여러 Storage 값을 한번에 관리하는 Hook
 */
export const useMultipleStorage = <T extends Record<string, any>>(
  keys: Record<keyof T, StorageKeys>
) => {
  const { storage } = useBaseViewModel();
  const [values, setValues] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadValues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const entries = Object.entries(keys) as Array<[keyof T, StorageKeys]>;
      const promises = entries.map(async ([key, storageKey]) => {
        const value = await storage.get(storageKey);
        return [key, value] as [keyof T, any];
      });

      const results = await Promise.all(promises);
      const newValues = Object.fromEntries(results) as Partial<T>;
      setValues(newValues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Multiple storage load failed');
    } finally {
      setLoading(false);
    }
  }, [keys, storage]);

  const saveValues = useCallback(async (newValues: Partial<T>): Promise<boolean> => {
    try {
      setError(null);

      const entries = Object.entries(newValues) as Array<[keyof T, any]>;
      const promises = entries.map(async ([key, value]) => {
        const storageKey = keys[key];
        return await storage.set(storageKey, value);
      });

      const results = await Promise.all(promises);
      const allSuccess = results.every(result => result);

      if (allSuccess) {
        setValues(prev => ({ ...prev, ...newValues }));
      }

      return allSuccess;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Multiple storage save failed');
      return false;
    }
  }, [keys, storage]);

  const removeValues = useCallback(async (keysToRemove: Array<keyof T>): Promise<boolean> => {
    try {
      setError(null);

      const promises = keysToRemove.map(async (key) => {
        const storageKey = keys[key];
        return await storage.remove(storageKey);
      });

      const results = await Promise.all(promises);
      const allSuccess = results.every(result => result);

      if (allSuccess) {
        setValues(prev => {
          const newValues = { ...prev };
          keysToRemove.forEach(key => {
            delete newValues[key];
          });
          return newValues;
        });
      }

      return allSuccess;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Multiple storage remove failed');
      return false;
    }
  }, [keys, storage]);

  useEffect(() => {
    loadValues();
  }, [loadValues]);

  return {
    values,
    loading,
    error,
    saveValues,
    removeValues,
    reloadValues: loadValues,
  };
};