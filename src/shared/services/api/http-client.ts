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
    this.baseURL = 'http://localhost:8080';
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

    try {
      const response = await fetch(url, config);

      // 401 에러 시 토큰 갱신 시도
      if (response.status === 401 && this.needsAuth(endpoint.path)) {
        const refreshResult = await this.tryRefreshToken();
        if (refreshResult) {
          // 토큰 갱신 성공 시 요청 재시도
          const retryConfig = this.buildRequestConfig(endpoint);
          const retryResponse = await fetch(url, retryConfig);
          return this.handleResponse<T>(retryResponse);
        } else {
          // 토큰 갱신 실패 시 로그아웃
          await UserStateManager.getInstance().logout();
          throw new Error('Authentication failed');
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('HTTP request failed:', error);
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

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // 응답이 비어있는 경우 처리
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private needsAuth(path: string): boolean {
    return !path.includes('/oauth/') && !path.includes('/auth/');
  }

  private isRefresh(path: string): boolean {
    return path.includes('/refresh');
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const refreshToken = UserStateManager.getInstance().refreshToken;
      if (!refreshToken) {
        return false;
      }

      // 무한 루프 방지를 위해 직접 fetch 사용
      const url = `${this.baseURL}/api/v1/auth/refresh`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Refresh': `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const tokenDto: TokenDto = await response.json();

      // 새로운 토큰으로 업데이트
      const userStateManager = UserStateManager.getInstance();
      await userStateManager.updateTokens(
        tokenDto.accessToken,
        tokenDto.refreshToken
      );

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }
}