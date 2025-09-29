/**
 * @deprecated HttpClient는 RTK Query로 대체되었습니다.
 *
 * 새로운 API 요청은 RTK Query를 사용하세요:
 * - src/store/api/ 폴더의 API 정의 사용
 * - baseApi에서 자동 토큰 갱신 및 에러 핸들링 제공
 *
 * 특수한 케이스에서만 이 클래스를 사용하고,
 * 일반적인 REST API 호출은 RTK Query 사용을 권장합니다.
 */

import { UserStateManager } from '../user-state-manager';
import { TokenDto } from '../../../features/auth/models/auth-types';

export interface APIEndpoint {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  parameters?: Record<string, any>;
  body?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface HTTPClientResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export class HttpClient {
  private static instance: HttpClient;
  private baseURL: string;

  private constructor() {
    // TODO: 실제 API 서버 URL로 변경
    this.baseURL = 'http://localhost:8080/';
  }

  static getInstance(): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient();
    }
    return HttpClient.instance;
  }

  static get shared(): HttpClient {
    return HttpClient.getInstance();
  }

  async request<T>(endpoint: APIEndpoint): Promise<T> {
    const url = this.buildURL(endpoint);
    const config = this.buildRequestConfig(endpoint);
    const requestId = Math.random().toString(36).substr(2, 9);

    // 🚀 요청 로깅
    console.log(`🚀 [HTTP-${requestId}] 요청 시작`);
    console.log(`   URL: ${endpoint.method || 'GET'} ${url}`);
    console.log(`   Headers:`, config.headers);
    if (config.body) {
      console.log(`   Body:`, config.body);
    }
    if (endpoint.parameters) {
      console.log(`   Parameters:`, endpoint.parameters);
    }

    const startTime = Date.now();

    try {
      const response = await fetch(url, config);
      const duration = Date.now() - startTime;

      // 📥 응답 로깅
      console.log(`📥 [HTTP-${requestId}] 응답 수신 (${duration}ms)`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));

      // 401 에러 시 토큰 갱신 시도
      if (response.status === 401 && this.needsAuth(endpoint.path)) {
        console.log(`🔄 [HTTP-${requestId}] 401 오류 - 토큰 갱신 시도`);
        const refreshResult = await this.tryRefreshToken();
        if (refreshResult) {
          console.log(`✅ [HTTP-${requestId}] 토큰 갱신 성공 - 요청 재시도`);
          // 토큰 갱신 성공 시 요청 재시도
          const retryConfig = this.buildRequestConfig(endpoint);
          const retryResponse = await fetch(url, retryConfig);
          const retryDuration = Date.now() - startTime;

          console.log(`📥 [HTTP-${requestId}] 재시도 응답 수신 (총 ${retryDuration}ms)`);
          console.log(`   Status: ${retryResponse.status} ${retryResponse.statusText}`);

          return this.handleResponse<T>(retryResponse, requestId);
        } else {
          console.log(`❌ [HTTP-${requestId}] 토큰 갱신 실패 - 로그아웃`);
          // 토큰 갱신 실패 시 로그아웃
          await UserStateManager.getInstance().logout();
          throw new Error('Authentication failed');
        }
      }

      return this.handleResponse<T>(response, requestId);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [HTTP-${requestId}] 요청 실패 (${duration}ms):`, error);
      throw error;
    }
  }

  async requestVoid(endpoint: APIEndpoint): Promise<void> {
    await this.request<void>(endpoint);
  }

  private buildURL(endpoint: APIEndpoint): string {
    let url = `${this.baseURL}${endpoint.path}`;

    if (endpoint.method === 'GET' && endpoint.parameters) {
      const searchParams = new URLSearchParams();
      Object.entries(endpoint.parameters).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  private buildRequestConfig(endpoint: APIEndpoint): RequestInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...endpoint.headers,
    };

    // 인증이 필요한 경우 토큰 추가
    if (this.needsAuth(endpoint.path)) {
      const accessToken = UserStateManager.getInstance().accessToken;
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    // 리프레시 토큰이 필요한 경우
    if (this.isRefresh(endpoint.path)) {
      const refreshToken = UserStateManager.getInstance().refreshToken;
      if (refreshToken) {
        headers['Refresh'] = `Bearer ${refreshToken}`;
      }
    }

    const config: RequestInit = {
      method: endpoint.method || 'GET',
      headers,
    };

    // POST, PUT, PATCH 등의 경우 body 추가
    if (endpoint.body && endpoint.method !== 'GET') {
      config.body = JSON.stringify(endpoint.body);
    }

    return config;
  }

  private async handleResponse<T>(response: Response, requestId?: string): Promise<T> {
    const logPrefix = requestId ? `[HTTP-${requestId}]` : '[HTTP]';

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ${logPrefix} 응답 에러:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // 응답이 비어있는 경우 처리
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.log(`📄 ${logPrefix} 비어있는 응답 또는 JSON이 아님`);
      return undefined as T;
    }

    const responseData = await response.json() as T;
    console.log(`📊 ${logPrefix} 응답 데이터:`, responseData);
    return responseData;
  }

  private needsAuth(path: string): boolean {
    return !path.includes('/oauth/') && !path.includes('/auth/');
  }

  private isRefresh(path: string): boolean {
    return path.includes('/refresh');
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshId = Math.random().toString(36).substr(2, 9);

    try {
      const refreshToken = UserStateManager.getInstance().refreshToken;
      if (!refreshToken) {
        console.log(`🔄 [REFRESH-${refreshId}] 리프레시 토큰이 없음`);
        return false;
      }

      console.log(`🔄 [REFRESH-${refreshId}] 토큰 갱신 시작`);
      const startTime = Date.now();

      // 무한 루프 방지를 위해 직접 fetch 사용
      const url = `${this.baseURL}/api/v1/auth/refresh`;
      const requestConfig = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Refresh': `Bearer ${refreshToken}`,
        },
      };

      console.log(`🚀 [REFRESH-${refreshId}] 요청:`, {
        url,
        headers: requestConfig.headers
      });

      const response = await fetch(url, requestConfig);
      const duration = Date.now() - startTime;

      console.log(`📥 [REFRESH-${refreshId}] 응답 (${duration}ms):`, {
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [REFRESH-${refreshId}] 토큰 갱신 실패:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const tokenDto: TokenDto = await response.json();
      console.log(`✅ [REFRESH-${refreshId}] 새 토큰 수신:`, {
        accessToken: tokenDto.accessToken ? '***' : 'null',
        refreshToken: tokenDto.refreshToken ? '***' : 'null',
        userId: tokenDto.userId
      });

      // 새로운 토큰으로 업데이트
      const userStateManager = UserStateManager.getInstance();
      await userStateManager.updateTokens(
        tokenDto.accessToken,
        tokenDto.refreshToken
      );

      console.log(`💾 [REFRESH-${refreshId}] 토큰 저장 완료`);
      return true;
    } catch (error) {
      console.error(`❌ [REFRESH-${refreshId}] 토큰 갱신 실패:`, error);
      return false;
    }
  }
}