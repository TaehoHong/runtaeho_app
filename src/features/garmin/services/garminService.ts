import * as WebBrowser from 'expo-web-browser';
import type { ActivityConnection } from '~/features/activity-connection/types';
import { apiClient } from '~/services/api/client';
import { getSessionSnapshot, isSessionCurrent, type SessionSnapshot } from '~/features/auth/stores/authStore';
import { SessionSupersededError } from '~/utils/storage/errors';

export interface GarminConnection extends ActivityConnection {
  connectedAt: string | null;
  lastReceivedAt: string | null;
  lastImportedAt: string | null;
  lastImportedCount: number;
  permissionGranted: boolean;
}

interface GarminAuthorization {
  authorizationUrl: string;
  state: string;
  expiresAt: string;
}

export const GARMIN_RETURN_URL = 'runtaeho://user/activity-connection';

function assertSession(snapshot: SessionSnapshot): void {
  if (!isSessionCurrent(snapshot)) throw new SessionSupersededError();
}

async function connection(snapshot: SessionSnapshot, signal?: AbortSignal): Promise<GarminConnection> {
  const { data } = await apiClient.get<GarminConnection>('/garmin/connection', { sessionSnapshot: snapshot, ...(signal ? { signal } : {}) });
  assertSession(snapshot);
  return data;
}

export const garminService = {
  connection(signal?: AbortSignal): Promise<GarminConnection> {
    return connection(getSessionSnapshot(), signal);
  },

  async connect(): Promise<'connected' | 'cancelled'> {
    const snapshot = getSessionSnapshot();
    const { data } = await apiClient.post<GarminAuthorization>('/garmin/authorization', null, { sessionSnapshot: snapshot });
    assertSession(snapshot);
    const authorization = new URL(data.authorizationUrl);
    if (authorization.origin !== 'https://connect.garmin.com' || authorization.pathname !== '/oauth2Confirm' ||
        authorization.username || authorization.password || authorization.hash ||
        !/^[A-Za-z0-9_-]{43}$/.test(data.state) || authorization.searchParams.get('state') !== data.state) {
      throw new Error('Invalid Garmin authorization');
    }
    const result = await WebBrowser.openAuthSessionAsync(data.authorizationUrl, GARMIN_RETURN_URL);
    assertSession(snapshot);
    if (result.type === 'cancel' || result.type === 'dismiss') return 'cancelled';
    if (result.type !== 'success') throw new Error('Garmin authorization failed');
    const returned = new URL(result.url);
    if (returned.protocol !== 'runtaeho:' || returned.hostname !== 'user' ||
        returned.pathname !== '/activity-connection' || returned.username || returned.password || returned.port || returned.hash ||
        returned.searchParams.getAll('state').length !== 1 || returned.searchParams.get('state') !== data.state ||
        returned.searchParams.getAll('garminResult').length !== 1) {
      throw new Error('Invalid Garmin callback');
    }
    const outcome = returned.searchParams.get('garminResult');
    if (outcome === 'cancelled') return 'cancelled';
    if (outcome !== 'connected') throw new Error('Garmin authorization failed');
    // A deep link is untrusted; the authenticated server remains the source of connection status.
    const verified = await connection(snapshot);
    if (verified.status !== 'CONNECTED' || !verified.permissionGranted) throw new Error('Garmin permission required');
    return 'connected';
  },

  async disconnect(): Promise<GarminConnection> {
    const snapshot = getSessionSnapshot();
    const { data } = await apiClient.delete<GarminConnection>('/garmin/connection', { sessionSnapshot: snapshot });
    assertSession(snapshot);
    return data;
  },
};
