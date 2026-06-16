import { healthImportBridge } from '../../native/HealthImportBridge';
import { healthImportService } from '../healthImportService';
import { apiClient } from '~/services/api/client';

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('../../native/HealthImportBridge', () => ({
  healthImportBridge: {
    isAvailable: jest.fn(),
    getPermissionStatus: jest.fn(),
    readRunningWorkouts: jest.fn(),
    requestPermissions: jest.fn(),
    openHealthSettings: jest.fn(),
  },
}));

jest.mock('~/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

const mockHealthImportBridge = healthImportBridge as jest.Mocked<typeof healthImportBridge>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

const importResponse = {
  createdCount: 1,
  updatedCount: 0,
  duplicateCount: 0,
  awardedPoint: 3,
  leagueDistanceChanged: false,
};

const enabledConfiguration = {
  userId: 16,
  healthImportEnabled: true,
  healthImportLastSyncedTimestamp: 1000,
};

describe('healthImportService.sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
    mockApiClient.get.mockResolvedValue({ data: enabledConfiguration });
    mockApiClient.post.mockResolvedValue({ data: importResponse });
    mockHealthImportBridge.isAvailable.mockResolvedValue(true);
    mockHealthImportBridge.getPermissionStatus.mockResolvedValue('granted');
    mockHealthImportBridge.readRunningWorkouts.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('skips native reads and import when Android Health permission is partial', async () => {
    mockHealthImportBridge.getPermissionStatus.mockResolvedValue('partial');

    const result = await healthImportService.sync();

    expect(result).toEqual({ importedCount: 0, duplicateCount: 0, awardedPoint: 0 });
    expect(mockHealthImportBridge.readRunningWorkouts).not.toHaveBeenCalled();
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  it('reads Health workouts and imports them when Android Health permission is granted', async () => {
    mockHealthImportBridge.readRunningWorkouts.mockResolvedValue([
      {
        sourceRecordId: 'health-connect:source:run-1',
        sourceBundleId: 'source',
        startTimestamp: 1200,
        endTimestamp: 1800,
        distance: 3200,
        durationSec: 1500,
        calorie: 180,
        cadence: 170,
        heartRate: 145,
        routeStatus: 'available',
        gpsPoints: [
          {
            latitude: 37.5,
            longitude: 127.0,
            timestampMs: 1_200_000,
            speed: 0,
            altitude: 20,
            accuracy: 5,
          },
        ],
      },
    ]);

    const result = await healthImportService.sync();

    expect(mockHealthImportBridge.readRunningWorkouts).toHaveBeenCalledWith({
      startTimestamp: 1000,
      endTimestamp: 2000,
    });
    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/running/import-batch',
      {
        records: [
          expect.objectContaining({
            externalId: 'health-connect:source:run-1',
            distance: 3200,
            durationSec: 1500,
            items: [
              expect.objectContaining({
                gpsPoints: [
                  expect.objectContaining({
                    latitude: 37.5,
                    longitude: 127.0,
                  }),
                ],
              }),
            ],
          }),
        ],
      }
    );
    expect(result).toEqual({ importedCount: 1, duplicateCount: 0, awardedPoint: 3 });
  });

  it('imports route-permission-required workouts without GPS and finalizes the initial cursor', async () => {
    mockApiClient.get.mockResolvedValue({
      data: {
        ...enabledConfiguration,
        healthImportLastSyncedTimestamp: null,
      },
    });
    mockApiClient.post
      .mockResolvedValueOnce({
        data: {
          ...importResponse,
          createdCount: 2,
        },
      })
      .mockResolvedValueOnce({
        data: {
          ...importResponse,
          createdCount: 0,
          awardedPoint: 0,
        },
      });
    mockHealthImportBridge.readRunningWorkouts.mockResolvedValue([
      {
        sourceRecordId: 'health-connect:source:blocked',
        startTimestamp: 1800,
        endTimestamp: 1900,
        distance: 1000,
        durationSec: 600,
        routeStatus: 'permissionRequired',
        gpsPoints: [],
      },
      {
        sourceRecordId: 'health-connect:source:importable',
        startTimestamp: 1100,
        endTimestamp: 1200,
        distance: 800,
        durationSec: 500,
        routeStatus: 'available',
        gpsPoints: [
          {
            latitude: 37.5,
            longitude: 127.0,
            timestampMs: 1_100_000,
            speed: 0,
            altitude: 20,
          },
        ],
      },
    ]);

    const result = await healthImportService.sync();

    expect(mockApiClient.post).toHaveBeenCalledTimes(2);
    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/running/import-batch',
      {
        records: [
          expect.objectContaining({
            externalId: 'health-connect:source:importable',
            items: [
              expect.objectContaining({
                gpsPoints: [
                  expect.objectContaining({
                    latitude: 37.5,
                    longitude: 127.0,
                  }),
                ],
              }),
            ],
          }),
          expect.objectContaining({
            externalId: 'health-connect:source:blocked',
            distance: 1000,
            durationSec: 600,
            items: [],
          }),
        ],
      }
    );
    expect(mockApiClient.post).toHaveBeenCalledWith('/running/import-batch', { records: [] });
    expect(result).toEqual({ importedCount: 2, duplicateCount: 0, awardedPoint: 3 });
  });
});
