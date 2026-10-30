import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '~/services/api/client';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { createUser } from '~/features/user/models/User';
import { useUserStore } from '~/stores/user/userStore';
import { useLeagueCheckStore } from '~/stores/league/leagueCheckStore';
import { tokenRefreshInterceptor } from '~/shared/services/TokenRefreshInterceptor';
import { useLeagueCheck } from '../hooks/useLeagueCheck';
import { LeagueResultStatus, LeagueTierType, type LeagueResult } from '../models';

jest.mock('~/shared/services/AppResetService', () => ({ resetAllAppData: jest.fn() }));

const resultA: LeagueResult = {
  previousTier: LeagueTierType.BRONZE, currentTier: LeagueTierType.SILVER,
  resultStatus: LeagueResultStatus.PROMOTED, finalRank: 1, totalParticipants: 12,
  totalDistance: 1000, rewardPoints: 100, participants: [],
};
const resultB: LeagueResult = { ...resultA, finalRank: 2, totalDistance: 2000 };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
const requests: { config: InternalAxiosRequestConfig; response: ReturnType<typeof deferred<LeagueResult | null>> }[] = [];
const originalAdapter = apiClient.defaults.adapter;
function login(userId: number) {
  useAuthStore.getState().logout();
  useAuthStore.setState({ isLoggedIn: true, tokensRevoked: false, accessToken: 'test-token' });
  useUserStore.setState({ currentUser: createUser({ id: userId, nickname: `User ${userId}` }) });
  useLeagueCheckStore.getState().reset();
}
beforeEach(() => {
  requests.length = 0;
  login(1);
  jest.spyOn(tokenRefreshInterceptor, 'validateAndRefreshIfNeeded').mockResolvedValue(undefined);
  apiClient.defaults.adapter = async config => {
    const response = deferred<LeagueResult | null>();
    requests.push({ config, response });
    return { config, data: await response.promise, status: 200, statusText: 'OK', headers: {} };
  };
});
afterEach(() => {
  if (originalAdapter) apiClient.defaults.adapter = originalAdapter;
  else delete apiClient.defaults.adapter;
  jest.restoreAllMocks();
});

it.each([2, 1])('preserves user %s new-session result after an old successful response', async userId => {
  const { result } = renderHook(useLeagueCheck);
  let oldCheck!: Promise<void>;
  act(() => { oldCheck = result.current.checkUncheckedLeagueResult(); });
  await waitFor(() => expect(requests).toHaveLength(1));
  act(() => login(userId));
  let newCheck!: Promise<void>;
  act(() => { newCheck = result.current.checkUncheckedLeagueResult(); });
  await waitFor(() => expect(requests).toHaveLength(2));
  await act(async () => { requests[1]!.response.resolve(resultB); await newCheck; });
  await act(async () => { requests[0]!.response.resolve(resultA); await oldCheck; });
  expect(useLeagueCheckStore.getState().pendingResult).toEqual(resultB);
  expect(useLeagueCheckStore.getState().checkStatus).toBe('checked');
});

it('does not clear a new-session result when the API rejects the old 401 as superseded', async () => {
  const { result } = renderHook(useLeagueCheck);
  let oldCheck!: Promise<void>;
  act(() => { oldCheck = result.current.checkUncheckedLeagueResult(); });
  await waitFor(() => expect(requests).toHaveLength(1));
  act(() => login(2));
  let newCheck!: Promise<void>;
  act(() => { newCheck = result.current.checkUncheckedLeagueResult(); });
  await waitFor(() => expect(requests).toHaveLength(2));
  await act(async () => { requests[1]!.response.resolve(resultB); await newCheck; });
  await act(async () => {
    const config = requests[0]!.config;
    requests[0]!.response.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined,
      { config, data: {}, status: 401, statusText: 'Unauthorized', headers: {} }));
    await oldCheck;
  });
  expect(useLeagueCheckStore.getState().pendingResult).toEqual(resultB);
});

