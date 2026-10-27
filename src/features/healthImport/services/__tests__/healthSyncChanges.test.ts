import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';
import { apiClient } from '~/services/api/client';
import { queryClient } from '~/services/queryClient';
import { healthImportBridge } from '../../native/HealthImportBridge';
import { healthImportService, HealthImportPartialSyncError } from '../healthImportService';
import { showHealthImportRejections } from '../showHealthImportRejections';
import type { HealthImportBatchRequest, HealthRunningWorkout, HealthRunningWorkoutChanges } from '../../types';

jest.mock('~/features/auth/stores/authStore', () => ({
  getSessionSnapshot: jest.fn(), isSessionCurrent: jest.fn(),
}));
jest.mock('~/services/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn().mockResolvedValue(undefined) },
  queryKeys: {
    running: { all: ['running'] }, statistics: { all: ['statistics'] },
    healthImport: { configuration: ['healthImport'] }, league: { current: ['league'] },
    point: { all: ['point'] }, user: { all: ['user'] },
  },
}));
jest.mock('react-native', () => ({ Platform: { OS: 'android' }, Alert: { alert: jest.fn() } }));
jest.mock('../../native/HealthImportBridge', () => ({
  healthImportBridge: {
    isAvailable: jest.fn(), getPermissionStatus: jest.fn(),
    readRunningWorkouts: jest.fn(), readRunningWorkoutChanges: jest.fn(),
  },
}));
jest.mock('~/services/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));

const native = jest.mocked(healthImportBridge);
const api = jest.mocked(apiClient);
const readChanges = jest.mocked(healthImportBridge.readRunningWorkoutChanges!);
const cursorKey = '@healthSyncCursor:v1:android:16';
const disk = new Map<string, string>();
const configuration = {
  userId: 16, healthImportEnabled: true, healthImportLastSyncedTimestamp: 1000,
  healthImportFirstEnabledTimestamp: 900, healthImportRewardCutoffTimestamp: 1000,
};
const response = {
  processed: true, createdCount: 1, updatedCount: 0, duplicateCount: 0,
  personalOnlyCount: 0, awardedPoint: 3, leagueDistanceChanged: false,
};
const workout = (id: string): HealthRunningWorkout => ({
  sourceRecordId: id, sourceBundleId: 'example.writer', recordingMethod: 'RECORDED',
  startTimestamp: 100, endTimestamp: 200, durationSec: 100, distance: 800,
  routeStatus: 'notAvailable',
});
const page = (overrides: Partial<HealthRunningWorkoutChanges> = {}): HealthRunningWorkoutChanges => ({
  workouts: [], deletedRecordIds: [], nextCursor: 'next', hasMore: false, resetRequired: false, ...overrides,
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => { resolve = finish; });
  return { promise, resolve };
};
const validationFailure = (code = 'RUNNING_INVALID_GPS') => ({
  isAxiosError: true, response: { status: 400, data: { extra: { code } } },
});

describe('Health change cursor synchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    disk.clear();
    disk.set(cursorKey, 'previous');
    Platform.OS = 'android';
    jest.mocked(getSessionSnapshot).mockReturnValue({ generation: 1, userId: 16 });
    jest.mocked(isSessionCurrent).mockReturnValue(true);
    jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => disk.get(key) ?? null);
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { disk.set(key, value); });
    api.get.mockResolvedValue({ data: configuration });
    api.post.mockResolvedValue({ data: response });
    native.isAvailable.mockResolvedValue(true);
    native.getPermissionStatus.mockResolvedValue('granted');
    native.readRunningWorkouts.mockResolvedValue([]);
    native.readRunningWorkoutChanges = readChanges;
    readChanges.mockReset().mockResolvedValue(page());
  });

  it('uploads a late arrival older than the last timestamp using the opaque cursor', async () => {
    readChanges.mockResolvedValue(page({ workouts: [workout('late-history')] }));

    await healthImportService.sync();

    expect(readChanges).toHaveBeenCalledWith({ cursor: 'previous', limit: 50 });
    expect(native.readRunningWorkouts).not.toHaveBeenCalled();
    expect(api.post.mock.calls[0]![1]).toEqual({ records: [expect.objectContaining({ externalId: 'late-history', endTimestamp: 200 })] });
    expect(disk.get(cursorKey)).toBe('next');
  });

  it('starts a first-install snapshot without copying server timestamps into the native cursor', async () => {
    disk.delete(cursorKey);
    readChanges.mockResolvedValue(page({ workouts: [workout('initial-history')], nextCursor: 'initial-anchor' }));

    await healthImportService.sync();

    expect(readChanges).toHaveBeenCalledWith({ cursor: null, limit: 50 });
    expect(disk.get(cursorKey)).toBe('initial-anchor');
  });

  it.each(['  달리기 앱 🚀  ', null])('preserves the original optional source app name %s in the import request', async (sourceAppName) => {
    readChanges.mockResolvedValue(page({ workouts: [{ ...workout('named-source'), sourceAppName }] }));

    await healthImportService.sync();

    expect(api.post.mock.calls[0]![1]).toEqual({
      records: [expect.objectContaining({ externalId: 'named-source', sourceAppName })],
    });
    expect(disk.get(cursorKey)).toBe('next');
  });

  it('imports an older native workout without the optional source app name', async () => {
    readChanges.mockResolvedValue(page({ workouts: [workout('unnamed-source')] }));

    await healthImportService.sync();

    const request = api.post.mock.calls[0]![1] as HealthImportBatchRequest;
    expect(request.records[0]!.externalId).toBe('unnamed-source');
    expect(request.records[0]!.sourceAppName).toBeUndefined();
    expect(disk.get(cursorKey)).toBe('next');
  });

  it('replays the same page after the server saves but its acknowledgment is lost', async () => {
    readChanges.mockResolvedValue(page({ workouts: [workout('saved-before-timeout')] }));
    api.post.mockRejectedValueOnce(new Error('network unavailable'));

    await expect(healthImportService.sync()).rejects.toThrow('network unavailable');
    expect(disk.get(cursorKey)).toBe('previous');
    api.post.mockResolvedValueOnce({ data: { ...response, createdCount: 0, duplicateCount: 1, awardedPoint: 0 } });

    const result = await healthImportService.sync();

    expect(readChanges.mock.calls).toEqual([[{ cursor: 'previous', limit: 50 }], [{ cursor: 'previous', limit: 50 }]]);
    expect(result.duplicateCount).toBe(1);
    expect(disk.get(cursorKey)).toBe('next');
  });

  it('does not commit a page after only its first server batch succeeds', async () => {
    readChanges.mockResolvedValue(page({ workouts: Array.from({ length: 51 }, (_, index) => workout(`run-${index}`)) }));
    api.post.mockResolvedValueOnce({ data: { ...response, createdCount: 50 } }).mockRejectedValueOnce(new Error('timeout'));

    await expect(healthImportService.sync()).rejects.toThrow('timeout');

    expect(api.post).toHaveBeenCalledTimes(2);
    expect(disk.get(cursorKey)).toBe('previous');
  });

  it.each([
    { createdCount: 1, updatedCount: 0, duplicateCount: 0, awardedPoint: 3, leagueDistanceChanged: false },
    { ...response, createdCount: 0.5, updatedCount: 0.5 },
    { ...response, createdCount: 0 },
    { ...response, awardedPoint: -1 },
    { ...response, personalOnlyCount: 2 },
    { ...response, leagueDistanceChanged: 'false' },
  ])('does not acknowledge a page when HTTP 200 lacks a complete valid processing acknowledgment', async (acknowledgment) => {
    readChanges.mockResolvedValue(page({ workouts: [workout('requires-confirmed-processing')] }));
    api.post.mockResolvedValueOnce({ data: acknowledgment });

    await expect(healthImportService.sync()).rejects.toMatchObject({ code: 'health_import_failed' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(disk.get(cursorKey)).toBe('previous');
  });

  it('splits a known server rejection to import the valid sibling and reports the rejected record', async () => {
    readChanges.mockResolvedValue(page({ workouts: [workout('invalid-gps'), workout('valid')] }));
    api.post.mockRejectedValueOnce(validationFailure()).mockRejectedValueOnce(validationFailure()).mockResolvedValueOnce({ data: response });

    const result = await healthImportService.sync();

    expect(result).toEqual({ importedCount: 1, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 3, rejectedCount: 1, rejectionCodes: ['RUNNING_INVALID_GPS'] });
    expect((api.post.mock.calls[2]![1] as HealthImportBatchRequest).records[0]!.externalId).toBe('valid');
    expect(disk.get(cursorKey)).toBe('next');
  });

  it('reports proven invalid local metrics while uploading a valid sibling', async () => {
    readChanges.mockResolvedValue(page({ workouts: [{ ...workout('invalid'), distance: -1 }, workout('valid')] }));

    const result = await healthImportService.sync();

    expect(result).toMatchObject({ importedCount: 1, rejectedCount: 1, rejectionCodes: ['RUNNING_INVALID_METRICS'] });
    expect((api.post.mock.calls[0]![1] as HealthImportBatchRequest).records.map((record) => record.externalId)).toEqual(['valid']);
    expect(disk.get(cursorKey)).toBe('next');
  });

  it('keeps a rejection summary and the original error if a later split fails transiently', async () => {
    const timeout = new Error('network unavailable');
    readChanges.mockResolvedValue(page({ workouts: [workout('bad'), workout('valid')] }));
    api.post.mockRejectedValueOnce(validationFailure()).mockRejectedValueOnce(validationFailure()).mockRejectedValueOnce(timeout);

    await expect(healthImportService.sync()).rejects.toMatchObject({
      name: 'HealthImportPartialSyncError', originalError: timeout,
      partialResult: { rejectedCount: 1, rejectionCodes: ['RUNNING_INVALID_GPS'] },
    });
    expect(disk.get(cursorKey)).toBe('previous');
  });

  it.each([
    { isAxiosError: true, response: { status: 400, data: { extra: { code: 'UNKNOWN_FAILURE' } } } },
    { isAxiosError: true, response: { status: 503, data: { extra: { code: 'RUNNING_INVALID_GPS' } } } },
  ])('does not split or advance for unrecognized or transient HTTP errors', async (error) => {
    readChanges.mockResolvedValue(page({ workouts: [workout('first'), workout('second')] }));
    api.post.mockRejectedValueOnce(error);

    await expect(healthImportService.sync()).rejects.toBe(error);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(disk.get(cursorKey)).toBe('previous');
  });

  it('keeps the cursor when the server disables import after configuration was read', async () => {
    readChanges.mockResolvedValue(page({ workouts: Array.from({ length: 51 }, (_, index) => workout(`run-${index}`)) }));
    api.post.mockResolvedValueOnce({ data: { ...response, processed: false, createdCount: 0, awardedPoint: 0 } });

    await expect(healthImportService.sync()).rejects.toMatchObject({ code: 'health_import_disabled' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(disk.get(cursorKey)).toBe('previous');
  });

  it('waits for upload acknowledgment before committing the cursor', async () => {
    const pending = deferred<{ data: typeof response }>();
    const started = deferred<void>();
    readChanges.mockResolvedValue(page({ workouts: [workout('waiting')] }));
    api.post.mockImplementationOnce(() => { started.resolve(); return pending.promise; });
    const sync = healthImportService.sync();
    await started.promise;

    expect(disk.get(cursorKey)).toBe('previous');
    pending.resolve({ data: response });
    await sync;
    expect(disk.get(cursorKey)).toBe('next');
  });

  it('advances empty and deletion-only pages without deleting history or uploading records', async () => {
    readChanges.mockResolvedValueOnce(page({ nextCursor: 'empty-page', hasMore: true }))
      .mockResolvedValueOnce(page({ deletedRecordIds: ['already-imported'], nextCursor: 'after-deletion' }));

    expect(await healthImportService.sync()).toEqual({ importedCount: 0, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 0 });
    expect(readChanges.mock.calls[1]).toEqual([{ cursor: 'empty-page', limit: 50 }]);
    expect(api.post).not.toHaveBeenCalled();
    expect(disk.get(cursorKey)).toBe('after-deletion');
  });

  it('replaces an expired cursor only after the fresh snapshot uploads successfully', async () => {
    readChanges.mockResolvedValueOnce(page({ resetRequired: true, nextCursor: null }))
      .mockResolvedValueOnce(page({ workouts: [workout('snapshot')], nextCursor: 'fresh' }));
    api.post.mockRejectedValueOnce(new Error('timeout'));

    await expect(healthImportService.sync()).rejects.toThrow('timeout');
    expect(readChanges.mock.calls[1]).toEqual([{ cursor: null, limit: 50 }]);
    expect(disk.get(cursorKey)).toBe('previous');
  });

  it('recovers an empty stored cursor without replacing it until the fresh snapshot upload succeeds', async () => {
    disk.set(cursorKey, '');
    readChanges.mockResolvedValueOnce(page({ resetRequired: true, nextCursor: null }))
      .mockResolvedValueOnce(page({ workouts: [workout('snapshot')], nextCursor: 'fresh' }));
    api.post.mockRejectedValueOnce(new Error('timeout'));

    await expect(healthImportService.sync()).rejects.toThrow('timeout');
    expect(readChanges.mock.calls[0]).toEqual([{ cursor: '', limit: 50 }]);
    expect(readChanges.mock.calls[1]).toEqual([{ cursor: null, limit: 50 }]);
    expect(disk.get(cursorKey)).toBe('');

    readChanges.mockResolvedValueOnce(page({ resetRequired: true, nextCursor: null }))
      .mockResolvedValueOnce(page({ workouts: [workout('snapshot')], nextCursor: 'fresh' }));
    await healthImportService.sync();

    expect(readChanges.mock.calls[2]).toEqual([{ cursor: '', limit: 50 }]);
    expect(disk.get(cursorKey)).toBe('fresh');
  });

  it('stops a repeated reset request without looping or discarding the saved cursor', async () => {
    readChanges.mockResolvedValue(page({ resetRequired: true, nextCursor: null }));

    await expect(healthImportService.sync()).rejects.toMatchObject({ code: 'health_read_failed' });
    expect(readChanges).toHaveBeenCalledTimes(2);
    expect(disk.get(cursorKey)).toBe('previous');
  });

  it.each([
    { ...page(), workouts: [null] },
    { ...page(), workouts: [{ ...workout('invalid-source-name'), sourceAppName: 42 }] },
    { ...page(), nextCursor: null },
    { ...page(), nextCursor: 'previous', hasMore: true },
    page({ workouts: [{ ...workout('unread-route'), routeStatus: 'readFailed' }] }),
  ])('rejects malformed or incomplete native pages without acknowledging them', async (nativePage) => {
    readChanges.mockResolvedValue(nativePage as unknown as HealthRunningWorkoutChanges);

    await expect(healthImportService.sync()).rejects.toMatchObject({ code: 'health_read_failed' });
    expect(api.post).not.toHaveBeenCalled();
    expect(disk.get(cursorKey)).toBe('previous');
  });

  it('cancels an old account after a deferred native read', async () => {
    const pending = deferred<HealthRunningWorkoutChanges>();
    const started = deferred<void>();
    readChanges.mockImplementationOnce(() => { started.resolve(); return pending.promise; });
    const sync = healthImportService.sync();
    const rejection = expect(sync).rejects.toMatchObject({ name: 'SessionSupersededError' });
    await started.promise;
    jest.mocked(isSessionCurrent).mockReturnValue(false);
    pending.resolve(page({ workouts: [workout('old-owner')] }));

    await rejection;
    expect(api.post).not.toHaveBeenCalled();
    expect(disk.get(cursorKey)).toBe('previous');
  });

  it('serializes concurrent syncs so the next read starts at the committed cursor', async () => {
    const pending = deferred<{ data: typeof response }>();
    const started = deferred<void>();
    readChanges.mockResolvedValueOnce(page({ workouts: [workout('first')] })).mockResolvedValueOnce(page({ nextCursor: 'latest' }));
    api.post.mockImplementationOnce(() => { started.resolve(); return pending.promise; });
    const first = healthImportService.sync();
    await started.promise;
    const second = healthImportService.sync();
    expect(readChanges).toHaveBeenCalledTimes(1);
    pending.resolve({ data: response });
    await first;
    await second;

    expect(readChanges.mock.calls[1]).toEqual([{ cursor: 'next', limit: 50 }]);
    expect(disk.get(cursorKey)).toBe('latest');
  });

  it('finishes a stale storage write before a newer same-account session reads or commits', async () => {
    const release = deferred<void>();
    const started = deferred<void>();
    jest.mocked(AsyncStorage.setItem).mockImplementationOnce(async (key, value) => {
      started.resolve(); await release.promise; disk.set(key, value);
    });
    readChanges.mockResolvedValueOnce(page({ nextCursor: 'old-session' })).mockResolvedValueOnce(page({ nextCursor: 'new-session' }));
    const first = healthImportService.sync();
    const rejection = expect(first).rejects.toMatchObject({ name: 'SessionSupersededError' });
    await started.promise;
    jest.mocked(isSessionCurrent).mockImplementation((snapshot) => snapshot.generation === 2);
    const second = healthImportService.sync({ generation: 2, userId: 16 });
    release.resolve();
    await rejection;
    await second;

    expect(readChanges.mock.calls[1]).toEqual([{ cursor: 'old-session', limit: 50 }]);
    expect(disk.get(cursorKey)).toBe('new-session');
  });

  it('fails visibly on cursor storage failure and retries the saved cursor next time', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(healthImportService.sync()).rejects.toThrow('storage unavailable');
    expect(disk.get(cursorKey)).toBe('previous');
    await healthImportService.sync();
    expect(readChanges.mock.calls[1]).toEqual([{ cursor: 'previous', limit: 50 }]);
    expect(disk.get(cursorKey)).toBe('next');
  });

  it('uses a separate cursor for each account and platform', async () => {
    api.get.mockResolvedValueOnce({ data: { ...configuration, userId: 17 } });
    disk.set('@healthSyncCursor:v1:android:17', 'other-account');
    await healthImportService.sync({ generation: 1, userId: 17 });
    Platform.OS = 'ios';
    disk.set('@healthSyncCursor:v1:ios:16', 'ios-cursor');
    await healthImportService.sync();

    expect(readChanges.mock.calls).toEqual([[{ cursor: 'other-account', limit: 50 }], [{ cursor: 'ios-cursor', limit: 50 }]]);
    expect(disk.get(cursorKey)).toBe('previous');
  });

  it('uses timestamp compatibility when the old server omits the cutoff field', async () => {
    api.get.mockResolvedValueOnce({ data: { userId: 16, healthImportEnabled: true, healthImportLastSyncedTimestamp: 1000 } });
    await healthImportService.sync();

    expect(native.readRunningWorkouts).toHaveBeenCalledWith(expect.objectContaining({ startTimestamp: 1000 }));
    expect(readChanges).not.toHaveBeenCalled();
    expect(disk.get(cursorKey)).toBe('previous');
  });

  it('uses timestamp compatibility when the native build has no changes method', async () => {
    native.readRunningWorkoutChanges = undefined;
    await healthImportService.sync();

    expect(native.readRunningWorkouts).toHaveBeenCalledWith(expect.objectContaining({ startTimestamp: 1000 }));
    expect(readChanges).not.toHaveBeenCalled();
    expect(disk.get(cursorKey)).toBe('previous');
  });

  it('accepts a present null cutoff field as the new server contract', async () => {
    api.get.mockResolvedValueOnce({ data: { ...configuration, healthImportRewardCutoffTimestamp: null } });
    await healthImportService.sync();

    expect(readChanges).toHaveBeenCalledWith({ cursor: 'previous', limit: 50 });
    expect(native.readRunningWorkouts).not.toHaveBeenCalled();
  });

  it('shows terminal rejection counts and safe reasons without workout IDs', () => {
    showHealthImportRejections({
      importedCount: 1, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 3,
      rejectedCount: 1, rejectionCodes: ['RUNNING_INVALID_METRICS'],
    });

    expect(Alert.alert).toHaveBeenCalledWith('일부 Health 기록을 가져오지 못했어요',
      '가져오지 못한 기록: 1개\n러닝 거리 또는 시간 정보가 올바르지 않아 저장할 수 없어요.');
  });

  it('reports already rejected items after a partial failure without exposing the original diagnostic', () => {
    showHealthImportRejections(new HealthImportPartialSyncError(new Error('private transport diagnostic'), {
      importedCount: 0, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 0,
      rejectedCount: 1, rejectionCodes: ['RUNNING_INVALID_GPS'],
    }));

    expect(Alert.alert).toHaveBeenCalledWith('일부 Health 기록을 가져오지 못했어요',
      '가져오지 못한 기록: 1개\n러닝 위치 정보가 올바르지 않아 저장할 수 없어요.');
  });
});
