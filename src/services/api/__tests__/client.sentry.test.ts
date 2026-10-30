import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '../client';
import { reportError } from '~/config/sentry';
import { tokenRefreshInterceptor } from '~/shared/services/TokenRefreshInterceptor';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { ErrorService } from '~/shared/services/ErrorService';

jest.mock('~/config/sentry', () => ({ reportError: jest.fn(), addBreadcrumb: jest.fn() }));
jest.mock('~/utils/storage', () => ({ tokenStorage: {} }));
jest.mock('~/shared/services/AppResetService', () => ({ resetAllAppData: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().invalidateSession();
  useAuthStore.setState({ isLoggedIn: true, tokensRevoked: false, accessToken: 'test-access' });
  jest.spyOn(tokenRefreshInterceptor, 'validateAndRefreshIfNeeded').mockResolvedValue();
  jest.spyOn(tokenRefreshInterceptor, 'refreshTokens').mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' });
});
afterEach(() => jest.restoreAllMocks());

const response = (config: InternalAxiosRequestConfig, status: number) => ({
  config, status, statusText: '', headers: new AxiosHeaders(), data: 'result',
});

it('does not create an issue for a request recovered by token refresh', async () => {
  apiClient.defaults.adapter = async config => {
    if (!config.authRetried) throw new AxiosError('expired', 'ERR_BAD_REQUEST', config, undefined, response(config, 401));
    return response(config, 200);
  };
  await expect(apiClient.get('/running')).resolves.toMatchObject({ status: 200 });
  expect(tokenRefreshInterceptor.refreshTokens).toHaveBeenCalledTimes(1);
  expect(reportError).not.toHaveBeenCalled();
});

it('reports the final retry failure once and preserves the original error', async () => {
  let finalError: AxiosError | undefined;
  apiClient.defaults.adapter = async config => {
    if (!config.authRetried) throw new AxiosError('expired', 'ERR_BAD_REQUEST', config, undefined, response(config, 401));
    finalError = new AxiosError('private-response', 'ERR_BAD_RESPONSE', config, undefined, response(config, 500));
    throw finalError;
  };
  await expect(apiClient.get('/running').catch(error => {
    ErrorService.getInstance().handleError(error, {}, false);
    throw error;
  })).rejects.toMatchObject({ message: 'private-response' });
  expect(reportError).toHaveBeenCalledTimes(1);
  expect(jest.mocked(reportError).mock.calls[0]?.[0]).not.toBe(finalError);
});
