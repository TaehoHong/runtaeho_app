import { useCallback } from 'react';
import {
  useConnectAccount as useConnectAccountMutation,
  useDeleteUser,
  useDisconnectAccount as useDisconnectAccountMutation,
  useGetCurrentUser,
  useGetUserData,
  useUpdateUserProfile,
} from '../../../services/user';
import { useUserStore } from '../../../stores/user/userStore';
import { AuthProviderType } from '../../auth/models';
import {
  getConnectedAccountsCount,
  getUserAccount,
} from '../models';

/**
 * User ViewModel
 * Swift UserStateManager의 User 관련 기능들을 React Hook으로 마이그레이션
 * Redux + RTK Query → Zustand + React Query
 */
export const useUserViewModel = () => {
  // Zustand Store
  const appLaunchCount = useUserStore((state) => state.appLaunchCount);
  const lastAppVersion = useUserStore((state) => state.lastAppVersion);
  const incrementAppLaunchCount = useUserStore((state) => state.incrementAppLaunchCount);
  const setLastAppVersion = useUserStore((state) => state.setLastAppVersion);

  // React Query
  const {
    data: currentUser,
    isLoading: isUserLoading,
    error: userError,
    refetch: refetchUser,
  } = useGetCurrentUser();

  const {
    data: userData,
    isLoading: isUserDataLoading,
    error: userDataError,
    refetch: refetchUserData,
  } = useGetUserData();

  // Mutations
  const { mutateAsync: updateProfileMutation, isPending: isUpdatingProfile } = useUpdateUserProfile();
  const { mutateAsync: connectAccountMutation, isPending: isConnectingAccount } = useConnectAccountMutation();
  const { mutateAsync: disconnectAccountMutation, isPending: isDisconnectingAccount } = useDisconnectAccountMutation();
  const { mutateAsync: deleteUserMutation, isPending: isDeletingUser } = useDeleteUser();

  /**
   * 프로필 업데이트
   * Swift updateProfile() 메서드 대응
   */
  const updateProfile = useCallback(async (updates: { nickname?: string; profileImageURL?: string }) => {
    try {
      const result = await updateProfileMutation(updates);
      await refetchUser(); // 업데이트 후 최신 데이터 다시 가져오기
      return result;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }, [updateProfileMutation, refetchUser]);

  /**
   * 계정 연결
   * Swift addUserAccount() 메서드 대응
   */
  const connectAccount = useCallback(async (provider: AuthProviderType, token: string) => {
    try {
      await connectAccountMutation({ provider, token });
      await refetchUser(); // 연결 후 최신 데이터 다시 가져오기
    } catch (error) {
      console.error('Failed to connect account:', error);
      throw error;
    }
  }, [connectAccountMutation, refetchUser]);

  /**
   * 계정 연결 해제
   * Swift removeUserAccount() 메서드 대응
   */
  const disconnectAccount = useCallback(async (provider: AuthProviderType) => {
    try {
      await disconnectAccountMutation(provider);
      await refetchUser(); // 해제 후 최신 데이터 다시 가져오기
    } catch (error) {
      console.error('Failed to disconnect account:', error);
      throw error;
    }
  }, [disconnectAccountMutation, refetchUser]);

  /**
   * 사용자 삭제 (탈퇴)
   */
  const deleteAccount = useCallback(async () => {
    try {
      await deleteUserMutation();
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }, [deleteUserMutation]);

  /**
   * 앱 실행 횟수 증가
   * Swift incrementAppLaunchCount() 메서드 대응
   */
  const incrementLaunchCount = useCallback(() => {
    incrementAppLaunchCount();
  }, [incrementAppLaunchCount]);

  /**
   * 마지막 앱 버전 설정
   * Swift setLastAppVersion() 메서드 대응
   */
  const updateLastAppVersion = useCallback((version: string) => {
    setLastAppVersion(version);
  }, [setLastAppVersion]);

  /**
   * 특정 provider의 연결된 계정 조회
   */
  const getConnectedAccount = useCallback((provider: AuthProviderType) => {
    if (!currentUser) return undefined;
    return getUserAccount(currentUser, provider);
  }, [currentUser]);

  /**
   * 연결된 계정 수 조회
   */
  const connectedAccountsCount = useCallback(() => {
    if (!currentUser) return 0;
    return getConnectedAccountsCount(currentUser);
  }, [currentUser]);

  /**
   * 계정 연결 상태 확인
   */
  const isAccountConnected = useCallback((provider: AuthProviderType): boolean => {
    const account = getConnectedAccount(provider);
    return account?.isConnected ?? false;
  }, [getConnectedAccount]);

  /**
   * 사용자 데이터 새로고침
   */
  const refreshUserData = useCallback(async () => {
    try {
      await Promise.all([refetchUser(), refetchUserData()]);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    }
  }, [refetchUser, refetchUserData]);

  return {
    // State
    currentUser,
    userData,
    appLaunchCount,
    lastAppVersion,

    // Loading states
    isUserLoading,
    isUserDataLoading,
    isUpdatingProfile,
    isConnectingAccount,
    isDisconnectingAccount,
    isDeletingUser,

    // Errors
    userError,
    userDataError,

    // Actions
    updateProfile,
    connectAccount,
    disconnectAccount,
    deleteAccount,
    incrementLaunchCount,
    updateLastAppVersion,
    refreshUserData,

    // Computed properties
    getConnectedAccount,
    connectedAccountsCount,
    isAccountConnected,
  };
};
