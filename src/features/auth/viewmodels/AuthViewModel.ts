import { useCallback } from 'react';
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
import { useBaseViewModel, STORAGE_KEYS } from '../../../shared/viewmodels';
import { useApiError, useLoadingState } from '../../../shared/hooks';

/**
 * Authentication ViewModel
 * Swift UserStateManager의 인증 관련 기능들을 React Hook으로 마이그레이션
 * Base ViewModel 패턴 적용으로 코드 중복 제거 및 에러 처리 개선
 */
export const useAuthViewModel = () => {
  const dispatch = useAppDispatch();

  // Base ViewModel 기능 사용
  const { handleError, storage } = useBaseViewModel();
  const { handleRtkError } = useApiError();
  const { loading: customLoading, withLoading } = useLoadingState();

  // Selectors
  const authState = useAppSelector(selectAuth);
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const currentUser = useAppSelector(selectCurrentUser);
  const isLoading = useAppSelector(selectAuthLoading) || customLoading;
  const error = useAppSelector(selectAuthError);

  // API Mutations
  const [getOAuthToken] = useGetOAuthTokenMutation();
  const [refreshTokenMutation] = useRefreshTokenMutation();
  const [logoutMutation] = useLogoutMutation();

  /**
   * OAuth 로그인 처리
   * Swift: getToken(provider:code:) 메서드 대응
   * Base ViewModel과 Error Handling 시스템 적용
   */
  const loginWithOAuth = useCallback(async (provider: AuthProvider, code: string) => {
    return withLoading(async () => {
      try {
        dispatch(loginStart());

        const tokenResult = await getOAuthToken({ provider, code }).unwrap();

        // TokenDto에서 UserAuthData 생성 (Swift createUserAuthDataFromToken과 동일)
        const userData = createUserAuthDataFromToken(tokenResult);

        // Base ViewModel의 storage 사용 (에러 처리 개선)
        const storageSuccess = await storage.multiSet([
          [STORAGE_KEYS.ACCESS_TOKEN, userData.accessToken],
          [STORAGE_KEYS.REFRESH_TOKEN, userData.refreshToken],
          [STORAGE_KEYS.CURRENT_USER, userData],
          [STORAGE_KEYS.IS_LOGGED_IN, true],
        ]);

        if (!storageSuccess) {
          throw new Error('사용자 정보 저장에 실패했습니다.');
        }

        dispatch(loginSuccess(userData));
        return userData;
      } catch (error) {
        const errorInfo = handleRtkError(error, { provider, action: 'login' });
        dispatch(loginFailure(errorInfo.message));
        throw error;
      }
    }, (error) => handleError(error).message);
  }, [dispatch, getOAuthToken, storage, withLoading, handleRtkError, handleError]);

  /**
   * 로그아웃 처리
   * Swift: logout 메서드 대응
   * 에러 처리 개선 및 Base ViewModel 적용
   */
  const performLogout = useCallback(async () => {
    return withLoading(async () => {
      try {
        // 서버에 로그아웃 요청
        await logoutMutation().unwrap();
      } catch (error) {
        // 서버 로그아웃 실패해도 로컬 상태는 클리어
        handleError(error, { action: 'server-logout' }, false);
      } finally {
        // Base ViewModel의 storage 사용 (클리어 작업)
        const clearSuccess = await storage.multiRemove([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.CURRENT_USER,
          STORAGE_KEYS.IS_LOGGED_IN,
        ]);

        if (!clearSuccess) {
          console.warn('로컬 저장소 클리어에 실패했습니다.');
        }

        dispatch(logout());
      }
    }, (error) => '로그아웃 중 오류가 발생했습니다.');
  }, [logoutMutation, dispatch, storage, withLoading, handleError]);

  /**
   * 토큰 갱신
   * Swift: validateAndRefreshTokenIfNeeded 메서드 대응
   * 에러 처리 및 Storage 관리 개선
   */
  const refreshToken = useCallback(async () => {
    try {
      const tokenResult = await refreshTokenMutation().unwrap();

      // Base ViewModel의 storage 사용
      const storageSuccess = await storage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, tokenResult.accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, tokenResult.refreshToken],
      ]);

      if (!storageSuccess) {
        throw new Error('토큰 저장에 실패했습니다.');
      }

      dispatch(setTokens({
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
      }));

      return tokenResult;
    } catch (error) {
      // 토큰 갱신 실패 시 로그아웃
      handleRtkError(error, { action: 'token-refresh' });
      await performLogout();
      throw error;
    }
  }, [refreshTokenMutation, dispatch, storage, handleRtkError, performLogout]);

  /**
   * 앱 시작 시 사용자 상태 복원
   * Swift: loadUserState 메서드 대응
   * Base ViewModel Storage 사용 및 에러 처리 개선
   */
  const restoreUserState = useCallback(async () => {
    try {
      const [storedUser, storedIsLoggedIn] = await Promise.all([
        storage.get<UserAuthData>(STORAGE_KEYS.CURRENT_USER),
        storage.get<boolean>(STORAGE_KEYS.IS_LOGGED_IN),
      ]);

      if (storedUser && storedIsLoggedIn) {
        dispatch(restoreAuthState(storedUser));

        // 토큰 유효성 검증 및 갱신 시도
        await refreshToken();
      }
    } catch (error) {
      handleError(error, { action: 'restore-user-state' }, false);
      // 복원 실패 시 로그아웃
      await performLogout();
    }
  }, [dispatch, refreshToken, performLogout, storage, handleError]);

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