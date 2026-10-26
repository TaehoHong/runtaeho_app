import * as WebBrowser from 'expo-web-browser';
import { apiClient } from '~/services/api/client';
import { isSessionCurrent } from '~/features/auth/stores/authStore';
import { garminService, GARMIN_RETURN_URL } from '../services/garminService';

jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn(), WebBrowserResultType: { CANCEL: 'cancel' } }));
jest.mock('~/services/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
jest.mock('~/features/auth/stores/authStore', () => ({
  getSessionSnapshot: () => ({ generation: 2, userId: 7 }), isSessionCurrent: jest.fn(() => true),
}));

const state = 'a'.repeat(43);
const authorizationUrl = `https://connect.garmin.com/oauth2Confirm?state=${state}`;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(isSessionCurrent).mockReturnValue(true);
  jest.mocked(apiClient.post).mockResolvedValue({ data: { authorizationUrl, state } });
  jest.mocked(apiClient.get).mockResolvedValue({ data: { status: 'CONNECTED', permissionGranted: true } });
  jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({ type: 'success', url: `${GARMIN_RETURN_URL}?garminResult=connected&state=${state}` });
});

it('opens Garmin and verifies the callback against authenticated server status', async () => {
  await expect(garminService.connect()).resolves.toBe('connected');
  expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(authorizationUrl, GARMIN_RETURN_URL);
  expect(apiClient.get).toHaveBeenCalledWith('/garmin/connection', expect.objectContaining({ sessionSnapshot: { generation: 2, userId: 7 } }));
});

it.each(['https://evil.test/oauth2Confirm', 'http://connect.garmin.com/oauth2Confirm',
  'https://connect.garmin.com.evil.test/oauth2Confirm', `https://connect.garmin.com/oauth2Confirm?state=wrong`])(
  'rejects an unexpected authorization destination %s', async url => {
    jest.mocked(apiClient.post).mockResolvedValue({ data: { authorizationUrl: url, state } });
    await expect(garminService.connect()).rejects.toThrow();
    expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
  });

it.each([`runtaeho://user/other?garminResult=connected&state=${state}`,
  `https://user/activity-connection?garminResult=connected&state=${state}`,
  `${GARMIN_RETURN_URL}?garminResult=connected&state=wrong`,
  `${GARMIN_RETURN_URL}?garminResult=connected&state=${state}&state=${state}`])(
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
