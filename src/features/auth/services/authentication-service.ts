import { TokenDto, AuthProvider, AuthenticationError, AUTH_PROVIDER_INFO } from '../models/auth-types';
import { store } from '../../../store';

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
   * RTK Query 기반으로 리팩토링
   * @param provider 인증 제공자 (GOOGLE | APPLE)
   * @param code OAuth 인증 코드
   * @returns Promise<TokenDto>
   */
  async getToken(provider: AuthProvider, code: string): Promise<TokenDto> {
    const authId = Math.random().toString(36).substr(2, 9);
    const providerName = AUTH_PROVIDER_INFO[provider].displayName;

    console.log(`🔐 [AUTH-${authId}] ${providerName} 토큰 요청 시작 (RTK Query)`);
    console.log(`   Provider: ${provider}`);
    console.log(`   Code: ${code.substring(0, 20)}...${code.substring(code.length - 10)}`);

    const startTime = Date.now();

    try {
      // RTK Query mutation을 직접 dispatch
      const result = await store.dispatch(
        store.getState().api.endpoints.getOAuthToken.initiate({ provider, code })
      ).unwrap();

      const duration = Date.now() - startTime;

      console.log(`✅ [AUTH-${authId}] ${providerName} 토큰 수신 성공 (${duration}ms)`);
      console.log(`   User ID: ${result.userId}`);
      console.log(`   Access Token: ${result.accessToken ? '***' : 'null'}`);
      console.log(`   Refresh Token: ${result.refreshToken ? '***' : 'null'}`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [AUTH-${authId}] ${providerName} 토큰 요청 실패 (${duration}ms):`, error);
      throw AuthenticationError.networkError(error as Error);
    }
  }

  /**
   * 리프레시 토큰을 사용해 새로운 JWT 토큰을 받아옵니다
   * RTK Query 기반으로 리팩토링
   * @returns Promise<TokenDto>
   */
  async refresh(): Promise<TokenDto> {
    const refreshId = Math.random().toString(36).substr(2, 9);

    console.log(`🔄 [AUTH-REFRESH-${refreshId}] 토큰 갱신 요청 시작 (RTK Query)`);

    const startTime = Date.now();

    try {
      // RTK Query mutation을 직접 dispatch
      const result = await store.dispatch(
        store.getState().api.endpoints.refreshToken.initiate()
      ).unwrap();

      const duration = Date.now() - startTime;

      console.log(`✅ [AUTH-REFRESH-${refreshId}] 토큰 갱신 성공 (${duration}ms)`);
      console.log(`   User ID: ${result.userId}`);
      console.log(`   Access Token: ${result.accessToken ? '***' : 'null'}`);
      console.log(`   Refresh Token: ${result.refreshToken ? '***' : 'null'}`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [AUTH-REFRESH-${refreshId}] 토큰 갱신 실패 (${duration}ms):`, error);
      throw AuthenticationError.networkError(error as Error);
    }
  }

}