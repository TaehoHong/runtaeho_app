import { queryClient, queryKeys } from '~/services/queryClient';
import { getSessionSnapshot, isSessionCurrent, type SessionSnapshot } from '~/features/auth/stores/authStore';
import { SessionSupersededError } from '~/utils/storage/errors';
import { runningService } from './runningService';
import { getRunningRejectionCode, isRunningRejectionCode, type RunningRejectionCode } from './runningRejection';
/**
 * Offline Storage Service
 * 네트워크 오프라인 시 러닝 데이터 로컬 저장 및 재시도 관리
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EndRunningRecord } from '../models';
import type { RunningRecord } from '../models/RunningRecord';
import type { RunningRecordItem } from '../models/RunningRecordItem';

/**
 * AsyncStorage 키
 */
const STORAGE_KEYS = {
  PENDING_UPLOADS: '@pending_running_uploads',
  PENDING_SEGMENT_UPLOADS: '@pending_segment_uploads', // 세그먼트 업로드 대기열
  FAILED_UPLOADS: '@failed_running_uploads',
  PENDING_SHOE_PATCHES: '@pending_running_shoe_patches',
  OFFLINE_MODE: '@offline_mode',
} as const;

/**
 * 대기 중인 업로드 데이터
 */
interface PendingUpload {
  ownerUserId?: number;
  id: string; // UUID
  runningRecordId: number;
  data: RunningRecord;
  segments?: RunningRecordItem[];
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

/**
 * 대기 중인 세그먼트 업로드 데이터
 */
interface PendingSegmentUpload {
  ownerUserId?: number;
  id: string; // UUID
  runningRecordId: number;
  segments: RunningRecordItem[];
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

interface PendingShoePatch {
  id: string;
  ownerUserId?: number;
  runningRecordId: number;
  shoeId: number;
}

type OwnedUpload = { id: string; ownerUserId?: number; runningRecordId: number };

/**
 * Offline Storage Service
 */
export class OfflineStorageService {
  private static instance: OfflineStorageService;
  private maxRetryCount = 3;
  private writes: Promise<unknown> = Promise.resolve();
  private replay: Promise<unknown> = Promise.resolve();
  private activeUploads = new Map<number, SessionSnapshot>();

  private assertSession(session: SessionSnapshot): void {
    if (session.userId === null || !isSessionCurrent(session)) throw new SessionSupersededError();
  }

  private async readQueue<T>(key: string): Promise<T[]> {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }

  private write<T>(session: SessionSnapshot, action: () => Promise<T>): Promise<T> {
    const result = this.writes.then(async () => {
      this.assertSession(session);
      return action();
    });
    this.writes = result.catch(() => undefined);
    return result;
  }

  private async upsert<T extends OwnedUpload>(key: string, upload: T, session: SessionSnapshot): Promise<void> {
    await this.write(session, async () => {
      const pending = await this.readQueue<T>(key);
      this.assertSession(session);
      const remaining = pending.filter(item => item.runningRecordId !== upload.runningRecordId || item.ownerUserId !== session.userId);
      await AsyncStorage.setItem(key, JSON.stringify([...remaining, upload]));
      this.assertSession(session);
    });
  }

  private async removeOwned(key: string, id: string, session: SessionSnapshot): Promise<void> {
    await this.write(session, async () => {
      const pending = await this.readQueue<OwnedUpload>(key);
      this.assertSession(session);
      await AsyncStorage.setItem(key, JSON.stringify(pending.filter(item => item.id !== id || item.ownerUserId !== session.userId)));
      this.assertSession(session);
    });
  }

  private async claim(key: string, upload: OwnedUpload, session: SessionSnapshot): Promise<boolean> {
    this.assertSession(session);
    if (upload.ownerUserId !== undefined) return upload.ownerUserId === session.userId;
    await runningService.verifyOwnership(upload.runningRecordId, session);
    this.assertSession(session);
    return this.write(session, async () => {
      const pending = await this.readQueue<OwnedUpload>(key);
      this.assertSession(session);
      const current = pending.find(item => item.id === upload.id);
      if (!current || (current.ownerUserId !== undefined && current.ownerUserId !== session.userId)) return false;
      current.ownerUserId = session.userId!;
      await AsyncStorage.setItem(key, JSON.stringify(pending));
      this.assertSession(session);
      upload.ownerUserId = session.userId!;
      return true;
    });
  }

  serializeReplay<T>(action: () => Promise<T>): Promise<T> {
    const result = this.replay.then(action);
    this.replay = result.catch(() => undefined);
    return result;
  }

  private constructor() {}

  static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService();
    }
    return OfflineStorageService.instance;
  }

