import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage, secureStorage } from '../index';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(), getItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
}));
const disk = new Map<string, string>();
const accessKey = 'com.runtaeho.app.accessToken';
const refreshKey = 'com.runtaeho.app.refreshToken';

beforeEach(async () => {
  jest.clearAllMocks();
  disk.clear();
  await AsyncStorage.clear();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => disk.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { disk.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { disk.delete(key); });
});

it('does not write plaintext when secure saving fails', async () => {
  jest.mocked(SecureStore.setItemAsync).mockRejectedValue(new Error('locked'));
  await expect(secureStorage.save('accessToken', 'synthetic-secret')).rejects.toThrow();
  expect(await AsyncStorage.getItem('secure_fallback_accessToken')).toBeNull();
});

it('does not return legacy plaintext when secure migration fails', async () => {
  await AsyncStorage.setItem('secure_fallback_accessToken', 'legacy-secret');
  jest.mocked(SecureStore.setItemAsync).mockRejectedValue(new Error('locked'));
  await expect(secureStorage.load('accessToken')).rejects.toThrow();
});

it('restores both legacy keys after a partial pair write fails', async () => {
  disk.set(accessKey, 'old-access'); disk.set(refreshKey, 'old-refresh');
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    if (value === 'new-refresh') throw new Error('write failed');
    disk.set(key, value);
  });
  await expect(tokenStorage.saveTokens('new-access', 'new-refresh')).rejects.toThrow();
  expect(await tokenStorage.loadTokens()).toEqual({ accessToken: 'old-access', refreshToken: 'old-refresh' });
});

it('finishes stale rollback before allowing the new account write', async () => {
  disk.set(accessKey, 'old-access'); disk.set(refreshKey, 'old-refresh');
  let release!: () => void;
  let entered!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    if (value === 'a-refresh') { entered(); await blocked; }
    disk.set(key, value);
  });
  let current = true;
  const a = tokenStorage.saveTokens('a-access', 'a-refresh', { isCurrent: () => current });
  const rejection = expect(a).rejects.toThrow('Session superseded');
  await started;
  current = false;
  const b = tokenStorage.saveTokens('b-access', 'b-refresh');
  release();
  await rejection;
  await b;
  expect(await tokenStorage.loadTokens()).toEqual({ accessToken: 'b-access', refreshToken: 'b-refresh' });
});
