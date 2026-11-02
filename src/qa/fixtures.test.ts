import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { assertQaTokenIsLocal, isUiQaEnabled } from './config';
import { configureQaScenario, qaAdapter, qaTokens } from './fixtures';
import { SilentTokenRefreshService } from '~/features/auth/services/SilentTokenRefreshService';
import { apiClient } from '~/services/api/client';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { tokenRefreshInterceptor } from '~/shared/services/TokenRefreshInterceptor';

jest.mock('~/shared/services/AppResetService', () => ({ resetAllAppData: jest.fn() }));

const request = (url: string, method = 'get', data?: unknown) => qaAdapter({
  url, method, data, headers: new AxiosHeaders(),
} as InternalAxiosRequestConfig);

beforeEach(() => { configureQaScenario('populated'); });

it.each([
  [false, 'local', '1'], [true, 'production', '1'], [true, 'development', '1'], [true, 'local', undefined],
])('does not enable QA outside the explicit local development opt-in: %s %s %s', (dev, env, flag) => {
  expect(isUiQaEnabled(dev, env, flag)).toBe(false);
});

it('enables only local development and prevents a saved synthetic token from using the normal API', () => {
  expect(isUiQaEnabled(true, 'local', '1')).toBe(true);
  expect(() => assertQaTokenIsLocal(false, qaTokens().accessToken)).toThrow('Local UI QA session');
  expect(() => assertQaTokenIsLocal(true, qaTokens().accessToken)).not.toThrow();
  expect(() => assertQaTokenIsLocal(false, 'real-session')).not.toThrow();
});

it('rejects an unhandled mutation instead of falling back to a real server', async () => {
  await expect(request('https://example.invalid/api/v1/unhandled', 'post', { value: 'synthetic' }))
    .rejects.toMatchObject({ response: { status: 501 } });
});

it('never sends a persisted fixture refresh token to a real server after QA is disabled', async () => {
  const fetchMock = jest.spyOn(global, 'fetch');
  try {
    await expect(SilentTokenRefreshService.getInstance().performSilentRefresh('ui-qa.local-only'))
      .rejects.toThrow('Local UI QA session');
    expect(fetchMock).not.toHaveBeenCalled();
  } finally { fetchMock.mockRestore(); }
});

it('blocks a fixture token restored while the request is awaiting token validation', async () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalToken = useAuthStore.getState().accessToken;
  const originalRevoked = useAuthStore.getState().tokensRevoked;
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config }));
  const validation = jest.spyOn(tokenRefreshInterceptor, 'validateAndRefreshIfNeeded').mockImplementation(async () => {
    useAuthStore.setState({ accessToken: qaTokens().accessToken });
  });
  apiClient.defaults.adapter = adapter;
  useAuthStore.setState({ accessToken: null, tokensRevoked: false });
  try {
    await expect(apiClient.get('/local-qa-isolation-probe')).rejects.toThrow('Local UI QA session');
    expect(adapter).not.toHaveBeenCalled();
  } finally {
    validation.mockRestore();
    if (originalAdapter === undefined) delete apiClient.defaults.adapter;
    else apiClient.defaults.adapter = originalAdapter;
    useAuthStore.setState({ accessToken: originalToken, tokensRevoked: originalRevoked });
  }
});

it.each(['Authorization', 'authorization'])('blocks explicit fixture credentials in the %s header', async header => {
  const originalAdapter = apiClient.defaults.adapter;
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config }));
  apiClient.defaults.adapter = adapter;
  try {
    await expect(apiClient.get('/local-qa-isolation-probe', {
      headers: { [header]: `Bearer ${qaTokens().accessToken}`, 'x-requires-auth': 'false' },
    })).rejects.toThrow('Local UI QA session');
    expect(adapter).not.toHaveBeenCalled();
  } finally {
    if (originalAdapter === undefined) delete apiClient.defaults.adapter;
    else apiClient.defaults.adapter = originalAdapter;
  }
});

it('resets local fixture mutations when switching scenarios', async () => {
  await request('/shoes', 'post', { brand: 'QA', model: 'Local shoe' });
  expect((await request('/shoes')).data).toHaveLength(9);
  configureQaScenario('empty');
  expect((await request('/shoes')).data).toEqual([]);
  expect((await request('/users/me')).data).toMatchObject({ haveRunningRecord: false, totalPoint: 0 });
  configureQaScenario('populated');
  expect((await request('/shoes')).data).toHaveLength(8);
});

it('provides a recoverable HTTP failure for the error state without blocking fixture login', async () => {
  configureQaScenario('error');
  expect((await request('/users/me')).data.id).toBe(900001);
  await expect(request('/league/current')).rejects.toMatchObject({ response: { status: 503 } });
  expect((await request('/league/current')).data).toMatchObject({ tierName: 'SILVER', totalParticipants: 12 });
});