it('keeps a replacement check in progress after reset until its own response completes', async () => {
  const { result } = renderHook(useLeagueCheck);
  let oldCheck!: Promise<void>;
  act(() => { oldCheck = result.current.checkUncheckedLeagueResult(); });
  await waitFor(() => expect(requests).toHaveLength(1));
  act(() => useLeagueCheckStore.getState().reset());
  let newCheck!: Promise<void>;
  act(() => { newCheck = result.current.checkUncheckedLeagueResult(); });
  await waitFor(() => expect(requests).toHaveLength(2));
  await act(async () => { requests[0]!.response.resolve(resultA); await oldCheck; });
  expect(useLeagueCheckStore.getState().checkStatus).toBe('checking');
  expect(useLeagueCheckStore.getState().pendingResult).toBeNull();
  await act(async () => { requests[1]!.response.resolve(resultB); await newCheck; });
  expect(useLeagueCheckStore.getState().pendingResult).toEqual(resultB);
});

it('starts a new-generation check without waiting for the previous session in-flight check', async () => {
  const { result } = renderHook(useLeagueCheck);
  let oldCheck!: Promise<void>;
  act(() => { oldCheck = result.current.checkUncheckedLeagueResult(); });
  await waitFor(() => expect(requests).toHaveLength(1));
  // useAuth.login replaces the generation without resetting the league store.
  act(() => { useAuthStore.getState().invalidateSession(); });
  let newCheck!: Promise<void>;
  act(() => { newCheck = result.current.checkUncheckedLeagueResult(); });
  await waitFor(() => expect(requests).toHaveLength(2));
  await act(async () => { requests[0]!.response.resolve(resultA); await oldCheck; });
  expect(useLeagueCheckStore.getState().checkStatus).toBe('checking');
  await act(async () => { requests[1]!.response.resolve(resultB); await newCheck; });
  expect(useLeagueCheckStore.getState().pendingResult).toEqual(resultB);
});

it('replaces a completed previous-session result when the generation changes without reset', async () => {
  const { result } = renderHook(useLeagueCheck);
  let check!: Promise<void>;
  act(() => { check = result.current.checkUncheckedLeagueResult(); });
  await waitFor(() => expect(requests).toHaveLength(1));
  await act(async () => { requests[0]!.response.resolve(resultA); await check; });
  act(() => { useAuthStore.getState().invalidateSession(); });
  act(() => { check = result.current.checkUncheckedLeagueResult(); });
  await waitFor(() => expect(requests).toHaveLength(2));
  expect(useLeagueCheckStore.getState().pendingResult).toBeNull();
  await act(async () => { requests[1]!.response.resolve(resultB); await check; });
  expect(useLeagueCheckStore.getState().pendingResult).toEqual(resultB);
});

it('does not dispatch an old check under the new session while request middleware is pending', async () => {
  apiClient.defaults.adapter = async config => {
    requests.push({ config, response: deferred<LeagueResult | null>() });
    return { config, data: resultA, status: 200, statusText: 'OK', headers: {} };
  };
  const dispatch = deferred<void>();
  const started = deferred<void>();
  const interceptor = apiClient.interceptors.request.use(async config => {
    started.resolve();
    await dispatch.promise;
    return config;
  });
  try {
    const { result } = renderHook(useLeagueCheck);
    let check!: Promise<void>;
    act(() => { check = result.current.checkUncheckedLeagueResult(); });
    await act(async () => { await started.promise; });
    act(() => login(2));
    await act(async () => { dispatch.resolve(); await check; });
    expect(requests).toHaveLength(0);
    expect(useLeagueCheckStore.getState().checkStatus).toBe('idle');
  } finally {
    apiClient.interceptors.request.eject(interceptor);
  }
});

it('finishes an active-session network failure without leaving future checks blocked', async () => {
  const { result } = renderHook(useLeagueCheck);
  let check!: Promise<void>;
  act(() => { check = result.current.checkUncheckedLeagueResult(); });
  await waitFor(() => expect(requests).toHaveLength(1));
  await act(async () => { requests[0]!.response.reject(new Error('offline')); await check; });
  expect(useLeagueCheckStore.getState().checkStatus).toBe('checked');
  expect(useLeagueCheckStore.getState().pendingResult).toBeNull();
  act(() => useLeagueCheckStore.getState().allowRecheck());
  act(() => { check = result.current.checkUncheckedLeagueResult(); });
  await waitFor(() => expect(requests).toHaveLength(2));
  await act(async () => { requests[1]!.response.resolve(resultB); await check; });
  expect(useLeagueCheckStore.getState().pendingResult).toEqual(resultB);
});
