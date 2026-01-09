/**
 * App Reset Service
 *
 * 앱의 모든 로컬 데이터를 초기화하는 서비스
 * 로그아웃, 회원탈퇴 시 사용
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { QueryClient } from '@tanstack/react-query';

import { useAppStore } from '~/stores/app/appStore';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { useUnityStore } from '~/stores/unity/unityStore';
import { useTermsStore } from '~/features/terms/stores/termsStore';
import { useLeagueCheckStore } from '~/stores/league/leagueCheckStore';
import { clearUserContext } from '~/config/sentry';

/**
 * SecureStore 키 목록
 */
const SECURE_STORE_KEYS = [
  'accessToken',
  'refreshToken',
] as const;

/**
 * 모든 Zustand 스토어 초기화
 */
const resetAllStores = (): void => {
  console.log('🔄 [AppReset] Zustand 스토어 초기화...');

  useAppStore.getState().resetAppState();
  useAuthStore.getState().logout();
  useUserStore.getState().logout();
  useUnityStore.getState().resetUnityState();
  useTermsStore.getState().reset();
  useLeagueCheckStore.getState().reset();

  console.log('✅ [AppReset] Zustand 스토어 초기화 완료');
};

/**
 * AsyncStorage 완전 삭제
 */
const clearAsyncStorage = async (): Promise<void> => {
  console.log('🔄 [AppReset] AsyncStorage 초기화...');

  await AsyncStorage.clear();

  console.log('✅ [AppReset] AsyncStorage 초기화 완료');
};

/**
 * SecureStore (Keychain) 토큰 삭제
 */
const clearSecureStore = async (): Promise<void> => {
  console.log('🔄 [AppReset] SecureStore 초기화...');

  for (const key of SECURE_STORE_KEYS) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // 키가 존재하지 않으면 무시
    }
  }

  console.log('✅ [AppReset] SecureStore 초기화 완료');
};

/**
 * 앱의 모든 로컬 데이터 초기화
 *
 * 초기화 대상:
 * - React Query 캐시
 * - Zustand 스토어 (app, auth, user, unity, terms)
 * - AsyncStorage (Zustand persist 데이터)
 * - SecureStore (JWT 토큰)
 * - Sentry 사용자 컨텍스트
 *
 * @param queryClient - React Query 클라이언트
 */
export const resetAllAppData = async (queryClient: QueryClient): Promise<void> => {
  console.log('🔄 [AppReset] 앱 데이터 초기화 시작...');

  try {
    // 1. React Query 캐시 클리어
    queryClient.clear();
    console.log('✅ [AppReset] React Query 캐시 클리어 완료');

    // 2. Zustand 스토어 초기화
    resetAllStores();

    // 3. AsyncStorage 삭제
    await clearAsyncStorage();

    // 4. SecureStore 토큰 삭제
    await clearSecureStore();

    // 5. Sentry 사용자 컨텍스트 제거
    clearUserContext();
    console.log('✅ [AppReset] Sentry 컨텍스트 제거 완료');

    console.log('✅ [AppReset] 앱 데이터 초기화 완료');
  } catch (error) {
    console.error('❌ [AppReset] 앱 데이터 초기화 실패:', error);
    throw error;
  }
};
