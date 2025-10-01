/**
 * User React Query Hooks
 * 기존 userApi.ts의 RTK Query hooks를 React Query로 마이그레이션
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from './userService';
import { queryKeys } from '../queryClient';

/**
 * 사용자 ID로 사용자 정보 조회
 * 기존: useGetUserByIdQuery()
 */
export const useGetUserById = (userId: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...queryKeys.user.all, userId],
    queryFn: () => userService.getUserById(userId),
    enabled: options?.enabled,
  });
};

/**
 * 현재 사용자 데이터 조회 (UserDataDto)
 * 기존: useGetUserDataQuery()
 */
export const useGetUserData = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.user.current,
    queryFn: () => userService.getUserData(),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  });
};

/**
 * 현재 사용자 정보 조회 (User)
 * 기존: useGetCurrentUserQuery()
 */
export const useGetCurrentUser = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...queryKeys.user.current, 'transformed'],
    queryFn: () => userService.getCurrentUser(),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  });
};

/**
 * 사용자 프로필 업데이트
 * 기존: useUpdateUserProfileMutation()
 */
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: { nickname?: string; profileImageURL?: string }) =>
      userService.updateUserProfile(updates),
    onSuccess: () => {
      // User 쿼리 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
  });
};

/**
 * 사용자 계정 연결
 * 기존: useConnectAccountMutation()
 */
export const useConnectAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provider, token }: { provider: string; token: string }) =>
      userService.connectAccount(provider, token),
    onSuccess: () => {
      // User 쿼리 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
  });
};

/**
 * 사용자 계정 연결 해제
 * 기존: useDisconnectAccountMutation()
 */
export const useDisconnectAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: string) => userService.disconnectAccount(provider),
    onSuccess: () => {
      // User 쿼리 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
  });
};

/**
 * 사용자 삭제 (탈퇴)
 * 기존: useDeleteUserMutation()
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => userService.deleteUser(),
    onSuccess: () => {
      // 모든 캐시 클리어
      queryClient.clear();
    },
  });
};
