import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineStorageService } from '../services/OfflineStorageService';
import { createRunningRecord } from '../models/RunningRecord';

let mockSession = { userId: 1 as number | null, generation: 1 };
const mockVerifyOwnership = jest.fn();
const mockPatch = jest.fn();
jest.mock('~/features/auth/stores/authStore', () => ({
  getSessionSnapshot: () => ({ ...mockSession }),
  isSessionCurrent: (snapshot: typeof mockSession) => snapshot.userId === mockSession.userId && snapshot.generation === mockSession.generation,
}));
jest.mock('../services/runningService', () => ({
  runningService: {
    verifyOwnership: (...args: unknown[]) => mockVerifyOwnership(...args),
    updateRunningRecordShoe: (...args: unknown[]) => mockPatch(...args),
  },
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  mockSession = { userId: 1, generation: 1 };
  mockVerifyOwnership.mockReset().mockResolvedValue(undefined);
  mockPatch.mockReset().mockResolvedValue(undefined);
});

it('does not replay a different account record', async () => {
  await offlineStorageService.addPendingUpload(10, createRunningRecord(10));
  mockSession = { userId: 2, generation: 2 };
  const upload = jest.fn();
  await offlineStorageService.retryAllPendingUploads(upload);
  expect(upload).not.toHaveBeenCalled();
  expect(await offlineStorageService.getPendingCount()).toBe(1);
});

it('verifies and persists legacy ownership before sending an unfinished record', async () => {
  await AsyncStorage.setItem('@pending_running_uploads', JSON.stringify([
    { id: 'legacy', runningRecordId: 10, data: createRunningRecord(10), retryCount: 0 },
  ]));
  const upload = jest.fn(async () => {
    expect((await offlineStorageService.getPendingUploads())[0]?.ownerUserId).toBe(1);
  });
  await offlineStorageService.retryAllPendingUploads(upload);
  expect(mockVerifyOwnership).toHaveBeenCalledWith(10, { userId: 1, generation: 1 });
  expect(upload).toHaveBeenCalledTimes(1);
  expect(await offlineStorageService.getPendingCount()).toBe(0);
});

it('keeps rejected legacy ownership unassigned and unsent', async () => {
  await AsyncStorage.setItem('@pending_running_uploads', JSON.stringify([
    { id: 'legacy', runningRecordId: 10, data: createRunningRecord(10), retryCount: 0 },
  ]));
  mockVerifyOwnership.mockRejectedValue(new Error('Forbidden'));
  const upload = jest.fn();
  await offlineStorageService.retryAllPendingUploads(upload);
  expect(upload).not.toHaveBeenCalled();
  expect((await offlineStorageService.getPendingUploads())[0]?.ownerUserId).toBeUndefined();
});

it('waits for end upload before applying a durable shoe selection', async () => {
  await offlineStorageService.addPendingUpload(10, createRunningRecord(10));
  await offlineStorageService.addPendingShoePatch(10, 20);
  await offlineStorageService.retryPendingShoePatches(mockSession);
  expect(mockPatch).not.toHaveBeenCalled();
  await offlineStorageService.retryAllPendingUploads(async () => undefined);
  await offlineStorageService.retryPendingShoePatches(mockSession);
  expect(mockPatch).toHaveBeenCalledWith({ runningRecordId: 10, shoeId: 20 }, mockSession);
});

it('does not remove a newer selection when an older PATCH completes', async () => {
  await offlineStorageService.addPendingShoePatch(10, 20);
  mockPatch.mockImplementationOnce(async () => {
    await offlineStorageService.addPendingShoePatch(10, 21);
  });
  await offlineStorageService.retryPendingShoePatches(mockSession);
  await offlineStorageService.retryPendingShoePatches(mockSession);
  expect(mockPatch).toHaveBeenLastCalledWith({ runningRecordId: 10, shoeId: 21 }, mockSession);
});

it('stops replay without deleting data when the session changes during upload', async () => {
  await offlineStorageService.addPendingUpload(10, createRunningRecord(10));
  const upload = jest.fn(async () => { mockSession = { userId: 2, generation: 2 }; });
  await expect(offlineStorageService.retryAllPendingUploads(upload)).rejects.toThrow('Session superseded');
  expect(await offlineStorageService.getPendingCount()).toBe(1);
});

it('quarantines a permanent rejection once and removes only the rejected owner segments', async () => {
  await offlineStorageService.addPendingUpload(10, createRunningRecord(10));
  await offlineStorageService.addPendingSegmentUpload(10, []);
  mockSession = { userId: 2, generation: 2 };
  await offlineStorageService.addPendingUpload(10, createRunningRecord(10));
  await offlineStorageService.addPendingSegmentUpload(10, []);
  mockSession = { userId: 1, generation: 3 };
  const upload = jest.fn().mockRejectedValue({
    isAxiosError: true, response: { status: 400, data: { extra: { code: 'RUNNING_INVALID_METRICS' } } },
  });

  expect(await offlineStorageService.retryAllPendingUploads(upload)).toEqual({ success: 0, failed: 1 });
  const failed = await offlineStorageService.getFailedUploads();
  expect(failed).toHaveLength(1);
  expect(failed[0]).toMatchObject({ ownerUserId: 1, runningRecordId: 10, lastError: 'RUNNING_INVALID_METRICS' });
  expect(await offlineStorageService.getPendingUploads()).toMatchObject([{ ownerUserId: 2, runningRecordId: 10 }]);
  expect(await offlineStorageService.getPendingSegmentUploads()).toMatchObject([{ ownerUserId: 2, runningRecordId: 10 }]);

  await offlineStorageService.retryFailedUpload(failed[0]!.id);
  await offlineStorageService.retryAllPendingUploads(upload);
  expect(upload).toHaveBeenCalledTimes(1);
  expect(await offlineStorageService.getFailedUploads()).toHaveLength(1);
});

it('preserves another owner pending upload even when its local queue ID collides with the rejected entry', async () => {
  await AsyncStorage.setItem('@pending_running_uploads', JSON.stringify([
    { id: 'same-local-id', ownerUserId: 1, runningRecordId: 10, data: createRunningRecord(10), retryCount: 0 },
    { id: 'same-local-id', ownerUserId: 2, runningRecordId: 20, data: createRunningRecord(20), retryCount: 0 },
  ]));

  await offlineStorageService.retryAllPendingUploads(jest.fn().mockRejectedValue({
    isAxiosError: true, response: { status: 400, data: { extra: { code: 'RUNNING_INVALID_METRICS' } } },
  }));

  expect(await offlineStorageService.getPendingUploads()).toMatchObject([{ ownerUserId: 2, runningRecordId: 20 }]);
  expect(await offlineStorageService.getFailedUploads()).toMatchObject([{ ownerUserId: 1, runningRecordId: 10 }]);
});

it.each([
  new Error('network unavailable'),
  { isAxiosError: true, response: { status: 503, data: { extra: { code: 'RUNNING_INVALID_METRICS' } } } },
  { isAxiosError: true, response: { status: 400, data: { extra: { code: 'UNRECOGNIZED_ERROR' } } } },
])('keeps a non-definitive failure queued with its segments', async (error) => {
  await offlineStorageService.addPendingUpload(10, createRunningRecord(10));
  await offlineStorageService.addPendingSegmentUpload(10, []);

  await offlineStorageService.retryAllPendingUploads(jest.fn().mockRejectedValue(error));

  expect(await offlineStorageService.getPendingUploads()).toMatchObject([{ ownerUserId: 1, retryCount: 1 }]);
  expect(await offlineStorageService.getPendingSegmentUploads()).toHaveLength(1);
  expect(await offlineStorageService.getFailedUploads()).toHaveLength(0);
});

it('retains rejected data when the account changes during the failed upload', async () => {
  await offlineStorageService.addPendingUpload(10, createRunningRecord(10));
  const upload = jest.fn(async () => {
    mockSession = { userId: 2, generation: 2 };
    throw { isAxiosError: true, response: { status: 400, data: { extra: { code: 'RUNNING_INVALID_METRICS' } } } };
  });

  await expect(offlineStorageService.retryAllPendingUploads(upload)).rejects.toThrow('Session superseded');

  expect(await offlineStorageService.getPendingUploads()).toMatchObject([{ ownerUserId: 1 }]);
  expect(await offlineStorageService.getFailedUploads()).toHaveLength(0);
});

it('removes only a permanently rejected segment upload and leaves network failures queued', async () => {
  await offlineStorageService.addPendingSegmentUpload(10, []);
  await offlineStorageService.addPendingSegmentUpload(11, []);
  const upload = jest.fn().mockRejectedValueOnce({
    isAxiosError: true, response: { status: 400, data: { extra: { code: 'RUNNING_INVALID_GPS' } } },
  }).mockRejectedValueOnce(new Error('network unavailable'));

  expect(await offlineStorageService.retryAllPendingSegmentUploads(upload)).toEqual({ success: 0, failed: 2 });

  expect(await offlineStorageService.getPendingSegmentUploads()).toMatchObject([{ runningRecordId: 11 }]);
});

it('replays a saved snapshot in a new login generation while the old session operation is stalled', async () => {
  let releaseOperation!: () => void;
  let notifySaved!: () => void;
  const saved = new Promise<void>(resolve => { notifySaved = resolve; });
  const operation = offlineStorageService.withPendingUpload(createRunningRecord(10), [], { ...mockSession }, async () => {
    notifySaved();
    await new Promise<void>(resolve => { releaseOperation = resolve; });
  });
  await saved;
  mockSession = { userId: 1, generation: 2 };
  const upload = jest.fn().mockResolvedValue(undefined);
  try {
    await offlineStorageService.serializeReplay(() => offlineStorageService.retryAllPendingUploads(upload));
    expect(upload).toHaveBeenCalledTimes(1);
    expect(await offlineStorageService.getPendingCount()).toBe(0);
  } finally {
    releaseOperation();
    await operation;
  }
});
