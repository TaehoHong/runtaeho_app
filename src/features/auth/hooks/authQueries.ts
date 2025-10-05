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
