/**
 * Auth Store (Zustand)
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '~/utils/storage';

/**
 * Authentication State
 * 인증 플로우 전체를 관리
 */
interface AuthState {
  // Auth Status
  isLoggedIn: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  // Auth Flow State
  isLoading: boolean;
  error: string | null;

  // Actions
  setLoggedIn: (isLoggedIn: boolean) => void;
  setAccessToken: (accessToken: string) => void
  setRefreshToken: (refreshToken: string) => void
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  login: () => void;
  logout: () => void;
  resetAuthState: () => void;

  // Token Management
  initializeTokens: () => Promise<void>;
  getAccessTokenSafe: () => Promise<string | null>;
  getRefreshTokenSafe: () => Promise<string | null>;
}

/**
 * Auth Store
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      isLoggedIn: false,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      // Actions

      /**
       * 로그인 상태 설정
       */
      setLoggedIn: (isLoggedIn) =>
        set({
          isLoggedIn,
        }),
      
      setAccessToken: (accessToken) =>
        set({
          accessToken,
        }),

      setRefreshToken: (refreshToken) =>
        set({
          refreshToken,
        }),

      /**
       * 로딩 상태 설정
       */
      setLoading: (isLoading) =>
        set({
          isLoading,
        }),

      /**
       * 에러 설정
       */
      setError: (error) =>
        set({
          error,
        }),

      /**
       * 에러 클리어
       */
      clearError: () =>
        set({
          error: null,
        }),

      /**
       * 로그인 (상태만 변경)
       */
      login: () =>
        set({
          isLoggedIn: true,
          error: null,
        }),

      /**
       * 로그아웃 (상태만 변경)
       * 모든 인증 상태를 초기화
       */
      logout: () =>
        set({
          isLoggedIn: false,
          accessToken: null,
          refreshToken: null,
          isLoading: false,
          error: null,
        }),

      /**
       * 인증 상태 초기화
       */
      resetAuthState: () =>
        set({
          isLoggedIn: false,
          isLoading: false,
          error: null,
        }),

      /**
       * SecureStorage에서 토큰 로드 및 Store 동기화
       * 앱 시작 시 한 번 호출
       */
      initializeTokens: async () => {
        try {
          console.log('🔐 [AuthStore] Initializing tokens from SecureStorage...');
          const { accessToken, refreshToken } = await tokenStorage.loadTokens();

          set({
            accessToken,
            refreshToken,
          });

          if (accessToken || refreshToken) {
            console.log('✅ [AuthStore] Tokens loaded successfully');
          } else {
            console.log('⚪ [AuthStore] No tokens found in SecureStorage');
          }
        } catch (error) {
          console.error('❌ [AuthStore] Failed to initialize tokens:', error);
          set({
            accessToken: null,
            refreshToken: null,
          });
        }
      },

      /**
       * 안전한 액세스 토큰 조회
       * 메모리에 없으면 SecureStorage에서 fallback
       */
      getAccessTokenSafe: async (): Promise<string | null> => {
        const state = get();

        // 메모리에 있으면 반환
        if (state.accessToken) {
          return state.accessToken;
        }

        // SecureStorage에서 로드 시도
        try {
          console.log('🔍 [AuthStore] AccessToken not in memory, loading from SecureStorage...');
          const token = await tokenStorage.getAccessToken();

          if (token) {
            set({ accessToken: token });
            console.log('✅ [AuthStore] AccessToken loaded from SecureStorage');
          }

          return token;
        } catch (error) {
          console.error('❌ [AuthStore] Failed to get access token:', error);
          return null;
        }
      },

      /**
       * 안전한 리프레시 토큰 조회
       * 메모리에 없으면 SecureStorage에서 fallback
       */
      getRefreshTokenSafe: async (): Promise<string | null> => {
        const state = get();

        // 메모리에 있으면 반환
        if (state.refreshToken) {
          return state.refreshToken;
        }

        // SecureStorage에서 로드 시도
        try {
          console.log('🔍 [AuthStore] RefreshToken not in memory, loading from SecureStorage...');
          const token = await tokenStorage.getRefreshToken();

          if (token) {
            set({ refreshToken: token });
            console.log('✅ [AuthStore] RefreshToken loaded from SecureStorage');
          }

          return token;
        } catch (error) {
          console.error('❌ [AuthStore] Failed to get refresh token:', error);
          return null;
        }
      },
    }),
    {
      name: 'auth-storage', // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      // isLoggedIn만 persist
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);

/**
 * Selectors
 */
export const selectIsLoggedIn = () => useAuthStore.getState().isLoggedIn;
export const selectAuthLoading = () => useAuthStore.getState().isLoading;
export const selectAuthError = () => useAuthStore.getState().error;
