import React, { type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import type { InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '~/services/api/client';
import { API_ENDPOINTS } from '~/services/api/config';
import { queryClient, queryKeys } from '~/services/queryClient';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { offlineStorageService } from '~/features/running/services/OfflineStorageService';
import { runningService } from '~/features/running/services/runningService';
import { createRunningRecord } from '~/features/running/models/RunningRecord';
import { usePurchaseItems } from '~/features/avatar/services/avatarQueries';
import { createUser } from '~/features/user/models/User';
import type { HealthRunningWorkout } from '~/features/healthImport/types';
import { healthImportService } from '~/features/healthImport/services/healthImportService';
import { healthImportBridge } from '~/features/healthImport/native/HealthImportBridge';
import { syncWatchRecords, watchSyncBridge } from '~/features/watchSync/watchSyncService';
import type { CompletedRunningRequest } from '~/features/watchSync/types';
import { usePointViewModel } from '../viewmodels/PointViewModel';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { useEndRunning } from '~/features/running/services/runningQueries';
import { useOfflineSync } from '~/features/running/hooks/useOfflineSync';
import type { EndRunningRecord } from '~/features/running/models';
import type { UserDataDto } from '~/features/user/models/UserDataDto';

// Execute the original lazy-import hook in Jest's CommonJS runtime.
jest.mock('~/features/running/hooks/useOfflineSync', () => {
  const fs = jest.requireActual<typeof import('fs')>('fs');
  const ts = jest.requireActual<typeof import('typescript')>('typescript');
  const source = fs.readFileSync(require.resolve('~/features/running/hooks/useOfflineSync'), 'utf8');
  const compiled = ts.transpileModule(source.replaceAll('../services/', '~/features/running/services/'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const hookModule = { exports: {} };
  new Function('require', 'exports', 'module', compiled.outputText)(require, hookModule.exports, hookModule);
  return hookModule.exports;
});

jest.mock('~/shared/services/AppResetService', () => ({
  resetAllAppData: jest.fn(), waitForLogout: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => {
  const native = jest.requireActual('react-native');
  native.NativeModules.RNWatchSyncBridge = { getPendingRecords: jest.fn(), acknowledgeRecord: jest.fn() };
  return native;
});
jest.mock('~/features/healthImport/native/HealthImportBridge', () => ({
  healthImportBridge: { isAvailable: jest.fn(), getPermissionStatus: jest.fn(), readRunningWorkoutChanges: jest.fn() },
}));
jest.mock('~/shared/services/TokenRefreshInterceptor', () => ({
  tokenRefreshInterceptor: {
    validateAndRefreshIfNeeded: jest.fn().mockResolvedValue(undefined),
    handleResponseError: (error: unknown) => Promise.reject(error),
  },
}));

const native = jest.mocked(healthImportBridge);
const watch = jest.mocked(watchSyncBridge!);
const record: CompletedRunningRequest = {
  schemaVersion: 1, sessionId: 'watch-first', ownerUserId: 7, source: 'APPLE_WATCH',
  startTimestamp: 10, endTimestamp: 20, distance: 12, durationSec: 10,
  cadence: 0, heartRate: 0, calorie: 0, gpsPoints: [],
};
const workout = (id: number): HealthRunningWorkout => ({
  sourceRecordId: `health-${id}`, startTimestamp: 100, endTimestamp: 200,
  durationSec: 100, distance: 800, routeStatus: 'notAvailable',
});
const configuration = {
  userId: 7, healthImportEnabled: true, healthImportLastSyncedTimestamp: 1000,
  healthImportRewardCutoffTimestamp: 1000,
};
const requests: InternalAxiosRequestConfig[] = [];
const originalAdapter = apiClient.defaults.adapter;
let balance: () => Promise<{ userId: number; point: number }>;
let endResponse: () => Promise<EndRunningRecord>;
let profile: () => Promise<UserDataDto>;
const endedRecord: EndRunningRecord = {
  id: 55, distance: 1000, cadence: 160, heartRate: 150, calorie: 60,
  durationSec: 300, point: 1300, acceptanceStatus: 'ACCEPTED',
};
const profileData: UserDataDto = {
  id: 7, name: 'Updated runner', authorityType: 'ROLE_USER', totalPoint: 1200,
  userAccounts: [], avatarId: 2, haveRunningRecord: true, equippedItems: [], hairColor: '#123456',
};
let importBatches = 0;
let failSecondBatch = false;

function login(userId = 7, changed = false) {
  if (changed) useAuthStore.getState().logout();
  useAuthStore.setState({ isLoggedIn: true, tokensRevoked: false, accessToken: `test-token-${userId}` });
  useUserStore.setState({ currentUser: createUser({ id: userId, nickname: `User ${userId}` }), totalPoint: changed ? 9000 : 1200 });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((complete, fail) => { resolve = complete; reject = fail; });
  return { promise, resolve, reject };
}
function setup<T>(hook: () => T) {
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return renderHook(hook, { wrapper });
}
const balanceRequests = () => requests.filter(request => request.url === API_ENDPOINTS.POINT.BASE);

beforeEach(async () => {
  Platform.OS = 'ios';
  await AsyncStorage.clear();
  queryClient.clear();
  requests.length = 0;
  importBatches = 0;
  failSecondBatch = false;
  login();
  balance = async () => ({ userId: 7, point: 1543 });
  endResponse = async () => endedRecord;
  profile = async () => profileData;
  native.isAvailable.mockResolvedValue(true);
  native.getPermissionStatus.mockResolvedValue('granted');
  native.readRunningWorkoutChanges!.mockResolvedValue({
    workouts: [workout(1)], deletedRecordIds: [], nextCursor: 'committed', hasMore: false, resetRequired: false,
  });
  watch.getPendingRecords.mockResolvedValue([record]);
  watch.acknowledgeRecord.mockResolvedValue(undefined);
  apiClient.defaults.adapter = async config => {
    requests.push(config);
    let data: unknown;
    if (config.url === API_ENDPOINTS.POINT.BASE) data = await balance();
    else if (config.url === API_ENDPOINTS.USER.ME) data = await profile();
    else if (config.url === API_ENDPOINTS.USER.CONFIGURATION) data = configuration;
    else if (config.url === API_ENDPOINTS.RUNNING.IMPORT_BATCH) {
      importBatches += 1;
      if (failSecondBatch && importBatches === 2) throw new Error('import unavailable');
      const body = JSON.parse(config.data);
      data = { processed: true, createdCount: body.records.length, updatedCount: 0, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 3, leagueDistanceChanged: false };
    } else if (config.url === '/running/completed-records') {
      data = { sessionId: JSON.parse(config.data).sessionId, runningRecordId: 99, status: 'CREATED' };
    } else if (config.url === API_ENDPOINTS.RUNNING.END(55)) {
      data = await endResponse();
    } else data = { content: [], hasNext: false };
    return { config, data, status: 200, statusText: 'OK', headers: {} };
  };
});
afterEach(() => {
  if (originalAdapter) apiClient.defaults.adapter = originalAdapter;
  else delete apiClient.defaults.adapter;
  queryClient.clear();
});

it('refreshes the displayed authoritative balance once after a multi-batch health sync commits', async () => {
  native.readRunningWorkoutChanges!.mockResolvedValue({
    workouts: Array.from({ length: 51 }, (_, index) => workout(index)), deletedRecordIds: [],
    nextCursor: 'committed', hasMore: false, resetRequired: false,
  });
  const { result } = setup(usePointViewModel);
  await act(async () => { expect(await healthImportService.sync()).toMatchObject({ importedCount: 51, awardedPoint: 6 }); });
  await waitFor(() => expect(result.current.currentPoints).toBe(1543));
  expect(useUserStore.getState().totalPoint).toBe(1543);
  expect(balanceRequests()).toHaveLength(1);
  expect(await AsyncStorage.getItem('@healthSyncCursor:v1:ios:7')).toBe('committed');
});

it('refreshes the displayed balance once after acknowledging multiple watch records', async () => {
  watch.getPendingRecords.mockResolvedValue([record, { ...record, sessionId: 'watch-second' }]);
  const { result } = setup(usePointViewModel);
  await act(async () => { expect(await syncWatchRecords()).toBe('success'); });
  await waitFor(() => expect(result.current.currentPoints).toBe(1543));
  expect(useUserStore.getState().totalPoint).toBe(1543);
  expect(watch.acknowledgeRecord).toHaveBeenCalledTimes(2);
  expect(balanceRequests()).toHaveLength(1);
});

it('keeps a successful health cursor when balance fails and recovers on modal refresh', async () => {
  balance = async () => { throw new Error('balance unavailable'); };
  const { result } = setup(usePointViewModel);
  await act(async () => { expect(await healthImportService.sync()).toMatchObject({ importedCount: 1 }); });
  expect(useUserStore.getState().totalPoint).toBe(1200);
  expect(balanceRequests()).toHaveLength(1);
  expect(await AsyncStorage.getItem('@healthSyncCursor:v1:ios:7')).toBe('committed');
  const uploaded = requests.filter(request => request.method === 'post').length;
  balance = async () => ({ userId: 7, point: 1601 });
  await act(async () => { await result.current.refreshPointHistory(); });
  await waitFor(() => expect(result.current.currentPoints).toBe(1601));
  expect(useUserStore.getState().totalPoint).toBe(1601);
  expect(balanceRequests()).toHaveLength(2);
  expect(requests.filter(request => request.method === 'post')).toHaveLength(uploaded);
});

it('keeps a successful watch acknowledgment when balance fails and recovers on modal refresh', async () => {
  balance = async () => { throw new Error('balance unavailable'); };
  const { result } = setup(usePointViewModel);
  await act(async () => { expect(await syncWatchRecords()).toBe('success'); });
  expect(useUserStore.getState().totalPoint).toBe(1200);
  expect(balanceRequests()).toHaveLength(1);
  expect(watch.acknowledgeRecord).toHaveBeenCalledWith('watch-first', 'APPLE_WATCH', '7', '99');
  const uploaded = requests.filter(request => request.method === 'post').length;
  balance = async () => ({ userId: 7, point: 1601 });
  await act(async () => { await result.current.refreshPointHistory(); });
  await waitFor(() => expect(result.current.currentPoints).toBe(1601));
  expect(useUserStore.getState().totalPoint).toBe(1601);
  expect(balanceRequests()).toHaveLength(2);
  expect(requests.filter(request => request.method === 'post')).toHaveLength(uploaded);
});

it.each([8, 7])('does not overwrite user %s new session balance with a deferred old watch balance', async nextUserId => {
  const pending = deferred<{ userId: number; point: number }>();
  balance = () => pending.promise;
  const sync = syncWatchRecords();
  await waitFor(() => expect(balanceRequests()).toHaveLength(1));
  act(() => login(nextUserId, true));
  pending.resolve({ userId: 7, point: 1543 });
  await sync;
  expect(useUserStore.getState().totalPoint).toBe(9000);
  expect(watch.acknowledgeRecord).toHaveBeenCalledTimes(1);
});

it('does not display a balance for a mismatched response user', async () => {
  balance = async () => ({ userId: 8, point: 8888 });
  await healthImportService.sync();
  expect(balanceRequests()).toHaveLength(1);
  expect(useUserStore.getState().totalPoint).toBe(1200);
  expect(await AsyncStorage.getItem('@healthSyncCursor:v1:ios:7')).toBe('committed');
});

it('refreshes the first accepted health reward even when a later batch fails', async () => {
  failSecondBatch = true;
  native.readRunningWorkoutChanges!.mockResolvedValue({
    workouts: Array.from({ length: 51 }, (_, index) => workout(index)), deletedRecordIds: [],
    nextCursor: 'uncommitted', hasMore: false, resetRequired: false,
  });
  await expect(healthImportService.sync()).rejects.toThrow('import unavailable');
  expect(useUserStore.getState().totalPoint).toBe(1543);
  expect(balanceRequests()).toHaveLength(1);
  expect(await AsyncStorage.getItem('@healthSyncCursor:v1:ios:7')).toBeNull();
});


it('keeps the newer watch balance when an older modal balance arrives last', async () => {
  const pending = deferred<{ userId: number; point: number }>();
  balance = jest.fn().mockImplementationOnce(() => pending.promise).mockResolvedValue({ userId: 7, point: 1300 });
  const { result } = setup(usePointViewModel);
  let refresh!: Promise<void>;
  act(() => { refresh = result.current.refreshPointHistory(); });
  await waitFor(() => expect(balanceRequests()).toHaveLength(1));
  await act(async () => { await syncWatchRecords(); });
  expect(result.current.currentPoints).toBe(1300);
  await act(async () => { pending.resolve({ userId: 7, point: 1200 }); await refresh; });
  expect(result.current.currentPoints).toBe(1300);
  expect(useUserStore.getState().totalPoint).toBe(1300);
  expect(balanceRequests()).toHaveLength(2);
});

it('keeps the newer purchase balance when an older modal balance arrives last', async () => {
  const pending = deferred<{ userId: number; point: number }>();
  balance = jest.fn().mockImplementationOnce(() => pending.promise).mockResolvedValue({ userId: 7, point: 500 });
  const { result } = setup(() => ({ point: usePointViewModel(), purchase: usePurchaseItems() }));
  let refresh!: Promise<void>;
  act(() => { refresh = result.current.point.refreshPointHistory(); });
  await waitFor(() => expect(balanceRequests()).toHaveLength(1));
  await act(async () => { await result.current.purchase.mutateAsync({ itemIds: [2] }); });
  expect(result.current.point.currentPoints).toBe(500);
  await act(async () => { pending.resolve({ userId: 7, point: 1200 }); await refresh; });
  expect(result.current.point.currentPoints).toBe(500);
  expect(useUserStore.getState().totalPoint).toBe(500);
  expect(balanceRequests()).toHaveLength(2);
});

it('uploads a persisted phone record while the acknowledged watch balance is still pending', async () => {
  await offlineStorageService.addPendingUpload(55, createRunningRecord(55));
  const pending = deferred<{ userId: number; point: number }>();
  balance = () => pending.promise;
  const watchSync = syncWatchRecords();
  await waitFor(() => expect(balanceRequests()).toHaveLength(1));
  const phoneReplay = offlineStorageService.serializeReplay(() => offlineStorageService.retryAllPendingUploads(runningService.endRunning));
  try {
    await waitFor(() => expect(requests.filter(request => request.url === API_ENDPOINTS.RUNNING.END(55))).toHaveLength(1));
    expect(await phoneReplay).toEqual({ success: 1, failed: 0 });
    expect(await offlineStorageService.getPendingUploads()).toEqual([]);
  } finally {
    pending.resolve({ userId: 7, point: 1543 });
    await watchSync;
    await phoneReplay;
  }
  expect(watch.acknowledgeRecord).toHaveBeenCalledTimes(1);
});


it('refreshes profile metadata without restoring a balance read before a newer point GET', async () => {
  const pending = deferred<UserDataDto>();
  profile = () => pending.promise;
  balance = async () => ({ userId: 7, point: 1300 });
  const { result } = setup(() => ({ auth: useAuth(), point: usePointViewModel() }));
  let refresh!: Promise<void>;
  act(() => { refresh = result.current.auth.refreshUserData(); });
  await waitFor(() => expect(requests.filter(request => request.url === API_ENDPOINTS.USER.ME)).toHaveLength(1));
  await act(async () => { await result.current.point.refreshPointHistory(); });
  await act(async () => { pending.resolve(profileData); await refresh; });
  expect(result.current.point.currentPoints).toBe(1300);
  expect(useUserStore.getState()).toMatchObject({
    totalPoint: 1300, avatarId: 2, haveRunningRecord: true, hairColor: '#123456',
    currentUser: { nickname: 'Updated runner' },
  });
});

it('keeps the phone END balance when an earlier watch balance arrives after replay unlock', async () => {
  const pending = deferred<{ userId: number; point: number }>();
  balance = () => pending.promise;
  const { result } = setup(useEndRunning);
  const watchSync = syncWatchRecords();
  await waitFor(() => expect(balanceRequests()).toHaveLength(1));
  await act(async () => { await result.current.mutateAsync(createRunningRecord(55)); });
  expect(useUserStore.getState().totalPoint).toBe(1300);
  await act(async () => { pending.resolve({ userId: 7, point: 1200 }); await watchSync; });
  expect(useUserStore.getState().totalPoint).toBe(1300);
  expect(watch.acknowledgeRecord).toHaveBeenCalledTimes(1);
});

it('projects a raw offline END and invalidates its caches once after removing the upload', async () => {
  await offlineStorageService.addPendingUpload(55, createRunningRecord(55));
  queryClient.setQueryData(queryKeys.point.balance(), { point: 1200 });
  queryClient.setQueryData(queryKeys.user.current, profileData);
  queryClient.setQueryData(queryKeys.running.detail(55), createRunningRecord(55));
  queryClient.setQueryData(queryKeys.statistics.all, []);
  queryClient.setQueryData(queryKeys.league.current, []);
  const { result } = setup(useOfflineSync);
  await act(async () => {
    expect((await result.current.syncOfflineData())?.records).toEqual({ success: 1, failed: 0 });
  });
  expect(useUserStore.getState().totalPoint).toBe(1300);
  expect(await offlineStorageService.getPendingUploads()).toEqual([]);
  expect(queryClient.getQueryState(queryKeys.point.balance())?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(queryKeys.user.current)?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(queryKeys.running.detail(55))?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(queryKeys.statistics.all)?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(queryKeys.league.current)?.isInvalidated).toBe(true);
  await act(async () => { expect(await result.current.syncOfflineData()).toBeNull(); });
  expect(requests.filter(request => request.url === API_ENDPOINTS.RUNNING.END(55))).toHaveLength(1);
});

it('reconciles an END started before a point GET without holding the phone replay lock', async () => {
  const ending = deferred<EndRunningRecord>();
  const authoritative = deferred<{ userId: number; point: number }>();
  endResponse = () => ending.promise;
  balance = jest.fn().mockResolvedValueOnce({ userId: 7, point: 1200 }).mockImplementation(() => authoritative.promise);
  const { result } = setup(() => ({ end: useEndRunning(), point: usePointViewModel() }));
  let upload!: Promise<EndRunningRecord>;
  act(() => { upload = offlineStorageService.serializeReplay(() => result.current.end.mutateAsync(createRunningRecord(55))); });
  await waitFor(() => expect(requests.filter(request => request.url === API_ENDPOINTS.RUNNING.END(55))).toHaveLength(1));
  await act(async () => { await result.current.point.refreshPointHistory(); });
  await act(async () => { ending.resolve(endedRecord); await upload; });
  const nextReplay = jest.fn().mockResolvedValue('released');
  const replay = offlineStorageService.serializeReplay(nextReplay);
  await waitFor(() => expect(nextReplay).toHaveBeenCalledTimes(1));
  expect(await replay).toBe('released');
  await waitFor(() => expect(balanceRequests()).toHaveLength(2));
  await act(async () => { authoritative.resolve({ userId: 7, point: 1300 }); });
  await waitFor(() => expect(useUserStore.getState().totalPoint).toBe(1300));
});

it('keeps an offline ACK and a newer balance when its delayed END snapshot and reconciliation fail', async () => {
  await offlineStorageService.addPendingUpload(55, createRunningRecord(55));
  const ending = deferred<EndRunningRecord>();
  const authoritative = deferred<{ userId: number; point: number }>();
  endResponse = () => ending.promise;
  balance = jest.fn().mockResolvedValueOnce({ userId: 7, point: 1400 }).mockImplementation(() => authoritative.promise);
  const { result } = setup(() => ({ offline: useOfflineSync(), point: usePointViewModel() }));
  let sync!: ReturnType<typeof result.current.offline.syncOfflineData>;
  act(() => { sync = result.current.offline.syncOfflineData(); });
  await waitFor(() => expect(requests.filter(request => request.url === API_ENDPOINTS.RUNNING.END(55))).toHaveLength(1));
  await act(async () => { await result.current.point.refreshPointHistory(); });
  act(() => { ending.resolve(endedRecord); });
  await waitFor(() => expect(balanceRequests()).toHaveLength(2));
  expect(useUserStore.getState().totalPoint).toBe(1400);
  expect(await offlineStorageService.getPendingUploads()).toEqual([]);
  const nextReplay = jest.fn().mockResolvedValue('released');
  const replay = offlineStorageService.serializeReplay(nextReplay);
  await waitFor(() => expect(nextReplay).toHaveBeenCalledTimes(1));
  expect(await replay).toBe('released');
  await act(async () => { authoritative.reject(new Error('balance unavailable')); expect((await sync)?.records).toEqual({ success: 1, failed: 0 }); });
  expect(useUserStore.getState().totalPoint).toBe(1400);
  await act(async () => { expect(await result.current.offline.syncOfflineData()).toBeNull(); });
  expect(requests.filter(request => request.url === API_ENDPOINTS.RUNNING.END(55))).toHaveLength(1);
});


it('keeps a read committed during END even when that read request started before END', async () => {
  const earlierRead = deferred<{ userId: number; point: number }>();
  const ending = deferred<EndRunningRecord>();
  const authoritative = deferred<{ userId: number; point: number }>();
  balance = jest.fn().mockImplementationOnce(() => earlierRead.promise).mockImplementation(() => authoritative.promise);
  endResponse = () => ending.promise;
  const watchSync = syncWatchRecords();
  await waitFor(() => expect(balanceRequests()).toHaveLength(1));
  const { result } = setup(useEndRunning);
  let upload!: Promise<EndRunningRecord>;
  act(() => { upload = result.current.mutateAsync(createRunningRecord(55)); });
  await waitFor(() => expect(requests.filter(request => request.url === API_ENDPOINTS.RUNNING.END(55))).toHaveLength(1));
  await act(async () => { earlierRead.resolve({ userId: 7, point: 1400 }); await watchSync; });
  expect(useUserStore.getState().totalPoint).toBe(1400);
  await act(async () => { ending.resolve(endedRecord); await upload; });
  expect(useUserStore.getState().totalPoint).toBe(1400);
  await waitFor(() => expect(balanceRequests()).toHaveLength(2));
  await act(async () => { authoritative.resolve({ userId: 7, point: 1400 }); });
  expect(useUserStore.getState().totalPoint).toBe(1400);
});
