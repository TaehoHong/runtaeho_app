import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '~/services/api/client';
import { tokenRefreshInterceptor } from '../TokenRefreshInterceptor';
import { useAuthStore, getSessionSnapshot } from '~/features/auth/stores/authStore';
import { silentTokenRefreshService, RefreshTokenExpiredError, type TokenPair } from '~/features/auth/services/SilentTokenRefreshService';
import { tokenStorage } from '~/utils/storage';
import { resetAllAppData } from '../AppResetService';
import { SessionSupersededError } from '~/utils/storage/errors';

jest.mock('~/services/api/interceptors', () => ({ httpRequestLogging: jest.fn(), httpResponseLogging: jest.fn() }));
jest.mock('~/config/sentry', () => ({ clearUserContext: jest.fn() }));
jest.mock('~/shared/services/AppResetService', () => ({ resetAllAppData: jest.fn() }));
jest.mock('~/utils/storage', () => ({ tokenStorage: {
  getAccessToken: jest.fn(), getRefreshToken: jest.fn(), saveTokens: jest.fn(),
} }));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const jwt = (seconds: number) => `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + seconds }))}.sig`;
const ok = (config: InternalAxiosRequestConfig, data: unknown = 'done') => ({ config, data, status: 200, statusText: 'OK', headers: new AxiosHeaders() });
const fail = (config: InternalAxiosRequestConfig, status: number): never => {
  throw new AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', config, undefined, { ...ok(config), status });
};
let refresh: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  tokenRefreshInterceptor.reset();
  useAuthStore.getState().logout();
  useAuthStore.setState({ isLoggedIn: true, tokensRevoked: false, accessToken: jwt(600), refreshToken: 'refresh-a' });
  jest.mocked(tokenStorage.getRefreshToken).mockResolvedValue('refresh-a');
  jest.mocked(tokenStorage.getAccessToken).mockImplementation(async () => useAuthStore.getState().accessToken);
  jest.mocked(tokenStorage.saveTokens).mockImplementation(async (_a, _r, options) => {
    if (options?.isCurrent && !options.isCurrent()) throw new SessionSupersededError();
    options?.onCommit?.();
  });
  refresh = jest.spyOn(silentTokenRefreshService, 'performSilentRefresh');
});
afterEach(() => { refresh.mockRestore(); });

it('settles a 401 joining a refresh started proactively and replays once', async () => {
  const pending = deferred<TokenPair>();
  refresh.mockReturnValue(pending.promise);
  const started = deferred<void>();
  const initialToken = useAuthStore.getState().accessToken;
  apiClient.defaults.adapter = async config => {
    if (!config.authRetried) { started.resolve(); return fail(config, 401); }
    expect(config.headers.Authorization).not.toBe(`Bearer ${initialToken}`);
    return ok(config);
  };
  const flight = tokenRefreshInterceptor.refreshTokens();
  const request = apiClient.get('/protected');
  await started.promise;
  const pair = { accessToken: jwt(3600), refreshToken: 'refresh-new' };
  pending.resolve(pair);
  await expect(flight).resolves.toEqual(pair);
  await expect(request).resolves.toMatchObject({ data: 'done' });
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('rejects all joined callers on a transient refresh failure without logout', async () => {
  const pending = deferred<TokenPair>();
  refresh.mockReturnValue(pending.promise);
  const first = tokenRefreshInterceptor.refreshTokens();
  const second = tokenRefreshInterceptor.refreshTokens();
  const expectations = [expect(first).rejects.toThrow('MaxRetryExceeded'), expect(second).rejects.toThrow('MaxRetryExceeded')];
  pending.reject(new Error('MaxRetryExceeded'));
  await Promise.all(expectations);
  expect(resetAllAppData).not.toHaveBeenCalled();
  expect(useAuthStore.getState().isLoggedIn).toBe(true);
});

it('does not publish an old refresh over a newer account', async () => {
  const pending = deferred<TokenPair>();
  refresh.mockReturnValue(pending.promise);
  const flight = tokenRefreshInterceptor.refreshTokens();
  await Promise.resolve();
  useAuthStore.getState().invalidateSession();
  useAuthStore.setState({ accessToken: 'b-access', refreshToken: 'b-refresh' });
  pending.resolve({ accessToken: 'a-access', refreshToken: 'a-refresh' });
  await expect(flight).rejects.toBeInstanceOf(SessionSupersededError);
  expect(useAuthStore.getState().accessToken).toBe('b-access');
});

it('forces a post-consent refresh after the earlier flight', async () => {
  const old = deferred<TokenPair>();
  refresh.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ accessToken: 'consented', refreshToken: 'new-refresh' });
  const first = tokenRefreshInterceptor.refreshTokens();
  const afterConsent = tokenRefreshInterceptor.refreshAfterConsent();
  old.resolve({ accessToken: 'not-consented', refreshToken: 'old-refresh' });
  await first;
  await expect(afterConsent).resolves.toMatchObject({ accessToken: 'consented' });
  expect(refresh).toHaveBeenCalledTimes(2);
});

it('never dispatches an A payload with B credentials after request waiting', async () => {
  const pending = deferred<TokenPair>();
  const refreshing = deferred<void>();
  useAuthStore.setState({ accessToken: jwt(60) });
  refresh.mockImplementation(() => { refreshing.resolve(); return pending.promise; });
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => ok(config));
  apiClient.defaults.adapter = adapter;
  const request = apiClient.post('/owned', { privatePayload: 'account-a' }, { sessionSnapshot: getSessionSnapshot() });
  const rejected = expect(request).rejects.toBeInstanceOf(SessionSupersededError);
  await refreshing.promise;
  useAuthStore.getState().invalidateSession();
  useAuthStore.setState({ accessToken: 'b-token' });
  pending.resolve({ accessToken: 'a-token', refreshToken: 'a-refresh' });
  await rejected;
  expect(adapter).not.toHaveBeenCalled();
});

it.each([401, 403])('does not refresh a public request rejected with %s', async status => {
  apiClient.defaults.adapter = async config => fail(config, status);
  await expect(apiClient.get('/oauth', { headers: { 'x-requires-auth': 'false' } })).rejects.toMatchObject({ response: { status } });
  expect(refresh).not.toHaveBeenCalled();
  expect(resetAllAppData).not.toHaveBeenCalled();
});

it('preserves a protected API 403 but cleans up a refresh 403', async () => {
  apiClient.defaults.adapter = async config => fail(config, 403);
  await expect(apiClient.get('/protected')).rejects.toMatchObject({ response: { status: 403 } });
  expect(resetAllAppData).not.toHaveBeenCalled();
  refresh.mockRejectedValue(new RefreshTokenExpiredError());
  await expect(tokenRefreshInterceptor.refreshTokens()).rejects.toBeInstanceOf(RefreshTokenExpiredError);
  expect(resetAllAppData).toHaveBeenCalledWith(expect.anything(), 'auth-expired');
});

it('still sends a valid token if proactive refresh is temporarily unavailable', async () => {
  useAuthStore.setState({ accessToken: jwt(60) });
  refresh.mockRejectedValue(new Error('MaxRetryExceeded'));
  apiClient.defaults.adapter = async config => ok(config);
  await expect(apiClient.get('/protected')).resolves.toMatchObject({ data: 'done' });
  expect(resetAllAppData).not.toHaveBeenCalled();
});
