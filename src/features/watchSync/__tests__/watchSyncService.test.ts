import { syncWatchRecords, watchSyncBridge } from '../watchSyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '~/services/api/client';
import { getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';
import type { CompletedRunningRequest } from '../types';
jest.mock('react-native', () => ({ NativeModules: { RNWatchSyncBridge: { getPendingRecords: jest.fn(), acknowledgeRecord: jest.fn(), setOwnerUserId: jest.fn() } } }));
jest.mock('~/features/auth/stores/authStore', () => ({ getSessionSnapshot: jest.fn(), isSessionCurrent: jest.fn(), useAuthStore: { getState: () => ({ isLoggedIn: true, accessToken: 'available' }) } }));
jest.mock('~/features/running/services/OfflineStorageService', () => ({ offlineStorageService: { serializeReplay: (work: () => Promise<void>) => work() } }));
jest.mock('~/services/api/client', () => ({ apiClient: { post: jest.fn() } }));
jest.mock('~/services/queryClient', () => ({ queryClient: { invalidateQueries: jest.fn() }, queryKeys: { running: { all: ['running'] }, statistics: { all: ['stats'] }, league: { current: ['league'] }, point: { all: ['points'] }, user: { all: ['user'] } } }));
const record: CompletedRunningRequest = { schemaVersion: 1, sessionId: 'e8dd6930-5915-4c6a-b57a-7538eab48b4b', ownerUserId: 7, source: 'APPLE_WATCH', startTimestamp: 10, endTimestamp: 20, distance: 12, durationSec: 10, cadence: 0, heartRate: 0, calorie: 0, gpsPoints: [] };
const pending = watchSyncBridge!.getPendingRecords as jest.Mock;
const ack = watchSyncBridge!.acknowledgeRecord as jest.Mock;
const post = apiClient.post as jest.Mock;
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  (getSessionSnapshot as jest.Mock).mockReturnValue({ generation: 1, userId: 7 });
  (isSessionCurrent as jest.Mock).mockReturnValue(true);
  pending.mockResolvedValue([record]);
  post.mockResolvedValue({ data: { sessionId: record.sessionId, runningRecordId: 99, status: 'CREATED' } });
});
afterEach(() => { jest.restoreAllMocks(); });
it('retains native input after response loss and retries the identical session before duplicate acknowledgement', async () => {
  post.mockRejectedValueOnce(new Error('response lost'));
  await expect(syncWatchRecords()).rejects.toThrow('response lost');
  expect(ack).not.toHaveBeenCalled();
  post.mockResolvedValueOnce({ data: { sessionId: record.sessionId, runningRecordId: 99, status: 'DUPLICATE' } });
  await syncWatchRecords();
  expect(post.mock.calls[0][1]).toEqual(post.mock.calls[1][1]);
  expect(ack).toHaveBeenCalledWith(record.sessionId, 'APPLE_WATCH', '7', '99');
});
it('does not upload another owner records', async () => {
  pending.mockResolvedValue([{ ...record, ownerUserId: 8 }]);
  await syncWatchRecords();
  expect(post).not.toHaveBeenCalled();
  expect(ack).not.toHaveBeenCalled();
});
it('does not acknowledge after account changes while upload is in flight', async () => {
  post.mockImplementationOnce(async () => {
    (isSessionCurrent as jest.Mock).mockReturnValue(false);
    return { data: { sessionId: record.sessionId, runningRecordId: 99, status: 'CREATED' } };
  });
  await syncWatchRecords();
  expect(ack).not.toHaveBeenCalled();
});
it('rejects wrong or invalid server acknowledgement without deleting native input', async () => {
  post.mockResolvedValue({ data: { sessionId: 'other-session', runningRecordId: 99, status: 'CREATED' } });
  await expect(syncWatchRecords()).rejects.toThrow('Invalid watch completion response');
  expect(ack).not.toHaveBeenCalled();
});
it('retries if persisting acknowledgement fails', async () => {
  ack.mockRejectedValueOnce(new Error('disk full'));
  await expect(syncWatchRecords()).rejects.toThrow('disk full');
  await syncWatchRecords();
  expect(post).toHaveBeenCalledTimes(2);
  expect(ack).toHaveBeenCalledTimes(2);
});
it('retains a rejected record and still uploads the next valid record', async () => {
  const second = { ...record, sessionId: '54939696-83f6-4ca7-a348-e0f022b959aa' };
  pending.mockResolvedValue([record, second]);
  post.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400 } })
    .mockResolvedValueOnce({ data: { sessionId: second.sessionId, runningRecordId: 100, status: 'CREATED' } });
  await syncWatchRecords();
  expect(ack).toHaveBeenCalledTimes(1);
  expect(ack).toHaveBeenCalledWith(second.sessionId, 'APPLE_WATCH', '7', '100');
});

