/**
 * Auth Store (Zustand)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

/**
 * Auth Store
 * Phase 4: 인증 상태 전담
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
       */
      logout: () =>
        set({
          isLoggedIn: false,
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
