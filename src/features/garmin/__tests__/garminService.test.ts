import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { apiClient } from '~/services/api/client';
import { isSessionCurrent } from '~/features/auth/stores/authStore';
import { garminService } from '../services/garminService';

jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn(), WebBrowserResultType: { CANCEL: 'cancel' } }));
jest.mock('expo-linking', () => ({ resolveScheme: jest.fn() }));
jest.mock('~/services/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
jest.mock('~/features/auth/stores/authStore', () => ({
  getSessionSnapshot: () => ({ generation: 2, userId: 7 }), isSessionCurrent: jest.fn(() => true),
}));

const returnUrl = 'runtaeho-dev://user/activity-connection';
const state = `runtaeho-dev_${'a'.repeat(43)}`;
const authorizationUrl = `https://connect.garmin.com/oauth2Confirm?state=${state}`;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Linking.resolveScheme).mockReturnValue('runtaeho-dev');
  jest.mocked(isSessionCurrent).mockReturnValue(true);
  jest.mocked(apiClient.post).mockResolvedValue({ data: { authorizationUrl, state } });
  jest.mocked(apiClient.get).mockResolvedValue({ data: { status: 'CONNECTED', permissionGranted: true } });
  jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({ type: 'success', url: `${returnUrl}?garminResult=connected&state=${state}` });
});

it('opens Garmin and verifies the callback against authenticated server status', async () => {
  await expect(garminService.connect()).resolves.toBe('connected');
  expect(apiClient.post).toHaveBeenCalledWith('/garmin/authorization', { appScheme: 'runtaeho-dev' }, expect.objectContaining({ sessionSnapshot: { generation: 2, userId: 7 } }));
  expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(authorizationUrl, returnUrl);
  expect(apiClient.get).toHaveBeenCalledWith('/garmin/connection', expect.objectContaining({ sessionSnapshot: { generation: 2, userId: 7 } }));
});

it('uses the production app profile for authorization and browser return', async () => {
  const productionState = `app_${'b'.repeat(43)}`;
  const productionUrl = `https://connect.garmin.com/oauth2Confirm?state=${productionState}`;
  jest.mocked(Linking.resolveScheme).mockReturnValue('app');
  jest.mocked(apiClient.post).mockResolvedValue({ data: { authorizationUrl: productionUrl, state: productionState } });
  jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({ type: 'success', url: `app://user/activity-connection?garminResult=connected&state=${productionState}` });

  await expect(garminService.connect()).resolves.toBe('connected');

  expect(apiClient.post).toHaveBeenCalledWith('/garmin/authorization', { appScheme: 'app' }, expect.objectContaining({ sessionSnapshot: { generation: 2, userId: 7 } }));
  expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(productionUrl, 'app://user/activity-connection');
  expect(apiClient.get).toHaveBeenCalledWith('/garmin/connection', expect.objectContaining({ sessionSnapshot: { generation: 2, userId: 7 } }));
});

it.each(['https', 'unknown'])('rejects an unsupported app profile scheme %s', async scheme => {
  jest.mocked(Linking.resolveScheme).mockReturnValue(scheme);

  await expect(garminService.connect()).rejects.toThrow();

  expect(apiClient.post).not.toHaveBeenCalled();
  expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
});

it('rejects an authorization state bound to another app profile', async () => {
  const otherState = `app_${'a'.repeat(43)}`;
  jest.mocked(apiClient.post).mockResolvedValue({ data: { authorizationUrl: `https://connect.garmin.com/oauth2Confirm?state=${otherState}`, state: otherState } });

  await expect(garminService.connect()).rejects.toThrow();

  expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
});

it.each(['https://evil.test/oauth2Confirm', 'http://connect.garmin.com/oauth2Confirm',
  'https://connect.garmin.com.evil.test/oauth2Confirm', `https://connect.garmin.com/oauth2Confirm?state=wrong`])(
  'rejects an unexpected authorization destination %s', async url => {
    jest.mocked(apiClient.post).mockResolvedValue({ data: { authorizationUrl: url, state } });
    await expect(garminService.connect()).rejects.toThrow();
    expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
  });

it.each([`runtaeho-dev://user/other?garminResult=connected&state=${state}`,
  `https://user/activity-connection?garminResult=connected&state=${state}`,
  `app://user/activity-connection?garminResult=connected&state=${state}`,
  `${returnUrl}?garminResult=connected&state=wrong`,
  `${returnUrl}?garminResult=connected&state=${state}&state=${state}`])(
  'rejects a spoofed callback %s', async url => {
    jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({ type: 'success', url });
    await expect(garminService.connect()).rejects.toThrow();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

it('does not treat a success deep link as server authorization', async () => {
  jest.mocked(apiClient.get).mockResolvedValue({ data: { status: 'DISCONNECTED', permissionGranted: false } });
  await expect(garminService.connect()).rejects.toThrow('permission');
});

it('treats browser cancellation as a normal result', async () => {
  jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({ type: WebBrowser.WebBrowserResultType.CANCEL });
  await expect(garminService.connect()).resolves.toBe('cancelled');
  expect(apiClient.get).not.toHaveBeenCalled();
});

it('ignores a callback after the app account changes', async () => {
  jest.mocked(isSessionCurrent).mockReturnValueOnce(true).mockReturnValue(false);
  await expect(garminService.connect()).rejects.toThrow('Session superseded');
  expect(apiClient.get).not.toHaveBeenCalled();
});

it('does not open a browser after an authorization request from an old session finishes', async () => {
  jest.mocked(isSessionCurrent).mockReturnValue(false);
  await expect(garminService.connect()).rejects.toThrow('Session superseded');
  expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
});

it('does not expose disconnect results to a replacement session', async () => {
  jest.mocked(apiClient.delete).mockResolvedValue({ data: { status: 'DISCONNECTED' } });
  jest.mocked(isSessionCurrent).mockReturnValue(false);
  await expect(garminService.disconnect()).rejects.toThrow('Session superseded');
});
