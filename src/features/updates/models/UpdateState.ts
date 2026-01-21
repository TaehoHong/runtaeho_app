/**
 * OTA 업데이트 상태를 나타내는 열거형
 */
export enum UpdateStatus {
  /** 초기 상태, 아무 작업도 진행되지 않음 */
  IDLE = 'idle',
  /** 업데이트 확인 중 */
  CHECKING = 'checking',
  /** 업데이트 사용 가능 */
  AVAILABLE = 'available',
  /** 업데이트 다운로드 중 */
  DOWNLOADING = 'downloading',
  /** 업데이트 다운로드 완료, 적용 대기 중 */
  READY = 'ready',
  /** 업데이트 확인/다운로드 중 오류 발생 */
  ERROR = 'error',
  /** 업데이트 없음 (최신 상태) */
  NO_UPDATE = 'no_update',
}

/**
 * 업데이트 매니페스트 정보
 */
export interface UpdateManifest {
  /** 업데이트 ID */
  id: string;
  /** 생성 시간 */
  createdAt: Date;
  /** 런타임 버전 */
  runtimeVersion: string;
  /** 업데이트 메시지 (선택) */
  message?: string | undefined;
}

/**
 * 업데이트 확인 결과
 */
export interface UpdateCheckResult {
  /** 업데이트 사용 가능 여부 */
  isAvailable: boolean;
  /** 업데이트 매니페스트 (있을 경우) */
  manifest?: UpdateManifest;
}

/**
 * 업데이트 다운로드 진행 정보
 */
export interface UpdateProgress {
  /** 전체 바이트 */
  totalBytes: number;
  /** 다운로드된 바이트 */
  downloadedBytes: number;
  /** 진행률 (0-100) */
  percentage: number;
}
