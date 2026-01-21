import axios from 'axios';
import Constants from 'expo-constants';
import { API_CONFIG } from '~/services/api/config';
import type { Platform, VersionCheckResponse } from '../models/ForceUpdateState';
import { FORCE_UPDATE_CONFIG, getCurrentPlatform } from '../constants';

/**
 * 강제 업데이트 API 서비스
 */

/**
 * 현재 앱 버전 가져오기
 */
export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/**
 * 버전 체크 API 호출
 */
export async function checkVersionFromServer(
  platform: Platform = getCurrentPlatform(),
  currentVersion: string = getAppVersion()
): Promise<VersionCheckResponse> {
  const url = `${API_CONFIG.BASE_URL}/app/version-check`;

  const response = await axios.get<VersionCheckResponse>(url, {
    params: {
      platform,
      currentVersion,
    },
    timeout: FORCE_UPDATE_CONFIG.API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'x-requires-auth': 'false', // 인증 불필요
    },
  });

  return response.data;
}

/**
 * Semantic Versioning 비교
 * @returns 음수: v1 < v2, 0: v1 == v2, 양수: v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] ?? 0;
    const part2 = parts2[i] ?? 0;

    if (part1 !== part2) {
      return part1 - part2;
    }
  }

  return 0;
}

/**
 * 업데이트가 필요한지 확인
 */
export function needsUpdate(currentVersion: string, minimumVersion: string): boolean {
  return compareVersions(currentVersion, minimumVersion) < 0;
}
