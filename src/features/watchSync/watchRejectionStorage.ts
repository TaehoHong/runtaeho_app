import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSessionCurrent, type SessionSnapshot } from '~/features/auth/stores/authStore';
import { isRunningRejectionCode, type RunningRejectionCode } from '~/features/running/services/runningRejection';
import { SessionSupersededError } from '~/utils/storage/errors';
import type { CompletedRunningRequest } from './types';

type WatchIdentity = Pick<CompletedRunningRequest, 'source' | 'sessionId'>;
interface WatchRejection extends WatchIdentity { code: RunningRejectionCode }

const assertSession = (snapshot: SessionSnapshot) => {
  if (snapshot.userId === null || !isSessionCurrent(snapshot)) throw new SessionSupersededError();
};

const storageKey = (snapshot: SessionSnapshot) => `@watch_running_rejections:${snapshot.userId}`;

export const watchRecordIdentity = (record: WatchIdentity): string => `${record.source}:${record.sessionId}`;

const isRejection = (entry: unknown): entry is WatchRejection =>
  typeof entry === 'object' && entry !== null &&
  'source' in entry && (entry.source === 'APPLE_WATCH' || entry.source === 'WEAR_OS') &&
  'sessionId' in entry && typeof entry.sessionId === 'string' && entry.sessionId.length > 0 &&
  'code' in entry && isRunningRejectionCode(entry.code);

const read = async (snapshot: SessionSnapshot): Promise<WatchRejection[]> => {
  assertSession(snapshot);
  const raw = await AsyncStorage.getItem(storageKey(snapshot));
  assertSession(snapshot);
  if (raw === null) return [];
  const entries: unknown = JSON.parse(raw);
  if (Array.isArray(entries) && entries.every(isRejection)) return entries;
  throw new Error('Watch rejection index unavailable');
};

// Both operations run inside the existing phone replay lock. Each key belongs to
// one owner; the native inbox remains the only storage for the workout payload.
export const watchRejectionStorage = {
  readPending: async (records: CompletedRunningRequest[], snapshot: SessionSnapshot): Promise<Set<string>> => {
    const entries = await read(snapshot);
    const pending = new Set(records.filter(record => record.ownerUserId === snapshot.userId).map(watchRecordIdentity));
    const retained = entries.filter(entry => pending.has(watchRecordIdentity(entry)));
    if (retained.length !== entries.length) {
      assertSession(snapshot);
      await AsyncStorage.setItem(storageKey(snapshot), JSON.stringify(retained));
      assertSession(snapshot);
    }
    return new Set(retained.map(watchRecordIdentity));
  },

  add: async (record: CompletedRunningRequest, code: RunningRejectionCode, snapshot: SessionSnapshot): Promise<void> => {
    assertSession(snapshot);
    if (record.ownerUserId !== snapshot.userId) throw new SessionSupersededError();
    const entries = await read(snapshot);
    if (entries.some(entry => watchRecordIdentity(entry) === watchRecordIdentity(record))) return;
    assertSession(snapshot);
    await AsyncStorage.setItem(storageKey(snapshot), JSON.stringify([
      ...entries, { source: record.source, sessionId: record.sessionId, code },
    ]));
    assertSession(snapshot);
  },
};
