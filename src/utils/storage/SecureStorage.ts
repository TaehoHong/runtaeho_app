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
  async save(key: string, value: string, options?: SecureStorageOptions): Promise<void> {
    try {
      await SecureStore.setItemAsync(`${SERVICE_PREFIX}.${key}`, value, {
        keychainAccessible: this.mapAccessibility(options?.keychainAccessible),
        ...(options?.requireAuthentication ? {
          requireAuthentication: true,
          authenticationPrompt: options.authenticationPrompt,
        } : {}),
      });
      await AsyncStorage.removeItem(`${FALLBACK_PREFIX}${key}`);
    } catch {
      throw new SecureStorageError(SecureStorageErrorCode.SAVE_FAILED, 'Secure storage save failed');
    }
  }

  async load(key: string): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(`${SERVICE_PREFIX}.${key}`);
      if (value !== null) return value;
      const legacy = await AsyncStorage.getItem(`${FALLBACK_PREFIX}${key}`);
      if (legacy !== null) {
        // Never use legacy plaintext until it has been secured successfully.
        await this.save(key, legacy);
      }
      return legacy;
    } catch {
      throw new SecureStorageError(SecureStorageErrorCode.LOAD_FAILED, 'Secure storage load failed');
    }
  }

  async remove(key: string): Promise<void> {
    const results = await Promise.allSettled([
      SecureStore.deleteItemAsync(`${SERVICE_PREFIX}.${key}`),
      AsyncStorage.removeItem(`${FALLBACK_PREFIX}${key}`),
    ]);
    if (results.some(result => result.status === 'rejected')) {
      throw new SecureStorageError(SecureStorageErrorCode.DELETE_FAILED, 'Secure storage deletion failed');
    }
  }

  async isAvailable(): Promise<boolean> {
    return SecureStore.isAvailableAsync();
  }

  async clear(): Promise<void> {
    const results = await Promise.allSettled(['accessToken', 'refreshToken'].map(key => this.remove(key)));
    if (results.some(result => result.status === 'rejected')) {
      throw new SecureStorageError(SecureStorageErrorCode.DELETE_FAILED, 'Secure storage deletion failed');
    }
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

}

export const secureStorage = new SecureStorageImpl();
