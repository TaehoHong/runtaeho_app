/**
 * Auth React Query Hooks
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { AuthProviderType } from '../models';
import { queryKeys } from '../../../services/queryClient';
import { authApiService } from '../services/authApiService';

/**
 * OAuth 토큰 획득 Mutation
 */
export const useGetOAuthToken = () => {
  return useMutation({
    mutationFn: ({ provider, code }: { provider: AuthProviderType; code: string }) =>
      authApiService.getOAuthToken(provider, code),
  });
};

/**
 * 토큰 갱신 Mutation
 */
export const useRefreshToken = () => {
  return useMutation({
    mutationFn: () => authApiService.refreshToken(),
  });
};

/**
 * 로그아웃 Mutation
 */
export const useLogout = () => {
  return useMutation({
    mutationFn: () => authApiService.logout(),
  });
};

/**
 * 현재 사용자 인증 정보 조회 Query
 */
export const useGetCurrentUserAuth = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.auth.current,
    queryFn: () => authApiService.getCurrentUserAuth(),

    // 로그인 상태에서만 자동 실행 (options로 오버라이드 가능)
    enabled: options?.enabled,

    // 5분마다 자동 갱신
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
