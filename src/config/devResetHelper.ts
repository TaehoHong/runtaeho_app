/**
 * DEV 환경 전용: Store 초기화 헬퍼
 *
 * 개발 환경에서 앱 시작 시 모든 상태를 초기화합니다.
 * 프로덕션 빌드에서는 자동으로 제외됩니다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useAppStore } from '~/stores/app/appStore';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { useUnityStore } from '~/stores/unity/unityStore';

/**
 * 모든 Zustand 스토어 초기화
 */
export const resetAllStores = async (): Promise<void> => {
  console.log('🔄 [DEV] Zustand 스토어 초기화 시작...');

  try {
    // 1. App Store 초기화
    useAppStore.getState().resetAppState();
    console.log('  ✅ AppStore 초기화 완료');

    // 2. Auth Store 초기화
    useAuthStore.getState().resetAuthState();
    console.log('  ✅ AuthStore 초기화 완료');

    // 3. User Store 초기화
    useUserStore.getState().resetAppState();
    console.log('  ✅ UserStore 초기화 완료');

    // 4. Unity Store 초기화
    useUnityStore.getState().resetUnityState();
    console.log('  ✅ UnityStore 초기화 완료');

    console.log('✅ [DEV] 모든 Zustand 스토어 초기화 완료');
  } catch (error) {
    console.error('❌ [DEV] Zustand 스토어 초기화 실패:', error);
    throw error;
  }
};

/**
 * AsyncStorage 완전 초기화
 */
export const clearAsyncStorage = async (): Promise<void> => {
  console.log('🔄 [DEV] AsyncStorage 초기화 시작...');

  try {
    await AsyncStorage.clear();
    console.log('✅ [DEV] AsyncStorage 초기화 완료');
  } catch (error) {
    console.error('❌ [DEV] AsyncStorage 초기화 실패:', error);
    throw error;
  }
};

/**
 * SecureStore (Keychain) 초기화
 * 토큰 등 민감 정보 제거
 */
export const clearSecureStore = async (): Promise<void> => {
  console.log('🔄 [DEV] SecureStore 초기화 시작...');

  try {
    const keysToRemove = [
      'accessToken',
      'refreshToken',
      'user-auth-token',
      'auth-storage',
    ];

    for (const key of keysToRemove) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        // 키가 존재하지 않으면 에러 무시
      }
    }

    console.log('✅ [DEV] SecureStore 초기화 완료');
  } catch (error) {
    console.error('❌ [DEV] SecureStore 초기화 실패:', error);
    throw error;
  }
};

/**
 * 전체 앱 상태 완전 초기화
 * DEV 환경에서 앱 시작 시 자동 실행
 */
export const resetDevEnvironment = async (): Promise<void> => {
  if (!__DEV__) {
    console.warn('⚠️ resetDevEnvironment는 DEV 환경에서만 실행됩니다.');
    return;
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🔄 DEV 환경 완전 초기화 시작');
  console.log('═══════════════════════════════════════');

  const startTime = Date.now();

  try {
    // 1. Zustand 스토어 초기화
    await resetAllStores();

    // 2. AsyncStorage 초기화
    await clearAsyncStorage();

    // 3. SecureStore 초기화
    await clearSecureStore();

    const elapsed = Date.now() - startTime;
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`✅ DEV 환경 초기화 완료 (${elapsed}ms)`);
    console.log('═══════════════════════════════════════');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════');
    console.error('❌ DEV 환경 초기화 실패');
    console.error('═══════════════════════════════════════');
    console.error(error);
    console.error('');
  }
};

/**
 * 선택적 초기화 옵션
 */
export interface ResetOptions {
  stores?: boolean;      // Zustand 스토어 초기화 여부
  asyncStorage?: boolean; // AsyncStorage 초기화 여부
  secureStore?: boolean;  // SecureStore 초기화 여부
}

/**
 * 옵션을 지정하여 선택적 초기화
 */
export const resetWithOptions = async (options: ResetOptions): Promise<void> => {
  if (!__DEV__) return;

  const { stores = true, asyncStorage = true, secureStore = true } = options;

  console.log('🔄 [DEV] 선택적 초기화 시작:', options);

  try {
    if (stores) {
      await resetAllStores();
    }

    if (asyncStorage) {
      await clearAsyncStorage();
    }

    if (secureStore) {
      await clearSecureStore();
    }

    console.log('✅ [DEV] 선택적 초기화 완료');
  } catch (err) {
    console.error('❌ [DEV] 선택적 초기화 실패:', err);
    throw err;
  }
};
