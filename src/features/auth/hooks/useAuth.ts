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
import type { EquippedItemsMap } from '~/features/avatar';
import { ItemStatus, getItemTypeById } from '~/features/avatar/models';
import { userDataDtoToUser, type UserDataDto } from '~/features/user/models/UserDataDto';
import { userService } from '~/features/user/services/userService';
import { useUserStore } from '~/stores/user/userStore';
import { tokenStorage } from '~/utils/storage';
import { useAuthStore } from '../stores/authStore';

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
  const setLoggedIn = useAuthStore((state) => state.setLoggedIn);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken);
  const authStoreLogout = useAuthStore((state) => state.logout);

  const setLoginData = useUserStore((state) => state.setLoginData);
  const userStoreLogout = useUserStore((state) => state.logout);

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
    refreshToken?: string
  ): Promise<void> => {
    try {
      console.log('🔐 [useAuth] Starting login process...');

      // 1. 사용자 데이터 변환
      const user = userDataDtoToUser(userData);

      // 2. UserStore에 사용자 데이터 저장
      setLoginData({
        user,
        totalPoint: userData.totalPoint,
        avatarId: userData.avatarId,
        haveRunningRecord: userData.haveRunningRecord,
        equippedItems: convertEquippedItems(userData.equippedItems || []),
      });

      // 3. 토큰 저장 (SecureStore)
      await tokenStorage.saveTokens(accessToken, refreshToken);

      // 4. AuthStore에 토큰 및 로그인 상태 저장
      setAccessToken(accessToken);
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }
      setLoggedIn(true);

      console.log('✅ [useAuth] Login successful');
    } catch (error) {
      console.error('❌ [useAuth] Login failed:', error);
      throw error;
    }
  }, [setLoginData, setAccessToken, setRefreshToken, setLoggedIn, convertEquippedItems]);

  /**
   * 로그아웃 처리
   *
   * 모든 인증 데이터 및 persist 데이터 삭제
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      console.log('🚪 [useAuth] Starting logout process...');

      // 1. 토큰 삭제 (SecureStore)
      await tokenStorage.clearTokens();

      // 2. Store 초기화
      authStoreLogout();
      userStoreLogout();

      console.log('✅ [useAuth] Logout successful');
    } catch (error) {
      console.error('❌ [useAuth] Logout failed:', error);
      throw error;
    }
  }, [authStoreLogout, userStoreLogout]);

  /**
   * 토큰 검증 및 자동 갱신
   *
   * @returns 토큰이 유효하면 true, 아니면 false
   */
  const verifyAndRefreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const accessToken = await tokenStorage.getAccessToken();

      if (!accessToken) {
        console.log('⚪ [useAuth] No token found');
        return false;
      }

      // TODO: 토큰 만료 체크 및 자동 갱신 로직 추가
      // tokenUtils.getTokenStatus() 사용

      return true;
    } catch (error) {
      console.error('❌ [useAuth] Token verification failed:', error);
      return false;
    }
  }, []);

  /**
   * 사용자 데이터 새로고침
   */
  const refreshUserData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const userData = await userService.getUserData();

      if (userData) {
        const user = userDataDtoToUser(userData);
        setLoginData({
          user,
          totalPoint: userData.totalPoint,
          avatarId: userData.avatarId,
          haveRunningRecord: userData.haveRunningRecord,
          equippedItems: convertEquippedItems(userData.equippedItems || []),
        });
      }
    } catch (error) {
      console.error('❌ [useAuth] Failed to refresh user data:', error);
      setError('Failed to refresh user data');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setLoginData, convertEquippedItems]);

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
  };
};

/**
 * 토큰만 관리하는 Hook (옵션)
 */
export const useAuthToken = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken);

  const updateTokens = useCallback(async (
    newAccessToken: string,
    newRefreshToken?: string
  ): Promise<void> => {
    await tokenStorage.saveTokens(newAccessToken, newRefreshToken);
    setAccessToken(newAccessToken);
    if (newRefreshToken) {
      setRefreshToken(newRefreshToken);
    }
  }, [setAccessToken, setRefreshToken]);

  const clearTokens = useCallback(async (): Promise<void> => {
    await tokenStorage.clearTokens();
    // Store는 logout()으로 초기화하므로 여기서는 호출하지 않음
  }, []);

  return {
    accessToken,
    refreshToken,
    updateTokens,
    clearTokens,
  };
};
