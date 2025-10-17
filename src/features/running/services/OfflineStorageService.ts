/**
 * Offline Storage Service
 * 네트워크 오프라인 시 러닝 데이터 로컬 저장 및 재시도 관리
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RunningRecord } from '../models/RunningRecord';

/**
 * AsyncStorage 키
 */
const STORAGE_KEYS = {
  PENDING_UPLOADS: '@pending_running_uploads',
  FAILED_UPLOADS: '@failed_running_uploads',
  OFFLINE_MODE: '@offline_mode',
} as const;

/**
 * 대기 중인 업로드 데이터
 */
interface PendingUpload {
  id: string; // UUID
  runningRecordId: number;
  data: RunningRecord;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

/**
 * Offline Storage Service
 */
export class OfflineStorageService {
  private static instance: OfflineStorageService;
  private maxRetryCount = 3;

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
   * 업로드 대기열에 추가
   */
  async addPendingUpload(
    runningRecordId: number,
    data: RunningRecord
  ): Promise<void> {
    try {
      const pending = await this.getPendingUploads();

      const newUpload: PendingUpload = {
        id: this.generateId(),
        runningRecordId,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      };

      pending.push(newUpload);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_UPLOADS,
        JSON.stringify(pending)
      );

      console.log(`[OfflineStorage] Added pending upload: ${newUpload.id}`);
    } catch (error) {
      console.error('[OfflineStorage] Failed to add pending upload:', error);
      throw error;
    }
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
  async removePendingUpload(uploadId: string): Promise<void> {
    try {
      const pending = await this.getPendingUploads();
      const filtered = pending.filter(item => item.id !== uploadId);

      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_UPLOADS,
        JSON.stringify(filtered)
      );

      console.log(`[OfflineStorage] Removed pending upload: ${uploadId}`);
    } catch (error) {
      console.error('[OfflineStorage] Failed to remove pending upload:', error);
    }
  }

  /**
   * 업로드 실패 시 재시도 카운트 증가
   */
  async incrementRetryCount(uploadId: string, errorMessage?: string): Promise<void> {
    try {
      const pending = await this.getPendingUploads();
      const upload = pending.find(item => item.id === uploadId);

      if (!upload) {
        console.warn(`[OfflineStorage] Upload not found: ${uploadId}`);
        return;
      }

      upload.retryCount++;
      if (errorMessage !== undefined) {
        upload.lastError = errorMessage;
      }

      // 최대 재시도 횟수 초과 시 실패 목록으로 이동
      if (upload.retryCount >= this.maxRetryCount) {
        await this.moveToFailed(upload);
        await this.removePendingUpload(uploadId);
      } else {
        await AsyncStorage.setItem(
          STORAGE_KEYS.PENDING_UPLOADS,
          JSON.stringify(pending)
        );
      }

      console.log(
        `[OfflineStorage] Retry count for ${uploadId}: ${upload.retryCount}`
      );
    } catch (error) {
      console.error('[OfflineStorage] Failed to increment retry count:', error);
    }
  }

  /**
   * 실패한 업로드 목록으로 이동
   */
  private async moveToFailed(upload: PendingUpload): Promise<void> {
    try {
      const failedData = await AsyncStorage.getItem(STORAGE_KEYS.FAILED_UPLOADS);
      const failed: PendingUpload[] = failedData ? JSON.parse(failedData) : [];

      failed.push(upload);
      await AsyncStorage.setItem(
        STORAGE_KEYS.FAILED_UPLOADS,
        JSON.stringify(failed)
      );

      console.log(`[OfflineStorage] Moved to failed: ${upload.id}`);
    } catch (error) {
      console.error('[OfflineStorage] Failed to move to failed list:', error);
    }
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
    try {
      const failed = await this.getFailedUploads();
      const upload = failed.find(item => item.id === uploadId);

      if (!upload) {
        console.warn(`[OfflineStorage] Failed upload not found: ${uploadId}`);
        return;
      }

      // 재시도 카운트 초기화 후 대기열로 이동
      upload.retryCount = 0;
      delete upload.lastError;

      const pending = await this.getPendingUploads();
      pending.push(upload);

      const filteredFailed = failed.filter(item => item.id !== uploadId);

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.PENDING_UPLOADS, JSON.stringify(pending)],
        [STORAGE_KEYS.FAILED_UPLOADS, JSON.stringify(filteredFailed)],
      ]);

      console.log(`[OfflineStorage] Retrying failed upload: ${uploadId}`);
    } catch (error) {
      console.error('[OfflineStorage] Failed to retry upload:', error);
    }
  }

  /**
   * 모든 대기 중인 업로드 재시도
   */
  async retryAllPendingUploads(
    uploadFn: (data: RunningRecord) => Promise<void>
  ): Promise<{ success: number; failed: number }> {
    const pending = await this.getPendingUploads();
    let successCount = 0;
    let failedCount = 0;

    for (const upload of pending) {
      try {
        await uploadFn(upload.data);
        await this.removePendingUpload(upload.id);
        successCount++;
      } catch (error: any) {
        await this.incrementRetryCount(upload.id, error.message);
        failedCount++;
      }
    }

    console.log(
      `[OfflineStorage] Retry all completed: ${successCount} success, ${failedCount} failed`
    );

    return { success: successCount, failed: failedCount };
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
        STORAGE_KEYS.FAILED_UPLOADS,
        STORAGE_KEYS.OFFLINE_MODE,
      ]);
      console.log('[OfflineStorage] Cleared all offline data');
    } catch (error) {
      console.error('[OfflineStorage] Failed to clear offline data:', error);
    }
  }
}

// Singleton export
export const offlineStorageService = OfflineStorageService.getInstance();
