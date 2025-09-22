import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserAuthData } from '../../features/auth/models';

/**
 * Authentication State
 * Swift UserStateManager에서 인증 관련 부분 마이그레이션
 */
interface AuthState {
  isLoggedIn: boolean;
  currentUser: UserAuthData | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isLoggedIn: false,
  currentUser: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * 로그인 시작
     */
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },

    /**
     * 로그인 성공
     */
    loginSuccess: (state, action: PayloadAction<UserAuthData>) => {
      state.isLoading = false;
      state.isLoggedIn = true;
      state.currentUser = action.payload;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.error = null;
    },

    /**
     * 로그인 실패
     */
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.isLoggedIn = false;
      state.currentUser = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = action.payload;
    },

    /**
     * 토큰 설정 (토큰 갱신 등에 사용)
     */
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },

    /**
     * 사용자 정보 업데이트
     */
    updateUser: (state, action: PayloadAction<Partial<UserAuthData>>) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload };
      }
    },

    /**
     * 로그아웃
     */
    logout: (state) => {
      state.isLoggedIn = false;
      state.currentUser = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isLoading = false;
      state.error = null;
    },

    /**
     * 에러 클리어
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * 인증 상태 복원 (앱 시작 시 AsyncStorage에서)
     */
    restoreAuthState: (state, action: PayloadAction<UserAuthData>) => {
      state.isLoggedIn = true;
      state.currentUser = action.payload;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  setTokens,
  updateUser,
  logout,
  clearError,
  restoreAuthState,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectIsLoggedIn = (state: { auth: AuthState }) => state.auth.isLoggedIn;
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.currentUser;
export const selectAccessToken = (state: { auth: AuthState }) => state.auth.accessToken;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;