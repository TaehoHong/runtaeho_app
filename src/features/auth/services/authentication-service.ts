import { HttpClient, APIEndpoint } from '../../../shared/services/api/http-client';
import { ApiPath } from '../../../shared/config/endpoints/api-path';
import { TokenDto, AuthProvider, AuthenticationError, AUTH_PROVIDER_INFO } from '../models/auth-types';

export class AuthenticationService {
  private static instance: AuthenticationService;

  private constructor() {}

  static get shared(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * OAuth 인증 코드를 사용해 JWT 토큰을 받아옵니다
   * @param provider 인증 제공자 (GOOGLE | APPLE)
   * @param code OAuth 인증 코드
   * @returns Promise<TokenDto>
   */
  async getToken(provider: AuthProvider, code: string): Promise<TokenDto> {
    console.log(`Getting token for ${AUTH_PROVIDER_INFO[provider].displayName} with code: ${code}`);

    const urlPath = this.getOAuthPath(provider);

    const endpoint: APIEndpoint = {
      path: urlPath,
      method: 'GET',
      parameters: { code } // GET 요청이므로 쿼리 파라미터로 전송
    };

    try {
      const tokenDto = await HttpClient.getInstance().request<TokenDto>(endpoint);
      console.log(`Token received for ${AUTH_PROVIDER_INFO[provider].displayName}:`, tokenDto);
      return tokenDto;
    } catch (error) {
      console.error(`Error occurred for ${AUTH_PROVIDER_INFO[provider].displayName}:`, error);
      throw AuthenticationError.networkError(error as Error);
    }
  }

  /**
   * 리프레시 토큰을 사용해 새로운 JWT 토큰을 받아옵니다
   * @returns Promise<TokenDto>
   */
  async refresh(): Promise<TokenDto> {
    const endpoint: APIEndpoint = {
      path: ApiPath.Auth.refresh,
      method: 'POST'
    };

    try {
      const tokenDto = await HttpClient.getInstance().request<TokenDto>(endpoint);
      console.log('Token refreshed:', tokenDto);
      return tokenDto;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw AuthenticationError.networkError(error as Error);
    }
  }

  /**
   * AuthProvider에 따라 적절한 OAuth 경로를 반환합니다
   * @param provider 인증 제공자
   * @returns OAuth API 경로
   */
  private getOAuthPath(provider: AuthProvider): string {
    switch (provider) {
      case AuthProvider.GOOGLE:
        return ApiPath.Auth.googleOAuth;
      case AuthProvider.APPLE:
        return ApiPath.Auth.appleOAuth;
      default:
        throw new AuthenticationError(`Unsupported auth provider: ${provider}`);
    }
  }
}