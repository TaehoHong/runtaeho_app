import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { tokenStorage } from '~/utils/storage';
import { resetAllAppData, waitForLogout } from '../AppResetService';

jest.mock('~/config/sentry', () => ({ clearUserContext: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(), WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
}));
const disk = new Map<string, string>();
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  disk.clear();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => disk.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { disk.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { disk.delete(key); });
  jest.mocked(GoogleSignin.signOut).mockResolvedValue(null);
  useAuthStore.setState({ isLoggedIn: true, accessToken: 'a-access', refreshToken: 'a-refresh' });
  await tokenStorage.saveTokens('a-access', 'a-refresh');
});

it('manual logout deletes actual secure keys and retains the full storage reset', async () => {
  await AsyncStorage.setItem('pending-running-data', 'owned-by-a');
  await resetAllAppData(new QueryClient());
  expect(disk.size).toBe(0);
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
  expect(useAuthStore.getState().isLoggedIn).toBe(false);
});

it('confirmed expiry clears the session but retains unsent data', async () => {
  await AsyncStorage.setItem('pending-running-data', 'owned-by-a');
  await resetAllAppData(new QueryClient(), 'auth-expired');
  expect(await AsyncStorage.getItem('pending-running-data')).toBe('owned-by-a');
  expect(await tokenStorage.loadTokens()).toEqual({ accessToken: null, refreshToken: null });
  expect(useAuthStore.getState().isLoggedIn).toBe(false);
});

it('blocks new login until old Google sign-out and deletion finish', async () => {
  let finishSignOut!: () => void;
  jest.mocked(GoogleSignin.signOut).mockReturnValue(new Promise(resolve => { finishSignOut = () => resolve(null); }));
  const logout = resetAllAppData(new QueryClient());
  let loginFinished = false;
  const login = (async () => {
    await waitForLogout();
    await tokenStorage.saveTokens('b-access', 'b-refresh');
    await AsyncStorage.setItem('auth-storage', 'b-session');
    loginFinished = true;
  })();
  await Promise.resolve();
  expect(loginFinished).toBe(false);
  finishSignOut();
  await Promise.all([logout, login]);
  expect(await tokenStorage.loadTokens()).toEqual({ accessToken: 'b-access', refreshToken: 'b-refresh' });
  expect(await AsyncStorage.getItem('auth-storage')).toBe('b-session');
});


it('retries failed cleanup before allowing a later login', async () => {
  jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('temporarily locked'));
  await expect(resetAllAppData(new QueryClient())).rejects.toThrow('Session cleanup failed');
  await expect(waitForLogout()).resolves.toBeUndefined();
  await tokenStorage.saveTokens('b-access', 'b-refresh');
  expect(await tokenStorage.loadTokens()).toEqual({ accessToken: 'b-access', refreshToken: 'b-refresh' });
});
