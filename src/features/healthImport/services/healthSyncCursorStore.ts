import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { isSessionCurrent, type SessionSnapshot } from '~/features/auth/stores/authStore';
import { SessionSupersededError } from '~/utils/storage/errors';

const assertOwner = (snapshot: SessionSnapshot) => {
  if (snapshot.userId == null || !isSessionCurrent(snapshot)) throw new SessionSupersededError();
};

const cursorKey = (snapshot: SessionSnapshot) => `@healthSyncCursor:v1:${Platform.OS}:${snapshot.userId}`;

// Called only inside the health-import sync queue, including reads and awaited writes.
export const healthSyncCursorStore = {
  read: async (snapshot: SessionSnapshot): Promise<string | null> => {
    assertOwner(snapshot);
    const cursor = await AsyncStorage.getItem(cursorKey(snapshot));
    assertOwner(snapshot);
    return cursor;
  },
  write: async (cursor: string, snapshot: SessionSnapshot): Promise<void> => {
    assertOwner(snapshot);
    await AsyncStorage.setItem(cursorKey(snapshot), cursor);
    assertOwner(snapshot);
  },
};
