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
 * 모든 Zustand 스토어 초기화 (내부 함수)
 */
const resetAllStores = async (): Promise<void> => {
  console.log('🔄 [DEV] Zustand 스토어 초기화 시작...');

  try {
    useAppStore.getState().resetAppState();
    console.log('  ✅ AppStore 초기화 완료');

    useAuthStore.getState().resetAuthState();
    console.log('  ✅ AuthStore 초기화 완료');

    useUserStore.getState().resetAppState();
    console.log('  ✅ UserStore 초기화 완료');

    useUnityStore.getState().resetUnityState();
    console.log('  ✅ UnityStore 초기화 완료');

    console.log('✅ [DEV] 모든 Zustand 스토어 초기화 완료');
  } catch (error) {
    console.error('❌ [DEV] Zustand 스토어 초기화 실패:', error);
    throw error;
  }
};

/**
 * AsyncStorage 완전 초기화 (내부 함수)
 */
const clearAsyncStorage = async (): Promise<void> => {
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
 * SecureStore (Keychain) 초기화 (내부 함수)
 */
const clearSecureStore = async (): Promise<void> => {
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
      } catch {
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
    await resetAllStores();
    await clearAsyncStorage();
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
