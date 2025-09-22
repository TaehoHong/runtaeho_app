import { useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  restoreAuthState,
  setTokens,
  selectAuth,
  selectIsLoggedIn,
  selectCurrentUser,
  selectAuthLoading,
  selectAuthError,
} from '../../../store/slices/authSlice';
import {
  useGetOAuthTokenMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
} from '../../../store/api/authApi';
import { AuthProvider, UserAuthData, createUserAuthDataFromToken } from '../models';

/**
 * Authentication ViewModel
 * Swift UserStateManager의 인증 관련 기능들을 React Hook으로 마이그레이션
 */
export const useAuthViewModel = () => {
  const dispatch = useAppDispatch();

  // Selectors
  const authState = useAppSelector(selectAuth);
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const currentUser = useAppSelector(selectCurrentUser);
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);

  // API Mutations
  const [getOAuthToken] = useGetOAuthTokenMutation();
  const [refreshTokenMutation] = useRefreshTokenMutation();
  const [logoutMutation] = useLogoutMutation();

  // Storage Keys (Swift Keys enum과 동일)
  const STORAGE_KEYS = useMemo(() => ({
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    CURRENT_USER: 'currentUser',
    IS_LOGGED_IN: 'isLoggedIn',
  }), []);

  /**
   * OAuth 로그인 처리
   * Swift: getToken(provider:code:) 메서드 대응
   */
  const loginWithOAuth = useCallback(async (provider: AuthProvider, code: string) => {
    try {
      dispatch(loginStart());

      const tokenResult = await getOAuthToken({ provider, code }).unwrap();

      // TokenDto에서 UserAuthData 생성 (Swift createUserAuthDataFromToken과 동일)
      const userData = createUserAuthDataFromToken(tokenResult);

      // AsyncStorage에 저장 (Swift saveUserState와 동일)
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, userData.accessToken),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, userData.refreshToken),
        AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userData)),
        AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true'),
      ]);

      dispatch(loginSuccess(userData));
      return userData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch(loginFailure(errorMessage));
      throw error;
    }
  }, [dispatch, getOAuthToken, STORAGE_KEYS]);

  /**
   * 로그아웃 처리
   * Swift: logout 메서드 대응
   */
  const performLogout = useCallback(async () => {
    try {
      // 서버에 로그아웃 요청
      await logoutMutation().unwrap();
    } catch (error) {
      // 서버 로그아웃 실패해도 로컬 상태는 클리어
      console.warn('Server logout failed:', error);
    } finally {
      // AsyncStorage 클리어 (Swift clearUserState와 동일)
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.CURRENT_USER,
        STORAGE_KEYS.IS_LOGGED_IN,
      ]);

      dispatch(logout());
    }
  }, [logoutMutation, dispatch, STORAGE_KEYS]);

  /**
   * 토큰 갱신
   * Swift: validateAndRefreshTokenIfNeeded 메서드 대응
   */
  const refreshToken = useCallback(async () => {
    try {
      const tokenResult = await refreshTokenMutation().unwrap();

      // 새 토큰 저장
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenResult.accessToken),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenResult.refreshToken),
      ]);

      dispatch(setTokens({
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
      }));

      return tokenResult;
    } catch (error) {
      // 토큰 갱신 실패 시 로그아웃
      await performLogout();
      throw error;
    }
  }, [refreshTokenMutation, dispatch, STORAGE_KEYS, performLogout]);

  /**
   * 앱 시작 시 사용자 상태 복원
   * Swift: loadUserState 메서드 대응
   */
  const restoreUserState = useCallback(async () => {
    try {
      const [storedUser, storedIsLoggedIn] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER),
        AsyncStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN),
      ]);

      if (storedUser && storedIsLoggedIn === 'true') {
        const userData: UserAuthData = JSON.parse(storedUser);
        dispatch(restoreAuthState(userData));

        // 토큰 유효성 검증 및 갱신 시도
        await refreshToken();
      }
    } catch (error) {
      console.warn('Failed to restore user state:', error);
      // 복원 실패 시 로그아웃
      await performLogout();
    }
  }, [dispatch, refreshToken, performLogout, STORAGE_KEYS]);

  /**
   * 앱 포그라운드 진입 시 처리
   * Swift: handleAppWillEnterForeground 메서드 대응
   */
  const handleAppWillEnterForeground = useCallback(async () => {
    if (isLoggedIn) {
      try {
        await refreshToken();
      } catch (error) {
        console.warn('Token refresh failed on foreground:', error);
      }
    }
  }, [isLoggedIn, refreshToken]);

  /**
   * 앱 백그라운드 진입 시 처리
   * Swift: handleAppDidEnterBackground 메서드 대응
   */
  const handleAppDidEnterBackground = useCallback(() => {
    // 필요시 상태 저장 로직 추가
  }, []);

  return {
    // State
    authState,
    isLoggedIn,
    currentUser,
    isLoading,
    error,

    // Actions
    loginWithOAuth,
    refreshToken,
    logout: performLogout,
    restoreUserState,
    handleAppWillEnterForeground,
    handleAppDidEnterBackground,
  };
};