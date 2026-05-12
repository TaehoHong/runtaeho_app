import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import {
  BACKGROUND_LOCATION_TASK,
  backgroundTaskService,
  processBackgroundLocationTask,
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
    BestForNavigation: 'bestForNavigation',
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

const metersToLatitude = (meters: number): number => meters / 111_111;

describe('BackgroundTaskService permissions', () => {
  const originalPlatformOS = Platform.OS;
  let consoleLogSpy: jest.SpyInstance | null = null;

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
    consoleLogSpy?.mockRestore();
    consoleLogSpy = null;
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
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 5,
        deferredUpdatesInterval: 1000,
        deferredUpdatesDistance: 5,
        mayShowUserSettingsDialog: true,
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

  it('BGTASK-GPS-001 uses Android background correction without logging coordinates', async () => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    asyncStorageMock.getItem.mockImplementation(async (key) => {
      switch (key) {
        case '@running_session':
          return JSON.stringify({
            runningRecordId: 201,
            startTime: 1_740_000_000_000,
            shouldProcessLocations: true,
            totalDistance: 0,
            locationCount: 0,
          });
        case '@background_locations':
          return JSON.stringify([]);
        case '@gps_filter_state':
          return null;
        default:
          return null;
      }
    });

    const firstTimestamp = 1_740_000_000_000;
    const firstLatitude = 37.5;
    const secondLatitude = firstLatitude + metersToLatitude(80);

    await processBackgroundLocationTask({
      data: {
        locations: [
          {
            coords: {
              latitude: firstLatitude,
              longitude: 127.0,
              speed: 2,
              altitude: 0,
              accuracy: 35,
            },
            timestamp: firstTimestamp,
          },
          {
            coords: {
              latitude: secondLatitude,
              longitude: 127.0,
              speed: 2,
              altitude: 0,
              accuracy: 35,
            },
            timestamp: firstTimestamp + 40_000,
          },
        ],
      },
    });

    const multiSetCalls = asyncStorageMock.multiSet.mock.calls;
    const multiSetCall = multiSetCalls[multiSetCalls.length - 1];
    expect(multiSetCall).toBeDefined();
    const totalDistanceEntry = multiSetCall?.[0].find(([key]) => key === '@total_distance');
    expect(Number(totalDistanceEntry?.[1])).toBeGreaterThan(75);

    const summaryCall = consoleLogSpy.mock.calls.find(
      ([message]) => message === '[BackgroundTask] Android GPS filter summary:'
    );
    expect(summaryCall?.[1]).toEqual({
      acceptedCount: 1,
      acceptedDistanceMeters: expect.any(Number),
      rejected: {},
    });
    expect(JSON.stringify(summaryCall)).not.toContain(String(firstLatitude));
    expect(JSON.stringify(summaryCall)).not.toContain('127');
  });
});