  /**
   * UUID 생성 (간단한 버전)
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 최종 기록과 세그먼트를 하나의 영속 snapshot으로 저장한다.
   */
  async addPendingUpload(
    runningRecordId: number, data: RunningRecord, session: SessionSnapshot = getSessionSnapshot(),
    segments?: RunningRecordItem[],
  ): Promise<string> {
    this.assertSession(session);
    const id = this.generateId();
    await this.upsert(STORAGE_KEYS.PENDING_UPLOADS, {
      id, ownerUserId: session.userId!, runningRecordId, data, segments,
      timestamp: Date.now(), retryCount: 0,
    }, session);
    return id;
  }

  async withPendingUpload<T>(
    data: RunningRecord, segments: RunningRecordItem[], session: SessionSnapshot,
    action: (uploadId: string) => Promise<T>,
  ): Promise<T> {
    this.assertSession(session);
    this.activeUploads.set(data.id, session);
    try {
      const uploadId = await this.addPendingUpload(data.id, data, session, segments);
      return await action(uploadId);
    } finally {
      if (this.activeUploads.get(data.id) === session) this.activeUploads.delete(data.id);
    }
  }

  private isUploadActive(runningRecordId: number): boolean {
    const session = this.activeUploads.get(runningRecordId);
    return session !== undefined && isSessionCurrent(session);
  }

