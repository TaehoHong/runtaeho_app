/**
 * Auth Store (Zustand)
 * 기존 authSlice.ts에서 마이그레이션
 * Redux → Zustand
 *
 * Phase 3: 인증 플로우만 관리 (로그인/로그아웃 상태)
 * 사용자 데이터와 토큰은 UserStore에서 관리
 */

import { create } from 'zustand';

/**
 * Authentication State
 * 인증 플로우 상태만 관리 (로딩, 에러)
 */
interface AuthState {
  // Auth Flow State
  isLoading: boolean;
  error: string | null;

  // Actions
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetAuthState: () => void;
}

/**
 * Auth Store
 * Phase 3: 인증 플로우만 관리, 실제 데이터는 UserStore
 */
export const useAuthStore = create<AuthState>((set) => ({
  // Initial State
  isLoading: false,
  error: null,

  // Actions

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
   * 인증 상태 초기화
   */
  resetAuthState: () =>
    set({
      isLoading: false,
      error: null,
    }),
}));

/**
 * Selectors
 */
export const selectAuthLoading = () => useAuthStore.getState().isLoading;
export const selectAuthError = () => useAuthStore.getState().error;
