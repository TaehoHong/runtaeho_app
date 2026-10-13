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
