import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import {
  BACKGROUND_LOCATION_TASK,
  backgroundTaskService,
} from '~/features/running/services/BackgroundTaskService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiSet: jest.fn(),
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('expo-task-manager', () => ({
  __esModule: true,
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(),
}));

jest.mock('expo-location', () => ({
  __esModule: true,
  Accuracy: {
    High: 'high',
  },
  getForegroundPermissionsAsync: jest.fn(),
  getBackgroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
}));

const asyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const taskManagerMock = TaskManager as jest.Mocked<typeof TaskManager>;
const locationMock = Location as jest.Mocked<typeof Location>;

describe('BackgroundTaskService permissions', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

    asyncStorageMock.multiSet.mockResolvedValue(undefined);
    taskManagerMock.isTaskRegisteredAsync.mockResolvedValue(false);
    locationMock.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    } as never);
    locationMock.getBackgroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    } as never);
    locationMock.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    } as never);
    locationMock.requestBackgroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    } as never);
    locationMock.startLocationUpdatesAsync.mockResolvedValue(undefined as never);
    locationMock.stopLocationUpdatesAsync.mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOS,
    });
  });

  it('BGTASK-PERM-001 uses existing permissions without opening Android permission requests again', async () => {
    await backgroundTaskService.startBackgroundTracking(101);

    expect(locationMock.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(locationMock.getBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(locationMock.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(locationMock.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    expect(taskManagerMock.isTaskRegisteredAsync).toHaveBeenCalledWith(BACKGROUND_LOCATION_TASK);
    expect(locationMock.startLocationUpdatesAsync).toHaveBeenCalledWith(
      BACKGROUND_LOCATION_TASK,
      expect.objectContaining({
        foregroundService: expect.objectContaining({
          notificationTitle: 'RunTaeho 러닝 추적 중',
        }),
      })
    );
  });

  it('BGTASK-PERM-002 fails fast when foreground permission is missing', async () => {
    locationMock.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: true,
      expires: 'never',
    } as never);

    await expect(backgroundTaskService.startBackgroundTracking(102)).rejects.toThrow(
      'Foreground location permission required'
    );

    expect(locationMock.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(locationMock.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    expect(locationMock.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });
});
