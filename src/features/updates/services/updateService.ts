import * as Updates from 'expo-updates';
import { UpdateCheckResult, UpdateManifest, UpdateProgress } from '../models/UpdateState';

/**
 * expo-updates가 활성화되어 있는지 확인
 * Development 빌드(expo-dev-client)에서는 비활성화됨
 */
export function isUpdatesEnabled(): boolean {
  // __DEV__는 개발 모드에서 true
  // Updates.isEnabled는 expo-updates가 활성화되어 있을 때 true
  return !__DEV__ && Updates.isEnabled;
}

/**
 * Manifest에서 UpdateManifest를 추출하는 헬퍼 함수
 */
function extractManifestInfo(manifest: unknown): UpdateManifest | null {
  if (!manifest || typeof manifest !== 'object') {
    return null;
  }

  const m = manifest as Record<string, unknown>;

  // ExpoUpdatesManifest 타입 체크 (id와 createdAt가 있는지)
  if (typeof m.id === 'string' && typeof m.createdAt === 'string') {
    const extra = m.extra as Record<string, unknown> | undefined;
    const expoClient = extra?.expoClient as Record<string, unknown> | undefined;
    const message = expoClient?.message;

    return {
      id: m.id,
      createdAt: new Date(m.createdAt),
      runtimeVersion: typeof m.runtimeVersion === 'string' ? m.runtimeVersion : 'unknown',
      message: typeof message === 'string' ? message : undefined,
    };
  }

  return null;
}

/**
 * 업데이트 확인
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!isUpdatesEnabled()) {
    console.log('[Updates] Updates not enabled in development mode');
    return { isAvailable: false };
  }

  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable && update.manifest) {
      const manifest = extractManifestInfo(update.manifest);

      if (manifest) {
        return {
          isAvailable: true,
          manifest,
        };
      }
    }

    return { isAvailable: false };
  } catch (error) {
    console.error('[Updates] Check for update failed:', error);
    throw error;
  }
}

/**
 * 업데이트 다운로드
 * @param onProgress 진행률 콜백 (선택)
 */
export async function downloadUpdate(
  onProgress?: (progress: UpdateProgress) => void
): Promise<void> {
  if (!isUpdatesEnabled()) {
    console.log('[Updates] Updates not enabled in development mode');
    return;
  }

  try {
    // expo-updates에서는 다운로드 진행률을 제공하지 않음
    // 시작과 완료만 알 수 있으므로 0%와 100%만 콜백
    if (onProgress) {
      onProgress({ totalBytes: 0, downloadedBytes: 0, percentage: 0 });
    }

    await Updates.fetchUpdateAsync();

    if (onProgress) {
      onProgress({ totalBytes: 100, downloadedBytes: 100, percentage: 100 });
    }
  } catch (error) {
    console.error('[Updates] Download update failed:', error);
    throw error;
  }
}

/**
 * 다운로드된 업데이트 적용 (앱 재시작)
 */
export async function applyUpdate(): Promise<void> {
  if (!isUpdatesEnabled()) {
    console.log('[Updates] Updates not enabled in development mode');
    return;
  }

  try {
    await Updates.reloadAsync();
  } catch (error) {
    console.error('[Updates] Apply update failed:', error);
    throw error;
  }
}

/**
 * 현재 실행 중인 업데이트 정보 가져오기
 */
export function getCurrentUpdate(): UpdateManifest | null {
  if (!isUpdatesEnabled()) {
    return null;
  }

  const manifest = Updates.manifest;
  if (!manifest) {
    return null;
  }

  return extractManifestInfo(manifest);
}

/**
 * 업데이트 채널 정보 가져오기
 */
export function getUpdateChannel(): string | null {
  if (!isUpdatesEnabled()) {
    return null;
  }

  return Updates.channel ?? null;
}

/**
 * 런타임 버전 가져오기
 */
export function getRuntimeVersion(): string | null {
  if (!isUpdatesEnabled()) {
    return null;
  }

  return Updates.runtimeVersion ?? null;
}
