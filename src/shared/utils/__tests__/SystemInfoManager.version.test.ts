import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { systemInfoManager } from '../SystemInfoManager';
import { getAppVersion } from '~/features/forceUpdate/services/forceUpdateService';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: {} },
}));

const originalPlatform = Platform.OS;

afterEach(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
});

it.each([
  ['ios', '1.12.2'],
  ['android', '1.13.0'],
])('uses %s version for app information and update checks', (platform, expected) => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
  Constants.expoConfig = {
    name: 'test', slug: 'test', version: '9.9.0',
    ios: { version: '1.12.2' }, android: { version: '1.13.0' },
  };
  expect(systemInfoManager.getAppVersion()).toBe(expected);
  expect(getAppVersion()).toBe(expected);
});

it('keeps older OTA manifests working when platform versions are absent', () => {
  Constants.expoConfig = { name: 'test', slug: 'test', version: '1.12.2' };
  expect(systemInfoManager.getAppVersion()).toBe('1.12.2');
  expect(getAppVersion()).toBe('1.12.2');
});
