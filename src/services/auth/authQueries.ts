/**
 * Auth React Query Hooks
 * 기존 authApi.ts의 RTK Query hooks를 React Query로 마이그레이션
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { AuthProviderType } from '~/features/auth/models';
import { queryKeys } from '../queryClient';
import { authService } from './authService';

/**
 * OAuth 토큰 획득 Mutation
 * 기존: authApi.useGetOAuthTokenMutation()
 */
export const useGetOAuthToken = () => {
  return useMutation({
    mutationFn: ({ provider, code }: { provider: AuthProviderType; code: string }) =>
      authService.getOAuthToken(provider, code),
  });
};

/**
 * 토큰 갱신 Mutation
 * 기존: authApi.useRefreshTokenMutation()
 */
export const useRefreshToken = () => {
  return useMutation({
    mutationFn: () => authService.refreshToken(),
  });
};

/**
 * 로그아웃 Mutation
 * 기존: authApi.useLogoutMutation()
 */
export const useLogout = () => {
  return useMutation({
    mutationFn: () => authService.logout(),
  });
};

/**
 * 현재 사용자 인증 정보 조회 Query
 * 기존: authApi.useGetCurrentUserAuthQuery()
 */
export const useGetCurrentUserAuth = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.auth.current,
    queryFn: () => authService.getCurrentUserAuth(),

    // 로그인 상태에서만 자동 실행 (options로 오버라이드 가능)
    enabled: options?.enabled,

    // 5분마다 자동 갱신 (기존 RTK Query 설정과 동일)
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
