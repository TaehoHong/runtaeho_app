import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  useGetCurrentUserQuery,
  useGetUserDataQuery,
  useUpdateUserProfileMutation,
  useConnectAccountMutation,
  useDisconnectAccountMutation,
  useDeleteUserMutation,
} from '../../../store/api/userApi';
import { incrementAppLaunchCount, setLastAppVersion } from '../../../store/slices/userSlice';
import {
  getUserAccount,
  getConnectedAccountsCount,
} from '../models';
import { AuthProvider } from '../../auth/models';

/**
 * User ViewModel
 * Swift UserStateManager의 User 관련 기능들을 React Hook으로 마이그레이션
 */
export const useUserViewModel = () => {
  const dispatch = useAppDispatch();

  // API Queries
  const {
    data: currentUser,
    isLoading: isUserLoading,
    error: userError,
    refetch: refetchUser,
  } = useGetCurrentUserQuery();

  const {
    data: userData,
    isLoading: isUserDataLoading,
    error: userDataError,
    refetch: refetchUserData,
  } = useGetUserDataQuery();

  // API Mutations
  const [updateProfileMutation, { isLoading: isUpdatingProfile }] = useUpdateUserProfileMutation();
  const [connectAccountMutation, { isLoading: isConnectingAccount }] = useConnectAccountMutation();
  const [disconnectAccountMutation, { isLoading: isDisconnectingAccount }] = useDisconnectAccountMutation();
  const [deleteUserMutation, { isLoading: isDeletingUser }] = useDeleteUserMutation();

  // App state from Redux
  const appLaunchCount = useAppSelector((state) => state.user.appLaunchCount);
  const lastAppVersion = useAppSelector((state) => state.user.lastAppVersion);

  /**
   * 프로필 업데이트
   * Swift updateProfile() 메서드 대응
   */
  const updateProfile = useCallback(async (updates: { nickname?: string; profileImageURL?: string }) => {
    try {
      const result = await updateProfileMutation(updates).unwrap();
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
  const connectAccount = useCallback(async (provider: AuthProvider, token: string) => {
    try {
      await connectAccountMutation({ provider, token }).unwrap();
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
  const disconnectAccount = useCallback(async (provider: AuthProvider) => {
    try {
      await disconnectAccountMutation({ provider }).unwrap();
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
      await deleteUserMutation().unwrap();
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
    dispatch(incrementAppLaunchCount());
  }, [dispatch]);

  /**
   * 마지막 앱 버전 설정
   * Swift setLastAppVersion() 메서드 대응
   */
  const updateLastAppVersion = useCallback((version: string) => {
    dispatch(setLastAppVersion(version));
  }, [dispatch]);

  /**
   * 특정 provider의 연결된 계정 조회
   */
  const getConnectedAccount = useCallback((provider: AuthProvider) => {
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
  const isAccountConnected = useCallback((provider: AuthProvider): boolean => {
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