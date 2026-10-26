import { healthImportBridge } from '../../native/HealthImportBridge';
import { healthImportService } from '../healthImportService';
import { apiClient } from '~/services/api/client';
import { isSessionCurrent } from '~/features/auth/stores/authStore';
import { queryClient } from '~/services/queryClient';
import type { HealthImportBatchRequest, HealthRunningWorkout } from '../../types';

jest.mock('~/features/auth/stores/authStore', () => ({
  getSessionSnapshot: jest.fn(() => ({ generation: 1 })),
  isSessionCurrent: jest.fn(() => true),
}));

jest.mock('~/services/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn().mockResolvedValue(undefined) },
  queryKeys: {
    running: { all: ['running'] }, statistics: { all: ['statistics'] },
    healthImport: { configuration: ['healthImport'] }, league: { current: ['league'] },
    point: { all: ['point'] }, user: { all: ['user'] },
  },
}));

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
    jest.mocked(isSessionCurrent).mockReturnValue(true);
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

    expect(result).toEqual({ importedCount: 0, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 0 });
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
        durationSec: 600,
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
            durationSec: 600,
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
      },
      { sessionSnapshot: { generation: 1 } }
    );
    expect(result).toEqual({ importedCount: 1, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 3 });
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
        durationSec: 100,
        routeStatus: 'permissionRequired',
        gpsPoints: [],
      },
      {
        sourceRecordId: 'health-connect:source:importable',
        startTimestamp: 1100,
        endTimestamp: 1200,
        distance: 800,
        durationSec: 100,
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
            durationSec: 100,
            items: [],
          }),
        ],
      },
      { sessionSnapshot: { generation: 1 } }
    );
    expect(mockApiClient.post).toHaveBeenCalledWith('/running/import-batch', { records: [] }, { sessionSnapshot: { generation: 1 } });
    expect(result).toEqual({ importedCount: 2, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 3 });
  });

  it('rejects a superseded account after a deferred native read without upload or invalidation', async () => {
    let finishRead!: (workouts: HealthRunningWorkout[]) => void;
    let readStarted!: () => void;
    const started = new Promise<void>((resolve) => { readStarted = resolve; });
    mockHealthImportBridge.readRunningWorkouts.mockImplementation(() => new Promise((resolve) => {
      finishRead = resolve;
      readStarted();
    }));
    const sync = healthImportService.sync();
    await started;
    jest.mocked(isSessionCurrent).mockReturnValue(false);
    finishRead([{
      sourceRecordId: 'test:old-account', startTimestamp: 1100, endTimestamp: 1200,
      distance: 0, durationSec: 100, routeStatus: 'notAvailable', gpsPoints: [],
    }]);

    await expect(sync).rejects.toMatchObject({ name: 'SessionSupersededError' });
    expect(mockApiClient.post).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it('rejects a route read failure anywhere in the initial read before any upload or cursor finalization', async () => {
    mockApiClient.get.mockResolvedValue({ data: { ...enabledConfiguration, healthImportLastSyncedTimestamp: null } });
    mockHealthImportBridge.readRunningWorkouts.mockResolvedValue([
      { sourceRecordId: 'test:valid', startTimestamp: 1100, endTimestamp: 1200, distance: 0, durationSec: 100, routeStatus: 'notAvailable' },
      { sourceRecordId: 'test:failed', startTimestamp: 1200, endTimestamp: 1300, distance: 0, durationSec: 100, routeStatus: 'readFailed' },
    ]);

    await expect(healthImportService.sync()).rejects.toMatchObject({ code: 'health_read_failed' });
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  it('imports normal zero metrics and missing routes then finalizes an initial read', async () => {
    mockApiClient.get.mockResolvedValue({ data: { ...enabledConfiguration, healthImportLastSyncedTimestamp: null } });
    mockHealthImportBridge.readRunningWorkouts.mockResolvedValue([
      { sourceRecordId: 'test:no-data', startTimestamp: 1100, endTimestamp: 1200, distance: 0, durationSec: 100, heartRate: null, calorie: null, routeStatus: 'notAvailable' },
    ]);

    await healthImportService.sync();
    expect(mockApiClient.post).toHaveBeenCalledTimes(2);
    expect(mockApiClient.post.mock.calls[0]![1]).toEqual({ records: [expect.objectContaining({ distance: 0, heartRate: 0, calorie: 0, items: [] })] });
    expect(mockApiClient.post.mock.calls[1]![1]).toEqual({ records: [] });
  });


  it('stops later batches and initial finalization when an account changes during the first POST', async () => {
    mockApiClient.get.mockResolvedValue({ data: { ...enabledConfiguration, healthImportLastSyncedTimestamp: null } });
    mockHealthImportBridge.readRunningWorkouts.mockResolvedValue(Array.from({ length: 51 }, (_, index) => ({
      sourceRecordId: `test:run-${index}`, startTimestamp: 1100 + index, endTimestamp: 1200 + index,
      distance: 0, durationSec: 100, routeStatus: 'notAvailable',
    })));
    let finishPost!: (response: { data: typeof importResponse }) => void;
    let postStarted!: () => void;
    const started = new Promise<void>((resolve) => { postStarted = resolve; });
    mockApiClient.post.mockImplementationOnce(() => new Promise((resolve) => {
      finishPost = resolve;
      postStarted();
    }));
    const sync = healthImportService.sync();
    await started;
    jest.mocked(isSessionCurrent).mockReturnValue(false);
    finishPost({ data: importResponse });

    await expect(sync).rejects.toMatchObject({ name: 'SessionSupersededError' });
    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it('does not upload or finalize when the native metric read rejects', async () => {
    mockApiClient.get.mockResolvedValue({ data: { ...enabledConfiguration, healthImportLastSyncedTimestamp: null } });
    const nativeError = Object.assign(new Error('sensitive native diagnostic'), { code: 'health_read_failed' });
    mockHealthImportBridge.readRunningWorkouts.mockRejectedValue(nativeError);
    const logs = jest.spyOn(console, 'log').mockImplementation(() => {});

    await expect(healthImportService.sync()).rejects.toBe(nativeError);
    expect(mockApiClient.post).not.toHaveBeenCalled();
    expect(JSON.stringify(logs.mock.calls)).not.toContain('sensitive native diagnostic');
  });

  it('retains every GPS point and the existing 50 record batch boundary', async () => {
    const gpsPoints = Array.from({ length: 10001 }, (_, index) => ({
      latitude: 37.5, longitude: 127.0, timestampMs: 1100000 + index, speed: 0, altitude: 20,
    }));
    mockHealthImportBridge.readRunningWorkouts.mockResolvedValue(Array.from({ length: 51 }, (_, index) => ({
      sourceRecordId: `test:run-${index}`, startTimestamp: 1100 + index, endTimestamp: 1200 + index,
      distance: 0, durationSec: 100, routeStatus: 'available', gpsPoints: index === 0 ? gpsPoints : [],
    })));

    await healthImportService.sync();
    expect(mockApiClient.post).toHaveBeenCalledTimes(2);
    const firstRequest = mockApiClient.post.mock.calls[0]![1] as HealthImportBatchRequest;
    const secondRequest = mockApiClient.post.mock.calls[1]![1] as HealthImportBatchRequest;
    expect(firstRequest.records).toHaveLength(50);
    expect(secondRequest.records).toHaveLength(1);
    expect(firstRequest.records[0]!.items[0]!.gpsPoints).toEqual(gpsPoints);
  });

  it.each([
    { recordingMethod: 'RECORDED', expectedMethod: 'RECORDED' },
    { recordingMethod: 'MANUAL', expectedMethod: 'MANUAL' },
    { recordingMethod: 'UNKNOWN', expectedMethod: 'UNKNOWN' },
    { recordingMethod: undefined, expectedMethod: 'UNKNOWN' },
  ] as const)(
    'forwards Health recording method $recordingMethod and the writer source without inferring device identity', async ({ recordingMethod, expectedMethod }) => {
      mockHealthImportBridge.readRunningWorkouts.mockResolvedValue([{
        sourceRecordId: 'test:run', sourceBundleId: 'test.health.writer', recordingMethod,
        startTimestamp: 1100, endTimestamp: 1200, distance: 800, durationSec: 100,
      }]);

      await healthImportService.sync();

      expect(mockApiClient.post.mock.calls[0]![1]).toEqual({ records: [expect.objectContaining({
        externalId: 'test:run', sourceBundleId: 'test.health.writer', recordingMethod: expectedMethod,
      })] });
    }
  );

  it.each([
    { distance: -0.1 }, { distance: Number.NaN }, { durationSec: -1 }, { durationSec: Number.POSITIVE_INFINITY },
    { startTimestamp: -1 }, { endTimestamp: Number.NaN }, { startTimestamp: 1201 }, { durationSec: 101 },
  ])('rejects invalid required Health fields %p before upload or initial cursor finalization', async (invalidFields) => {
    mockApiClient.get.mockResolvedValue({ data: { ...enabledConfiguration, healthImportLastSyncedTimestamp: null } });
    mockHealthImportBridge.readRunningWorkouts.mockResolvedValue([{
      sourceRecordId: 'test:invalid', startTimestamp: 1100, endTimestamp: 1200,
      distance: 800, durationSec: 100, ...invalidFields,
    }]);

    await expect(healthImportService.sync()).rejects.toMatchObject({ code: 'RUNNING_INVALID_METRICS' });

    expect(mockApiClient.post).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it('floors Health timestamps and duration to seconds without rounding duration beyond the period', async () => {
    mockHealthImportBridge.readRunningWorkouts.mockResolvedValue([{
      sourceRecordId: 'test:fractional', startTimestamp: 1100.1, endTimestamp: 1200.9,
      distance: 800, durationSec: 100.7,
    }]);

    await healthImportService.sync();

    expect(mockApiClient.post.mock.calls[0]![1]).toEqual({ records: [expect.objectContaining({
      startTimestamp: 1100, endTimestamp: 1200, durationSec: 100,
    })] });
  });

  it('reports personal history imports without awarding points or refreshing reward queries', async () => {
    mockApiClient.post.mockResolvedValue({ data: {
      createdCount: 1, updatedCount: 0, duplicateCount: 0, personalOnlyCount: 1,
      awardedPoint: 0, leagueDistanceChanged: false,
    } });
    mockHealthImportBridge.readRunningWorkouts.mockResolvedValue([{
      sourceRecordId: 'test:manual', recordingMethod: 'MANUAL', startTimestamp: 1100, endTimestamp: 1200,
      distance: 800, durationSec: 100,
    }]);

    expect(await healthImportService.sync()).toEqual({
      importedCount: 1, duplicateCount: 0, personalOnlyCount: 1, awardedPoint: 0,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['running'] });
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['point'] });
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['league'] });
  });

});
