import { AxiosError, type AxiosResponse } from 'axios';
import { silentTokenRefreshService, type TokenPair, RefreshTokenExpiredError } from '~/features/auth/services/SilentTokenRefreshService';
import { tokenUtils } from '~/features/auth/utils/jwtUtils';
import { apiClient } from '~/services/api/client';
import { tokenStorage } from '~/utils/storage';
import { SessionSupersededError } from '~/utils/storage/errors';
import { isSessionCurrent, isSessionGenerationCurrent, useAuthStore } from '~/features/auth/stores/authStore';
import { queryClient } from '~/services/queryClient';
import { resetAllAppData } from './AppResetService';

const TOKEN_REFRESH_THRESHOLD_SECONDS = 5 * 60;

export class TokenRefreshInterceptor {
  private static instance: TokenRefreshInterceptor;
  private flight: { generation: number; promise: Promise<TokenPair> } | null = null;

  private constructor() {}

  async handleResponseError(error: AxiosError): Promise<AxiosResponse> {
    const request = error.config;
    if (!request || error.response?.status !== 401 || request.authRetried ||
        request.headers?.['x-requires-auth'] === 'false') throw error;
    const snapshot = request.sessionSnapshot;
    if (!snapshot || !isSessionCurrent(snapshot)) throw new SessionSupersededError();
    request.authRetried = true;
    const currentToken = useAuthStore.getState().accessToken;
    // Another request may already have refreshed this rejected token.
    if (!currentToken || request.headers.Authorization === `Bearer ${currentToken}`) {
      await this.refreshTokens();
    }
    if (!isSessionCurrent(snapshot)) throw new SessionSupersededError();
    return apiClient(request);
  }

  static getInstance(): TokenRefreshInterceptor {
    if (!this.instance) this.instance = new TokenRefreshInterceptor();
    return this.instance;
  }

  async validateAndRefreshIfNeeded(): Promise<void> {
    if (useAuthStore.getState().tokensRevoked) return;
    const generation = useAuthStore.getState().sessionGeneration;
    try {
      const token = useAuthStore.getState().accessToken ?? await tokenStorage.getAccessToken();
      if (!isSessionGenerationCurrent(generation)) throw new SessionSupersededError();
      if (token && tokenUtils.isTokenExpiringSoon(token, TOKEN_REFRESH_THRESHOLD_SECONDS)) {
        await this.refreshTokens();
      }
    } catch (error) {
      if (error instanceof SessionSupersededError) throw error;
      // Proactive refresh is best effort. A valid access token can still work.
      console.warn('[AuthRefresh] proactive refresh unavailable');
    }
  }

  refreshTokens(): Promise<TokenPair> {
    if (useAuthStore.getState().tokensRevoked) return Promise.reject(new SessionSupersededError());
    const generation = useAuthStore.getState().sessionGeneration;
    if (this.flight?.generation === generation) return this.flight.promise;
    const promise = this.performRefresh(generation);
    const flight = { generation, promise };
    this.flight = flight;
    void promise.then(() => {
      if (this.flight === flight) this.flight = null;
    }, () => {
      if (this.flight === flight) this.flight = null;
    });
    return promise;
  }

  /** A consent change must use a refresh started after its successful POST. */
  async refreshAfterConsent(): Promise<TokenPair> {
    const generation = useAuthStore.getState().sessionGeneration;
    const previous = this.flight;
    if (previous?.generation === generation) {
      try { await previous.promise; }
      catch (error) {
        if (!isSessionGenerationCurrent(generation)) throw new SessionSupersededError();
        if (error instanceof RefreshTokenExpiredError) throw error;
      }
    }
    if (!isSessionGenerationCurrent(generation)) throw new SessionSupersededError();
    return this.refreshTokens();
  }

  private async performRefresh(generation: number): Promise<TokenPair> {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!isSessionGenerationCurrent(generation)) throw new SessionSupersededError();
      if (!refreshToken) throw new Error('RefreshTokenNotFound');
      const pair = await silentTokenRefreshService.performSilentRefresh(refreshToken);
      await tokenStorage.saveTokens(pair.accessToken, pair.refreshToken, {
        isCurrent: () => isSessionGenerationCurrent(generation),
        onCommit: () => useAuthStore.setState({ accessToken: pair.accessToken, refreshToken: pair.refreshToken }),
      });
      return pair;
    } catch (error) {
      if (!isSessionGenerationCurrent(generation)) throw new SessionSupersededError();
      if (error instanceof RefreshTokenExpiredError ||
          (error instanceof Error && error.message === 'RefreshTokenExpired')) {
        await resetAllAppData(queryClient, 'auth-expired');
      }
      throw error;
    }
  }

  reset(): void {
    if (__DEV__) this.flight = null;
  }
}

export const tokenRefreshInterceptor = TokenRefreshInterceptor.getInstance();
