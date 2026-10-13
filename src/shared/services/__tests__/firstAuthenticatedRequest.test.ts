import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '~/services/api/client';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { silentTokenRefreshService } from '~/features/auth/services/SilentTokenRefreshService';
import { tokenStorage } from '~/utils/storage';

jest.mock('~/services/api/interceptors', () => ({ httpRequestLogging: jest.fn(), httpResponseLogging: jest.fn() }));
jest.mock('~/config/sentry', () => ({ clearUserContext: jest.fn() }));
jest.mock('~/shared/services/AppResetService', () => ({ resetAllAppData: jest.fn() }));
jest.mock('~/utils/storage', () => ({ tokenStorage: {
  getAccessToken: jest.fn(), getRefreshToken: jest.fn(), saveTokens: jest.fn(),
} }));

it('refreshes the first protected request even before the coordinator has been loaded', async () => {
  const expired = `header.${btoa(JSON.stringify({ exp: 1 }))}.sig`;
  const renewed = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.sig`;
  useAuthStore.setState({ accessToken: expired, refreshToken: 'refresh-a', tokensRevoked: false, isLoggedIn: true });
  jest.mocked(tokenStorage.getRefreshToken).mockResolvedValue('refresh-a');
  jest.mocked(tokenStorage.saveTokens).mockImplementation(async (_a, _r, options) => { options?.onCommit?.(); });
  const refresh = jest.spyOn(silentTokenRefreshService, 'performSilentRefresh')
    .mockResolvedValue({ accessToken: renewed, refreshToken: 'refresh-new' });
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
    const response = { config, data: 'ok', status: 200, statusText: 'OK', headers: new AxiosHeaders() };
    if (config.headers.Authorization === `Bearer ${expired}`) {
      throw new AxiosError('expired', 'ERR_BAD_RESPONSE', config, undefined, { ...response, status: 401 });
    }
    return response;
  });
  apiClient.defaults.adapter = adapter;
  try {
    await expect(apiClient.get('/protected')).resolves.toMatchObject({ data: 'ok' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(2);
  } finally { refresh.mockRestore(); }
});
