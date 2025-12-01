/**
 * Secure Storage Implementation
 * expo-secure-store 기반 보안 저장소
 *
 * iOS: Keychain Services
 * Android: Android Keystore System
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ISecureStorage, SecureStorageOptions } from './types';
import { KeychainAccessibility } from './types';
import { SecureStorageError, SecureStorageErrorCode } from './errors';

const SERVICE_PREFIX = 'com.runtaeho.app';
const FALLBACK_PREFIX = 'secure_fallback_';

class SecureStorageImpl implements ISecureStorage {
  /**
   * 데이터 저장
   */
  async save(key: string, value: string, options?: SecureStorageOptions): Promise<void> {
    try {
      const fullKey = `${SERVICE_PREFIX}.${key}`;

      const storeOptions: SecureStore.SecureStoreOptions = {
        keychainAccessible: this.mapAccessibility(options?.keychainAccessible),
      };

      // requireAuthentication은 Android에서만 지원
      if (options?.requireAuthentication) {
        storeOptions.requireAuthentication = true;
        if (options.authenticationPrompt) {
          storeOptions.authenticationPrompt = options.authenticationPrompt;
        }
      }

      await SecureStore.setItemAsync(fullKey, value, storeOptions);
      console.log(`🔐 [SecureStorage] Saved: ${key}`);

    } catch (error) {
      console.error(`❌ [SecureStorage] Save failed for ${key}:`, error);

      // Fallback to AsyncStorage
      await this.saveFallback(key, value);

      throw new SecureStorageError(
        SecureStorageErrorCode.SAVE_FAILED,
        `Failed to save ${key}`,
        error
      );
    }
  }

  /**
   * 데이터 로드
   */
  async load(key: string): Promise<string | null> {
    try {
      const fullKey = `${SERVICE_PREFIX}.${key}`;
      const value = await SecureStore.getItemAsync(fullKey);

      if (value) {
        console.log(`🔐 [SecureStorage] Loaded: ${key} - ${value}`);
        return value;
      }

      // Keychain에 없으면 fallback 확인
      const fallbackValue = await this.loadFallback(key);

      if (fallbackValue) {
        console.log(`📦 [SecureStorage] Loaded from fallback: ${key}`);

        // Fallback에서 찾았으면 SecureStore로 마이그레이션 시도
        try {
          await this.save(key, fallbackValue);
          await this.removeFallback(key);
          console.log(`🔄 [SecureStorage] Migrated ${key} to SecureStore`);
        } catch (migrationError) {
          console.warn(`⚠️ [SecureStorage] Failed to migrate ${key}:`, migrationError);
        }
      }

      return fallbackValue;

    } catch (error) {
      console.error(`❌ [SecureStorage] Load failed for ${key}:`, error);

      // 에러 발생 시 fallback 시도
      return await this.loadFallback(key);
    }
  }

  /**
   * 데이터 삭제
   */
  async remove(key: string): Promise<void> {
    try {
      const fullKey = `${SERVICE_PREFIX}.${key}`;
      await SecureStore.deleteItemAsync(fullKey);
      await this.removeFallback(key);

      console.log(`🔐 [SecureStorage] Removed: ${key}`);
    } catch (error) {
      console.error(`❌ [SecureStorage] Remove failed for ${key}:`, error);

      // Fallback도 삭제 시도
      try {
        await this.removeFallback(key);
      } catch (fallbackError) {
        console.error(`❌ [SecureStorage] Fallback remove failed:`, fallbackError);
      }

      throw new SecureStorageError(
        SecureStorageErrorCode.DELETE_FAILED,
        `Failed to remove ${key}`,
        error
      );
    }
  }

  /**
   * SecureStore 사용 가능 여부 확인
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await SecureStore.isAvailableAsync();
    } catch (error) {
      console.error(`❌ [SecureStorage] Availability check failed:`, error);
      return false;
    }
  }

  /**
   * 모든 데이터 삭제
   */
  async clear(): Promise<void> {
    // 알려진 모든 키 삭제
    const knownKeys = ['accessToken', 'refreshToken'];

    const deletePromises = knownKeys.map(async (key) => {
      try {
        await this.remove(key);
      } catch (error) {
        console.error(`❌ [SecureStorage] Failed to clear ${key}:`, error);
      }
    });

    await Promise.all(deletePromises);
    console.log(`🔐 [SecureStorage] Cleared all data`);
  }

  /**
   * iOS Keychain accessibility 매핑
   */
  private mapAccessibility(
    accessibility?: KeychainAccessibility
  ): NonNullable<SecureStore.SecureStoreOptions['keychainAccessible']> {
    if (!accessibility) {
      // 기본값: 기기 잠금 해제 시 접근 가능 (현재 기기만)
      return SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
    }

    const mapping: Record<string, NonNullable<SecureStore.SecureStoreOptions['keychainAccessible']>> = {
      [KeychainAccessibility.WHEN_UNLOCKED]: SecureStore.WHEN_UNLOCKED,
      [KeychainAccessibility.WHEN_UNLOCKED_THIS_DEVICE_ONLY]: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      [KeychainAccessibility.AFTER_FIRST_UNLOCK]: SecureStore.AFTER_FIRST_UNLOCK,
      [KeychainAccessibility.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY]: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    };

    return mapping[accessibility] ?? SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
  }

  // ===== Fallback Methods (AsyncStorage) =====

  /**
   * AsyncStorage에 저장 (fallback)
   */
  private async saveFallback(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`${FALLBACK_PREFIX}${key}`, value);
      console.warn(`⚠️ [SecureStorage] Used fallback storage for: ${key}`);
    } catch (error) {
      console.error(`❌ [SecureStorage] Fallback save failed:`, error);
    }
  }

  /**
   * AsyncStorage에서 로드 (fallback)
   */
  private async loadFallback(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`${FALLBACK_PREFIX}${key}`);
    } catch (error) {
      console.error(`❌ [SecureStorage] Fallback load failed:`, error);
      return null;
    }
  }

  /**
   * AsyncStorage에서 삭제 (fallback)
   */
  private async removeFallback(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${FALLBACK_PREFIX}${key}`);
    } catch (error) {
      console.error(`❌ [SecureStorage] Fallback remove failed:`, error);
    }
  }
}

/**
 * Singleton instance export
 */
export const secureStorage = new SecureStorageImpl();
