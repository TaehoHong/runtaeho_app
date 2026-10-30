import React, { type PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { MutationCache, QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import type { InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '~/services/api/client';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { createUser } from '~/features/user/models/User';
import { SessionSupersededError } from '~/utils/storage/errors';
import { API_ENDPOINTS } from '~/services/api/config';
import type { CursorResult } from '~/shared/utils/dto/CursorResult';
import { useAvatarViewModel } from '../viewmodels/useAvatarViewModel';
import { avatarQueryKeys, usePurchaseItems } from '../services/avatarQueries';
import type { Item } from '../models';
import { HAIR_COLORS } from '../models/avatarConstants';

jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: { syncAvatar: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('~/shared/services/TokenRefreshInterceptor', () => ({
  tokenRefreshInterceptor: {
    validateAndRefreshIfNeeded: jest.fn().mockResolvedValue(undefined),
    handleResponseError: (error: unknown) => Promise.reject(error),
  },
}));

const hair: Item = {
  id: 1, itemType: { id: 1, name: '머리' }, name: 'Owned hair', unityFilePath: 'Hair/1',
  filePath: '', point: 0, createdAt: '', isOwned: true,
};
const paidHair: Item = { ...hair, id: 2, name: 'Paid hair', point: 1000, isOwned: false };
const nextHair: Item = { ...hair, id: 3, name: 'Next session hair' };
const catalog = (): InfiniteData<CursorResult<Item>> => ({
  pages: [{ content: [hair, paidHair], hasNext: false, cursor: 2 }], pageParams: [null],
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => { resolve = complete; });
  return { promise, resolve };
}
const requests: InternalAxiosRequestConfig[] = [];
let gate: { method: string; url: string; response: ReturnType<typeof deferred<unknown>> } | undefined;
const originalAdapter = apiClient.defaults.adapter;

function login(userId: number, changed = false) {
  if (changed) useAuthStore.getState().logout();
  useAuthStore.setState({ isLoggedIn: true, accessToken: `test-token-${userId}`, tokensRevoked: false });
  useUserStore.setState({
    currentUser: createUser({ id: userId, nickname: `User ${userId}` }), avatarId: userId,
    equippedItems: { 1: changed ? nextHair : hair },
    hairColor: changed ? '#445566' : '#000000', totalPoint: changed ? 9000 : 2500,
  });
}
function setup<T>(hook: () => T, mutationCache?: MutationCache) {
  const client = new QueryClient({
    ...(mutationCache ? { mutationCache } : {}),
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { ...renderHook(hook, { wrapper }), client };
}
function switchSession(client: QueryClient, userId: number) {
  login(userId, true);
  client.clear();
  client.setQueryData(avatarQueryKeys.itemsByType(1), catalog());
}

beforeEach(() => {
  requests.length = 0;
  gate = undefined;
  login(1);
  apiClient.defaults.adapter = async config => {
    requests.push(config);
    let data: unknown = config.url === API_ENDPOINTS.POINT.BASE
      ? { userId: 1, point: 1500 }
      : config.method === 'get' ? catalog().pages[0]
        : { id: 1, userId: 1, isMain: true, hairColor: '#112233', items: [paidHair] };
    if (gate && config.method === gate.method && config.url === gate.url) data = await gate.response.promise;
    return { config, data, status: 200, statusText: 'OK', headers: {} };
  };
});
afterEach(() => {
  if (originalAdapter) apiClient.defaults.adapter = originalAdapter;
  else delete apiClient.defaults.adapter;
});

it.each([2, 1])('does not apply a deferred equip response to user %s in a new session', async nextUserId => {
  gate = { method: 'put', url: API_ENDPOINTS.AVATAR.UPDATE_EQUIPPED_ITEMS(1), response: deferred() };
  const { result, client } = setup(useAvatarViewModel);
  await waitFor(() => expect(result.current.currentCategoryItems).toHaveLength(1));
  act(() => result.current.selectHairColor(HAIR_COLORS[1]));
  let save!: Promise<void>;
  act(() => { save = result.current.confirmChanges(); });
  await waitFor(() => expect(requests.some(request => request.method === 'put')).toBe(true));
  act(() => switchSession(client, nextUserId));
  await act(async () => { gate!.response.resolve({}); await save; });
  expect(useUserStore.getState().equippedItems).toEqual({ 1: nextHair });
  expect(useUserStore.getState().hairColor).toBe('#445566');
  expect(client.getQueryState(avatarQueryKeys.itemsByType(1))?.isInvalidated).toBe(false);
  expect(result.current.actionError).toBeNull();
});

it.each([2, 1])('does not mark the new session user %s cache owned or send point followups', async nextUserId => {
  gate = { method: 'post', url: API_ENDPOINTS.USER_ITEMS.PURCHASE_ITEMS, response: deferred() };
  const { result, client } = setup(usePurchaseItems);
  let save!: Promise<void>;
  act(() => { save = result.current.mutateAsync({ itemIds: [2] }); });
  await waitFor(() => expect(requests.some(request => request.method === 'post')).toBe(true));
  act(() => switchSession(client, nextUserId));
  await act(async () => { gate!.response.resolve(undefined); await save; });
  expect(client.getQueryData(avatarQueryKeys.itemsByType(1))).toEqual(catalog());
  expect(useUserStore.getState().totalPoint).toBe(9000);
  expect(requests.filter(request => request.url === API_ENDPOINTS.POINT.BASE || request.method === 'put')).toEqual([]);
});

it('does not copy a deferred point balance or send equip after the purchase session ends', async () => {
  gate = { method: 'get', url: API_ENDPOINTS.POINT.BASE, response: deferred() };
  const { result, client } = setup(useAvatarViewModel);
  await waitFor(() => expect(result.current.currentCategoryItems).toHaveLength(1));
  act(() => result.current.selectItem(paidHair));
  let save!: Promise<void>;
  act(() => { save = result.current.confirmPurchase(); });
  await waitFor(() => expect(requests.some(request => request.url === API_ENDPOINTS.POINT.BASE)).toBe(true));
  act(() => switchSession(client, 2));
  await act(async () => { gate!.response.resolve({ userId: 1, point: 1500 }); await save; });
  expect(useUserStore.getState().totalPoint).toBe(9000);
  expect(requests.filter(request => request.method === 'put')).toEqual([]);
  expect(client.getQueryData(avatarQueryKeys.itemsByType(1))).toEqual(catalog());
});

it('captures the mutation session before asynchronous QueryClient onMutate work', async () => {
  const dispatch = deferred<void>();
  const { result } = setup(usePurchaseItems, new MutationCache({ onMutate: () => dispatch.promise }));
  let purchase!: Promise<unknown>;
  act(() => { purchase = result.current.mutateAsync({ itemIds: [2] }).catch(error => error); });
  act(() => login(2, true));
  await act(async () => { dispatch.resolve(); });
  expect(await purchase).toBeInstanceOf(SessionSupersededError);
  expect(requests).toEqual([]);
});

it('binds a point followup to the purchase session before asynchronous authentication starts', async () => {
  const dispatch = deferred<void>();
  const started = deferred<void>();
  const interceptor = apiClient.interceptors.request.use(async config => {
    if (config.url === API_ENDPOINTS.POINT.BASE) {
      started.resolve();
      await dispatch.promise;
    }
    return config;
  });
  const { result, client } = setup(usePurchaseItems);
  let purchase!: Promise<unknown>;
  try {
    act(() => { purchase = result.current.mutateAsync({ itemIds: [2] }).catch(error => error); });
    await act(async () => { await started.promise; });
    act(() => switchSession(client, 2));
    await act(async () => { dispatch.resolve(); await purchase; });
    expect(requests.map(request => request.method)).toEqual(['post']);
    expect(useUserStore.getState().totalPoint).toBe(9000);
  } finally {
    apiClient.interceptors.request.eject(interceptor);
  }
});
