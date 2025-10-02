/**
 * Auth Service
 * 기존 authApi.ts에서 마이그레이션
 * RTK Query → Axios
 */

import { AuthProviderType, type TokenDto } from '~/features/auth/models';
import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/config';

/**
 * OAuth 경로 매핑
 * 기존 getOAuthPath 함수와 동일
 */
const getOAuthPath = (provider: AuthProviderType): string => {
  switch (provider) {
    case AuthProviderType.GOOGLE:
      return API_ENDPOINTS.AUTH.OAUTH_GOOGLE;
    case AuthProviderType.APPLE:
      return API_ENDPOINTS.AUTH.OAUTH_APPLE;
    default:
      throw new Error(`Unsupported auth provider: ${provider}`);
  }
};

/**
 * Authentication API Service
 * 기존 authApi.endpoints를 함수로 변환
 */
export const authService = {
  /**
   * OAuth 토큰 획득
   * 기존: getOAuthToken mutation
   */
  getOAuthToken: async (provider: AuthProviderType, code: string): Promise<TokenDto> => {
    const oauthPath = getOAuthPath(provider);
    const { data } = await apiClient.get<TokenDto>(oauthPath, {
      params: { code }, // GET 요청이므로 쿼리 파라미터로 전송
      headers: { 'x-requires-auth': 'false' }
    });
    return data;
  },

  /**
   * 토큰 갱신
   */
  refreshToken: async (): Promise<TokenDto> => {
    const { data } = await apiClient.post<TokenDto>(API_ENDPOINTS.AUTH.REFRESH);
    return data;
  }

};