  /**
   * 대기 중인 업로드 목록 조회
   */
  async getPendingUploads(): Promise<PendingUpload[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_UPLOADS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[OfflineStorage] Failed to get pending uploads:', error);
      return [];
    }
  }

  /**
   * 업로드 성공 시 대기열에서 제거
   */
  async removePendingUpload(uploadId: string, session: SessionSnapshot = getSessionSnapshot()): Promise<void> {
    await this.removeOwned(STORAGE_KEYS.PENDING_UPLOADS, uploadId, session);
  }

  async completePendingUpload(uploadId: string, session: SessionSnapshot, result?: EndRunningRecord | void): Promise<void> {
    const pending = await this.readQueue<PendingUpload>(STORAGE_KEYS.PENDING_UPLOADS);
    this.assertSession(session);
    const upload = pending.find(item => item.id === uploadId && item.ownerUserId === session.userId);
    if (!upload) return;
    if (result?.acceptanceStatus === 'DUPLICATE') {
      await this.discardPendingSegments(upload.runningRecordId, session);
    } else if (upload.segments?.length) {
      // 세그먼트 큐 저장이 실패해도 최종 snapshot은 기록 큐에 남아 재시작 후 복구된다.
      await this.addPendingSegmentUpload(upload.runningRecordId, upload.segments, session);
    }
    await this.removePendingUpload(uploadId, session);
  }

  /**
   * 업로드 실패 시 재시도 카운트 증가
   */
  async incrementRetryCount(uploadId: string, errorMessage?: string, session: SessionSnapshot = getSessionSnapshot()): Promise<void> {
    await this.write(session, async () => {
      const pending = await this.getPendingUploads();
      const upload = pending.find(item => item.id === uploadId && item.ownerUserId === session.userId);
      if (!upload) return;
      upload.retryCount++;
      if (errorMessage !== undefined) upload.lastError = errorMessage;
      if (upload.retryCount >= this.maxRetryCount) {
        const failed = await this.getFailedUploads();
        this.assertSession(session);
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.FAILED_UPLOADS, JSON.stringify([...failed, upload])],
          [STORAGE_KEYS.PENDING_UPLOADS, JSON.stringify(pending.filter(item => item.id !== uploadId))],
        ]);
      } else {
        this.assertSession(session);
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_UPLOADS, JSON.stringify(pending));
      }
      this.assertSession(session);
    });
  }

  private async rejectPendingUpload(uploadId: string, code: RunningRejectionCode, session: SessionSnapshot): Promise<void> {
    await this.write(session, async () => {
      const pending = await this.readQueue<PendingUpload>(STORAGE_KEYS.PENDING_UPLOADS);
      const upload = pending.find(item => item.id === uploadId && item.ownerUserId === session.userId);
      if (!upload) return;
      const failed = await this.readQueue<PendingUpload>(STORAGE_KEYS.FAILED_UPLOADS);
      const segments = await this.readQueue<PendingSegmentUpload>(STORAGE_KEYS.PENDING_SEGMENT_UPLOADS);
      this.assertSession(session);
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.FAILED_UPLOADS, JSON.stringify([...failed, { ...upload, lastError: code }])],
        [STORAGE_KEYS.PENDING_UPLOADS, JSON.stringify(pending.filter(item => item.id !== uploadId || item.ownerUserId !== session.userId))],
        [STORAGE_KEYS.PENDING_SEGMENT_UPLOADS, JSON.stringify(segments.filter(item =>
          item.runningRecordId !== upload.runningRecordId || item.ownerUserId !== session.userId))],
      ]);
      this.assertSession(session);
    });
  }

  /**
   * 실패한 업로드 목록 조회
   */
  async getFailedUploads(): Promise<PendingUpload[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FAILED_UPLOADS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[OfflineStorage] Failed to get failed uploads:', error);
      return [];
    }
  }

  /**
   * 실패한 업로드 재시도 (수동)
   */
  async retryFailedUpload(uploadId: string): Promise<void> {
    const session = getSessionSnapshot();
    this.assertSession(session);
    const failed = await this.getFailedUploads();
    const upload = failed.find(item => item.id === uploadId);
    if (!upload || !await this.claim(STORAGE_KEYS.FAILED_UPLOADS, upload, session)) return;
    if (isRunningRejectionCode(upload.lastError)) return;
    await this.write(session, async () => {
      const currentFailed = await this.getFailedUploads();
      const current = currentFailed.find(item => item.id === uploadId && item.ownerUserId === session.userId);
      if (!current) return;
      const pending = await this.getPendingUploads();
      this.assertSession(session);
      current.retryCount = 0;
      delete current.lastError;
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.PENDING_UPLOADS, JSON.stringify([...pending, current])],
        [STORAGE_KEYS.FAILED_UPLOADS, JSON.stringify(currentFailed.filter(item => item.id !== uploadId))],
      ]);
      this.assertSession(session);
    });
  }

  /**
   * 모든 대기 중인 업로드 재시도
   */
  async retryAllPendingUploads(
    uploadFn: (data: RunningRecord) => Promise<EndRunningRecord | void>,
    session: SessionSnapshot = getSessionSnapshot(),
  ): Promise<{ success: number; failed: number }> {
    const pending = await this.getPendingUploads();
    let success = 0;
    let failed = 0;
    for (const upload of pending) {
      this.assertSession(session);
      try {
        if (!await this.claim(STORAGE_KEYS.PENDING_UPLOADS, upload, session)) continue;
        this.assertSession(session);
        if (this.isUploadActive(upload.runningRecordId)) continue;
        const result = await uploadFn(upload.data);
        this.assertSession(session);
        await this.completePendingUpload(upload.id, session, result);
        success++;
      } catch (error) {
        this.assertSession(session);
        // Ownership rejection never changes an unclaimed legacy entry.
        if (upload.ownerUserId === session.userId) {
          const rejectionCode = getRunningRejectionCode(error);
          if (rejectionCode) await this.rejectPendingUpload(upload.id, rejectionCode, session);
          else await this.incrementRetryCount(upload.id, 'Upload failed', session);
        }
        failed++;
      }
    }
    return { success, failed };
  }

  /**
   * 오프라인 모드 설정
   */
  async setOfflineMode(isOffline: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, JSON.stringify(isOffline));
    } catch (error) {
      console.error('[OfflineStorage] Failed to set offline mode:', error);
    }
  }

  /**
   * 오프라인 모드 확인
   */
  async isOfflineMode(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MODE);
      return data ? JSON.parse(data) : false;
    } catch (error) {
      console.error('[OfflineStorage] Failed to check offline mode:', error);
      return false;
    }
  }

  /**
   * 대기 중인 업로드 개수
   */
  async getPendingCount(): Promise<number> {
    const pending = await this.getPendingUploads();
    return pending.length;
  }

  /**
   * 실패한 업로드 개수
   */
  async getFailedCount(): Promise<number> {
    const failed = await this.getFailedUploads();
    return failed.length;
  }

  /**
   * 모든 오프라인 데이터 초기화
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PENDING_UPLOADS,
        STORAGE_KEYS.PENDING_SEGMENT_UPLOADS,
        STORAGE_KEYS.FAILED_UPLOADS,
        STORAGE_KEYS.PENDING_SHOE_PATCHES,
        STORAGE_KEYS.OFFLINE_MODE,
      ]);
      console.log('[OfflineStorage] Cleared all offline data');
    } catch (error) {
      console.error('[OfflineStorage] Failed to clear offline data:', error);
    }
  }

  /**
   * ========================================
   * 세그먼트 업로드 관련 메서드
   * ========================================
   */

  /**
   * 세그먼트 업로드 대기열에 추가
   */
  async addPendingSegmentUpload(runningRecordId: number, segments: RunningRecordItem[], session: SessionSnapshot = getSessionSnapshot()): Promise<void> {
    this.assertSession(session);
    await this.upsert(STORAGE_KEYS.PENDING_SEGMENT_UPLOADS, {
      id: this.generateId(), ownerUserId: session.userId!, runningRecordId, segments,
      timestamp: Date.now(), retryCount: 0,
    }, session);
  }

  async discardPendingSegments(runningRecordId: number, session: SessionSnapshot): Promise<void> {
    await this.write(session, async () => {
      const pending = await this.readQueue<PendingSegmentUpload>(STORAGE_KEYS.PENDING_SEGMENT_UPLOADS);
      this.assertSession(session);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SEGMENT_UPLOADS, JSON.stringify(pending.filter(item =>
        item.runningRecordId !== runningRecordId || item.ownerUserId !== session.userId)));
      this.assertSession(session);
    });
  }

  /**
   * 대기 중인 세그먼트 업로드 목록 조회
   */
  async getPendingSegmentUploads(): Promise<PendingSegmentUpload[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SEGMENT_UPLOADS);
      const pending: PendingSegmentUpload[] = data ? JSON.parse(data) : [];
      // JSON 저장으로 문자열이 된 GPS 시간을 Location 모델의 Date로 복원한다.
      for (const upload of pending) {
        for (const segment of upload.segments) {
          for (const location of segment.locations ?? []) {
            location.timestamp = new Date(location.timestamp);
          }
        }
      }
      return pending;
    } catch (error) {
      console.error('[OfflineStorage] Failed to get pending segment uploads:', error);
      return [];
    }
  }

  /**
   * 세그먼트 업로드 제거
   */
  async removePendingSegmentUpload(uploadId: string, session: SessionSnapshot = getSessionSnapshot()): Promise<void> {
    await this.removeOwned(STORAGE_KEYS.PENDING_SEGMENT_UPLOADS, uploadId, session);
  }

  /**
   * 모든 대기 중인 세그먼트 업로드 재시도
   */
  async retryAllPendingSegmentUploads(
    uploadFn: (runningRecordId: number, segments: RunningRecordItem[]) => Promise<void>,
    session: SessionSnapshot = getSessionSnapshot(),
  ): Promise<{ success: number; failed: number }> {
    const pending = await this.getPendingSegmentUploads();
    let success = 0;
    let failed = 0;
    for (const upload of pending) {
      this.assertSession(session);
      try {
        if (!await this.claim(STORAGE_KEYS.PENDING_SEGMENT_UPLOADS, upload, session)) continue;
        const summaries = [
          ...await this.readQueue<PendingUpload>(STORAGE_KEYS.PENDING_UPLOADS),
          ...await this.readQueue<PendingUpload>(STORAGE_KEYS.FAILED_UPLOADS),
        ];
        this.assertSession(session);
        if (this.isUploadActive(upload.runningRecordId) || summaries.some(item => item.runningRecordId === upload.runningRecordId &&
          (item.ownerUserId === session.userId || item.ownerUserId === undefined))) continue;
        await uploadFn(upload.runningRecordId, upload.segments);
        this.assertSession(session);
        await this.removePendingSegmentUpload(upload.id, session);
        success++;
      } catch (error) {
        this.assertSession(session);
        if (upload.ownerUserId === session.userId && getRunningRejectionCode(error)) {
          await this.removePendingSegmentUpload(upload.id, session);
        }
        failed++;
      }
    }
    return { success, failed };
  }

  async addPendingShoePatch(runningRecordId: number, shoeId: number, session: SessionSnapshot = getSessionSnapshot()): Promise<void> {
    this.assertSession(session);
    await this.upsert(STORAGE_KEYS.PENDING_SHOE_PATCHES, {
      id: this.generateId(), ownerUserId: session.userId!, runningRecordId, shoeId,
    }, session);
  }

  async retryPendingShoePatches(session: SessionSnapshot): Promise<void> {
    const patches = await this.readQueue<PendingShoePatch>(STORAGE_KEYS.PENDING_SHOE_PATCHES);
    for (const patch of patches) {
      this.assertSession(session);
      if (patch.ownerUserId !== session.userId) continue;
      const pending = await this.getPendingUploads();
      const failed = await this.getFailedUploads();
      this.assertSession(session);
      if ([...pending, ...failed].some(item => item.runningRecordId === patch.runningRecordId && (item.ownerUserId === session.userId || item.ownerUserId === undefined))) continue;
      try {
        await runningService.updateRunningRecordShoe({ runningRecordId: patch.runningRecordId, shoeId: patch.shoeId }, session);
        this.assertSession(session);
        await this.removeOwned(STORAGE_KEYS.PENDING_SHOE_PATCHES, patch.id, session);
        this.assertSession(session);
        await queryClient.invalidateQueries({ queryKey: queryKeys.shoe.all });
        this.assertSession(session);
        await queryClient.invalidateQueries({ queryKey: queryKeys.running.all });
      } catch {
        this.assertSession(session);
        console.warn('[OfflineStorage] Shoe update remains pending');
      }
    }
  }

  /**
   * 대기 중인 세그먼트 업로드 개수
   */
  async getPendingSegmentCount(): Promise<number> {
    const pending = await this.getPendingSegmentUploads();
    return pending.length;
  }
}

// Singleton export
export const offlineStorageService = OfflineStorageService.getInstance();
