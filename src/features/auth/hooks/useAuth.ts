/**
 * useAuth Hook
 *
 * 현업 표준 패턴:
 * - React Custom Hook으로 인증 로직 캡슐화
 * - Zustand Store와 Service Layer 연결
 * - 컴포넌트에서 직접 사용 가능한 API 제공
 *
 * @example
 * ```tsx
 * const { isLoggedIn, login, logout, user } = useAuth();
 * ```
 */

import { useCallback } from 'react';
import * as jwtUtils from '../utils/jwtUtils';
import type { EquippedItemsMap } from '~/features/avatar';
import { ItemStatus, getItemTypeById } from '~/features/avatar/models';
import { userDataDtoToUser, type UserDataDto } from '~/features/user/models/UserDataDto';
import { userService } from '~/features/user/services/userService';
import { useUserStore } from '~/stores/user/userStore';
import { tokenStorage } from '~/utils/storage';
import { useAuthStore, getSessionSnapshot, isSessionCurrent, isSessionGenerationCurrent, isLoginAttemptCurrent, type LoginAttempt } from '../stores/authStore';
import { SessionSupersededError } from '~/utils/storage/errors';
import { setUserContext } from '~/config/sentry';
import { resetAllAppData, waitForLogout } from '~/shared/services/AppResetService';
import { queryClient } from '~/services/queryClient';
import { pointService } from '~/features/point/services/pointService';

/**
 * 통합 인증 Hook
 *
 * 책임:
 * - 인증 상태 조회
 * - 로그인/로그아웃 처리
 * - 토큰 관리
 * - 사용자 데이터 동기화
 */
