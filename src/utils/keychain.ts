/**
 * Keychain Utility
 * 기존 KeychainManager를 간소화한 RN 스타일 유틸리티
 *
 * react-native-keychain을 사용하여 보안 저장소 구현
 * iOS: Keychain Services
 * Android: Android Keystore
 */

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVICE_NAME = 'com.runtaeho.app';

const KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

/**
 * 키체인에 값 저장
 */
async function save(key: string, value: string): Promise<void> {
  try {
    await Keychain.setGenericPassword(key, value, {
      service: `${SERVICE_NAME}.${key}`,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    console.log(`🔐 [Keychain] Securely saved ${key}`);
  } catch (error) {
    console.error(`❌ [Keychain] Failed to save ${key}:`, error);
    await saveFallback(key, value);
  }
}

/**
 * 키체인에서 값 로드
 */
async function load(key: string): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${SERVICE_NAME}.${key}`,
    });

    if (credentials) {
      console.log(`🔐 [Keychain] Securely loaded ${key}`);
      return credentials.password;
    }

    // Keychain에 없으면 fallback 확인
    const fallbackValue = await loadFallback(key);
    if (fallbackValue) {
      console.log(`📦 [Keychain] Loaded ${key} from fallback`);
      // Keychain으로 마이그레이션
      await save(key, fallbackValue);
    }

    return fallbackValue;
  } catch (error) {
    console.error(`❌ [Keychain] Failed to load ${key}:`, error);
    return await loadFallback(key);
  }
}

/**
 * 키체인에서 값 삭제
 */
async function remove(key: string): Promise<void> {
  try {
    await Keychain.resetGenericPassword({
      service: `${SERVICE_NAME}.${key}`,
    });
    console.log(`🔐 [Keychain] Securely deleted ${key}`);
    await removeFallback(key);
  } catch (error) {
    console.error(`❌ [Keychain] Failed to delete ${key}:`, error);
    await removeFallback(key);
  }
}

/**
 * 토큰 저장 (헬퍼 함수)
 */
async function saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await save(KEYS.ACCESS_TOKEN, accessToken);
  if (refreshToken) {
    await save(KEYS.REFRESH_TOKEN, refreshToken);
  }
}

/**
 * 토큰 로드 (헬퍼 함수)
 */
async function loadTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const [accessToken, refreshToken] = await Promise.all([
    load(KEYS.ACCESS_TOKEN),
    load(KEYS.REFRESH_TOKEN),
  ]);

  return { accessToken, refreshToken };
}

/**
 * 토큰 삭제 (헬퍼 함수)
 */
async function clearTokens(): Promise<void> {
  await Promise.all([
    remove(KEYS.ACCESS_TOKEN),
    remove(KEYS.REFRESH_TOKEN),
  ]);
}

/**
 * 모든 키체인 데이터 삭제 (디버그용)
 */
async function clearAll(): Promise<void> {
  try {
    await clearTokens();
    console.log(`🔐 [Keychain] Cleared all secure storage`);
  } catch (error) {
    console.error('❌ [Keychain] Failed to clear all:', error);
  }
}

// === Fallback Methods (AsyncStorage) ===

async function saveFallback(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(`keychain_fallback_${key}`, value);
}

async function loadFallback(key: string): Promise<string | null> {
  return await AsyncStorage.getItem(`keychain_fallback_${key}`);
}

async function removeFallback(key: string): Promise<void> {
  await AsyncStorage.removeItem(`keychain_fallback_${key}`);
}

/**
 * Keychain 유틸리티 export
 */
export const keychain = {
  save,
  load,
  remove,
  saveTokens,
  loadTokens,
  clearTokens,
  clearAll,
  KEYS,
};
