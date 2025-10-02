/**
 * Auth API Service
 * OAuth 및 토큰 관련 API 호출을 담당
 */

import { AuthProviderType, type TokenDto } from '../models';
import { apiClient } from '../../../services/api/client';
import { API_ENDPOINTS } from '../../../services/api/config';

/**
 * OAuth 경로 매핑
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
 */
export const authApiService = {
  /**
   * OAuth 토큰 획득
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