export const useAuth = () => {
  // Zustand Stores
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const currentUser = useUserStore((state) => state.currentUser);
  const totalPoint = useUserStore((state) => state.totalPoint);

  // Store Actions
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);

  const setLoginData = useUserStore((state) => state.setLoginData);

  /**
   * EquippedItemDataDto를 EquippedItemsMap으로 변환
   */
  const convertEquippedItems = useCallback((equippedItems: any[]): EquippedItemsMap => {
    const result: EquippedItemsMap = {};
    equippedItems.forEach((item) => {
      const itemTypeId = item.itemTypeId;
      result[itemTypeId] = {
        id: item.id,
        name: item.name,
        itemType: getItemTypeById(itemTypeId),
        filePath: item.filePath,
        unityFilePath: item.unityFilePath,
        point: 0,
        createdAt: new Date().toISOString(),
        status: ItemStatus.EQUIPPED,
        isOwned: true,
      };
    });
    return result;
  }, []);;

  /**
   * 로그인 처리
   *
   * @param userData - 백엔드에서 받은 사용자 데이터
   * @param accessToken - JWT Access Token
   * @param refreshToken - JWT Refresh Token
   */
  const login = useCallback(async (
    userData: UserDataDto,
    accessToken: string,
    refreshToken?: string,
    attempt?: LoginAttempt
  ): Promise<void> => {
    const generation = useAuthStore.getState().sessionGeneration;
    await waitForLogout();
    const isCurrent = () => attempt ? isLoginAttemptCurrent(attempt) : isSessionGenerationCurrent(generation);
    if (!isCurrent()) throw new SessionSupersededError();
    const user = userDataDtoToUser(userData);
    const equippedItems = convertEquippedItems(userData.equippedItems || []);
    await tokenStorage.saveTokens(accessToken, refreshToken, {
      isCurrent,
      onCommit: () => {
        // Consent refresh keeps the session. An actual OAuth login replaces it.
        if (attempt || !useAuthStore.getState().isLoggedIn) {
          useAuthStore.getState().invalidateSession();
          queryClient.clear();
        }
        setLoginData({ user, totalPoint: userData.totalPoint, avatarId: userData.avatarId,
          haveRunningRecord: userData.haveRunningRecord, equippedItems, hairColor: userData.hairColor });
        useAuthStore.setState({ accessToken, ...(refreshToken ? { refreshToken } : {}),
          isLoggedIn: true, tokensRevoked: false, isLoading: false, error: null });
        setUserContext(user.id.toString(), user.userAccounts[0]?.email ?? '', user.nickname);
      },
    });
  }, [setLoginData, convertEquippedItems]);

  /**
   * 로그아웃 처리
   *
   * 모든 인증 데이터 및 persist 데이터 삭제
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      console.log('🚪 [useAuth] Starting logout process...');

      await resetAllAppData(queryClient);

      console.log('✅ [useAuth] Logout successful');
    } catch (error) {
      console.error('[Auth] logout failed');
      throw error;
    }
  }, []);

  /**
   * 토큰 검증 및 자동 갱신
   *
   * @returns 토큰이 유효하면 true, 아니면 false
   */
  const verifyAndRefreshToken = useCallback(async (): Promise<boolean> => {
    const generation = useAuthStore.getState().sessionGeneration;
    if (useAuthStore.getState().tokensRevoked) return false;
    try {
      const accessToken = await tokenStorage.getAccessToken();
      if (!isSessionGenerationCurrent(generation) || !accessToken) return false;
      const { tokenUtils, TokenStatus } = jwtUtils;
      if (tokenUtils.verifyToken(accessToken) === TokenStatus.EXPIRED) {
        // Lazy loading avoids the apiClient / refresh coordinator initialization cycle.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { tokenRefreshInterceptor } = require('~/shared/services/TokenRefreshInterceptor') as typeof import('~/shared/services/TokenRefreshInterceptor');
        await tokenRefreshInterceptor.refreshTokens();
      }
      return isSessionGenerationCurrent(generation);
    } catch {
      console.warn('[Auth] verification unavailable');
      return false;
    }
  }, []);

  /**
   * 사용자 데이터 새로고침
   */
  const refreshUserData = useCallback(async (): Promise<void> => {
    const snapshot = getSessionSnapshot();
    const isCurrent = () => snapshot.userId === null
      ? isSessionGenerationCurrent(snapshot.generation) : isSessionCurrent(snapshot);
    try {
      setLoading(true);
      const pointRead = pointService.beginUserPointRead();
      const userData = await userService.getUserData({ sessionSnapshot: snapshot });
      if (!isCurrent()) return;

      if (userData) {
        const user = userDataDtoToUser(userData);
        setLoginData({
          user,
          totalPoint: pointService.completeUserPointRead(pointRead, userData.totalPoint),
          avatarId: userData.avatarId,
          haveRunningRecord: userData.haveRunningRecord,
          equippedItems: convertEquippedItems(userData.equippedItems || []),
          hairColor: userData.hairColor,
        });
      }
    } catch {
      if (!isCurrent()) return;
      console.error('[Auth] user refresh failed');
      setError('Failed to refresh user data');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [setLoading, setError, setLoginData, convertEquippedItems]);

  /**
   * 사용자 데이터 기반 로그인 완료 처리
   *
   * useAuthSignIn, useTermsAgreement에서 공통으로 사용하는 헬퍼 함수
   * - 사용자 데이터 조회 → login() 호출 → Store/Token 저장
   * - 라우팅은 AuthProvider가 자동 처리
   *
   * @param accessToken - JWT Access Token
   * @param refreshToken - JWT Refresh Token (optional)
   * @throws Error - 사용자 데이터 조회 실패 시
   *
   * @internal 이 함수는 내부 헬퍼로, useAuthSignIn과 useTermsAgreement에서만 사용됩니다.
   */
  const completeLogin = useCallback(async (
    accessToken: string,
    refreshToken?: string,
    attempt?: LoginAttempt
  ): Promise<void> => {
    const generation = useAuthStore.getState().sessionGeneration;
    await waitForLogout();
    const isCurrent = () => attempt ? isLoginAttemptCurrent(attempt) : isSessionGenerationCurrent(generation);
    if (!isCurrent()) throw new SessionSupersededError();
    // Stage the new credentials: a failed profile request must not replace A.
    const userData = await userService.getUserData({
      headers: { 'x-requires-auth': 'false', Authorization: `Bearer ${accessToken}` },
      sessionSnapshot: getSessionSnapshot(),
    });
    if (!isCurrent()) throw new SessionSupersededError();
    if (!userData) throw new Error('Failed to fetch user data');
    await login(userData, accessToken, refreshToken, attempt);
  }, [login]);

  return {
    // State
    isLoggedIn,
    isLoading,
    error,
    user: currentUser,
    totalPoint,

    // Actions
    login,
    logout,
    verifyAndRefreshToken,
    refreshUserData,
    completeLogin,
  };
};
