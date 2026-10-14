import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';
import { permissionManager } from '~/services/PermissionManager';

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  getForegroundPermissionsAsync: jest.fn(),
  getBackgroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
}));

jest.mock('expo-sensors', () => ({
  Pedometer: {
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
  },
}));

const locationMock = jest.mocked(Location);
const pedometerMock = jest.mocked(Pedometer);
const granted = { status: Location.PermissionStatus.GRANTED, granted: true, canAskAgain: true, expires: 'never' } as const;
const denied = { ...granted, status: Location.PermissionStatus.DENIED, granted: false } as const;

describe.each(['ios', 'android'] as const)('While-in-use permissions on %s', (platform) => {
  const originalPlatform = Platform.OS;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
    locationMock.getForegroundPermissionsAsync.mockResolvedValue(granted);
    locationMock.requestForegroundPermissionsAsync.mockResolvedValue(granted);
    locationMock.getBackgroundPermissionsAsync.mockResolvedValue(denied);
    locationMock.requestBackgroundPermissionsAsync.mockResolvedValue(denied);
    pedometerMock.getPermissionsAsync.mockResolvedValue(granted);
    pedometerMock.requestPermissionsAsync.mockResolvedValue(granted);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it('completes the initial request with only while-in-use location and motion', async () => {
    expect(await permissionManager.hasCompletedInitialRequest()).toBe(false);
    const result = await permissionManager.requestAllPermissions();
    expect(result).toEqual({ success: true, granted: { location: true, motion: true } });
    expect(locationMock.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(pedometerMock.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(locationMock.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    expect(await permissionManager.hasCompletedInitialRequest()).toBe(true);
  });

  it('allows running and shows no missing permission with while-in-use location and motion', async () => {
    const result = await permissionManager.checkRequiredPermissions();
    expect(result.canStartRunning).toBe(true);
    expect(result.hasAllPermissions).toBe(true);
    expect(permissionManager.getMissingPermissionsMessage(result)).toBe('');
    expect(locationMock.getBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('still blocks running when location is denied', async () => {
    locationMock.getForegroundPermissionsAsync.mockResolvedValue(denied);
    const result = await permissionManager.checkRequiredPermissions();
    expect(result.canStartRunning).toBe(false);
    expect(permissionManager.getMissingPermissionsMessage(result)).toContain('위치 (사용 중)');
    expect(permissionManager.getMissingPermissionsMessage(result)).not.toContain('항상');
  });

  it('still blocks running when motion is denied', async () => {
    pedometerMock.getPermissionsAsync.mockResolvedValue(denied);
    const result = await permissionManager.checkRequiredPermissions();
    expect(result.canStartRunning).toBe(false);
    expect(permissionManager.getMissingPermissionsMessage(result)).toContain('동작 및 피트니스');
  });
});