it.each([
  'RUNNING_FUTURE_END_TIME', 'RUNNING_EXCESSIVE_AVERAGE_SPEED', 'RUNNING_INVALID_METRICS', 'RUNNING_INVALID_GPS',
])('persists %s and skips it on repeated replay while acknowledging the next valid record', async (code) => {
  const second = { ...record, sessionId: '54939696-83f6-4ca7-a348-e0f022b959aa' };
  pending.mockResolvedValueOnce([record, second]).mockResolvedValue([record]);
  post.mockRejectedValueOnce({ isAxiosError: true, response: {
    status: 400, data: { extra: { code } },
  } }).mockResolvedValueOnce({ data: { sessionId: second.sessionId, runningRecordId: 100, status: 'CREATED' } });

  await syncWatchRecords();
  const stored = await AsyncStorage.getItem('@watch_running_rejections:7');
  expect(JSON.parse(stored!)).toEqual([{
    source: 'APPLE_WATCH', sessionId: record.sessionId, code,
  }]);
  await syncWatchRecords();
  await syncWatchRecords();

  expect(post).toHaveBeenCalledTimes(2);
  expect(ack).toHaveBeenCalledTimes(1);
  expect(ack).toHaveBeenCalledWith(second.sessionId, 'APPLE_WATCH', '7', '100');
  expect(await AsyncStorage.getItem('@watch_running_rejections:7')).toBe(stored);
});

it('loads a prior process rejection index without posting or acknowledging the still-pending workout', async () => {
  await AsyncStorage.setItem('@watch_running_rejections:7', JSON.stringify([{
    source: 'APPLE_WATCH', sessionId: record.sessionId, code: 'RUNNING_INVALID_METRICS',
  }]));

  await syncWatchRecords();

  expect(post).not.toHaveBeenCalled();
  expect(ack).not.toHaveBeenCalled();
});

it('does not suppress another owner or source using the same session UUID', async () => {
  await AsyncStorage.setItem('@watch_running_rejections:7', JSON.stringify([{
    source: 'APPLE_WATCH', sessionId: record.sessionId, code: 'RUNNING_INVALID_METRICS',
  }]));
  (getSessionSnapshot as jest.Mock).mockReturnValue({ generation: 2, userId: 8 });
  const otherOwner = { ...record, ownerUserId: 8 };
  pending.mockResolvedValue([otherOwner]);

  await syncWatchRecords();

  expect(post).toHaveBeenCalledWith('/running/completed-records', otherOwner, { sessionSnapshot: { generation: 2, userId: 8 } });
  expect(ack).toHaveBeenCalledWith(record.sessionId, 'APPLE_WATCH', '8', '99');
  (getSessionSnapshot as jest.Mock).mockReturnValue({ generation: 3, userId: 7 });
  pending.mockResolvedValue([{ ...record, source: 'WEAR_OS' }]);
  await syncWatchRecords();
  expect(ack).toHaveBeenCalledWith(record.sessionId, 'WEAR_OS', '7', '99');
});

it('keeps unknown 400 responses retryable without indexing or acknowledging them', async () => {
  post.mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { extra: { code: 'UNKNOWN' } } } });

  await syncWatchRecords();
  await syncWatchRecords();

  expect(post).toHaveBeenCalledTimes(2);
  expect(ack).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem('@watch_running_rejections:7')).toBeNull();
});

it('does not index a rejection after the session changes during the POST', async () => {
  post.mockImplementationOnce(async () => {
    (isSessionCurrent as jest.Mock).mockReturnValue(false);
    throw { isAxiosError: true, response: { status: 400, data: { extra: { code: 'RUNNING_INVALID_METRICS' } } } };
  });

  await syncWatchRecords();

  expect(ack).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem('@watch_running_rejections:7')).toBeNull();
  expect(await AsyncStorage.getItem('@watch_running_rejections:8')).toBeNull();
});

it('collects only absent current-owner identities and retains pending rejections and other owner indexes', async () => {
  await AsyncStorage.setItem('@watch_running_rejections:7', JSON.stringify([
    { source: 'APPLE_WATCH', sessionId: record.sessionId, code: 'RUNNING_INVALID_METRICS' },
    { source: 'APPLE_WATCH', sessionId: '54939696-83f6-4ca7-a348-e0f022b959aa', code: 'RUNNING_INVALID_GPS' },
  ]));
  const otherOwnerIndex = JSON.stringify([{
    source: 'WEAR_OS', sessionId: record.sessionId, code: 'RUNNING_EXCESSIVE_AVERAGE_SPEED',
  }]);
  await AsyncStorage.setItem('@watch_running_rejections:8', otherOwnerIndex);

  await syncWatchRecords();
  await syncWatchRecords();

  expect(post).not.toHaveBeenCalled();
  expect(JSON.parse((await AsyncStorage.getItem('@watch_running_rejections:7'))!)).toEqual([
    { source: 'APPLE_WATCH', sessionId: record.sessionId, code: 'RUNNING_INVALID_METRICS' },
  ]);
  expect(await AsyncStorage.getItem('@watch_running_rejections:8')).toBe(otherOwnerIndex);
});

it('propagates rejection index write failure without acknowledging or losing the native record', async () => {
  const storageError = new Error('index write unavailable');
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(storageError);
  post.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { extra: { code: 'RUNNING_INVALID_METRICS' } } } });

  await expect(syncWatchRecords()).rejects.toBe(storageError);

  expect(ack).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem('@watch_running_rejections:7')).toBeNull();
  await syncWatchRecords();
  expect(post).toHaveBeenCalledTimes(2);
  expect(ack).toHaveBeenCalledWith(record.sessionId, 'APPLE_WATCH', '7', '99');
});

it('propagates rejection index read failure before any POST or acknowledgement', async () => {
  const storageError = new Error('index read unavailable');
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(storageError);

  await expect(syncWatchRecords()).rejects.toBe(storageError);

  expect(post).not.toHaveBeenCalled();
  expect(ack).not.toHaveBeenCalled();
});
