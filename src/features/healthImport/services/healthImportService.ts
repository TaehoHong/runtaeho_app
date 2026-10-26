import { getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';
import { SessionSupersededError } from '~/utils/storage/errors';
import { Platform } from 'react-native';
import { queryClient, queryKeys } from '~/services/queryClient';
import { apiClient } from '~/services/api/client';
import { API_ENDPOINTS } from '~/services/api/config';
import { userConfigurationService } from '~/features/user/services/userConfigurationService';
import { getRunningRejectionCode, RunningValidationError } from '~/features/running/services/runningRejection';
import { healthImportBridge } from '../native/HealthImportBridge';
import type {
  HealthImportBatchRecord,
  HealthImportBatchRequest,
  HealthImportBatchResponse,
  HealthImportConfiguration,
  HealthImportSyncResult,
  HealthRouteStatus,
  HealthRunningWorkout,
  UpdateHealthImportConfigurationRequest,
} from '../types';

const BATCH_SIZE = 50;
const ROUTE_STATUSES: HealthRouteStatus[] = ['available', 'notAvailable', 'permissionRequired', 'readFailed'];

const logHealthImport = (message: string, data?: Record<string, unknown>) => {
  if (!__DEV__) return;

  if (data) {
    console.log(`[HealthImport] ${message}`, data);
    return;
  }
  console.log(`[HealthImport] ${message}`);
};

type SessionSnapshot = ReturnType<typeof getSessionSnapshot>;

const assertCurrentSession = (snapshot: SessionSnapshot) => {
  if (!isSessionCurrent(snapshot)) throw new SessionSupersededError();
};

const getErrorCode = (error: unknown): string => {
  if (error instanceof SessionSupersededError) return 'session_superseded';
  return getRunningRejectionCode(error) ?? 'health_import_failed';
};

const normalizeNumber = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
};

const normalizeCadence = (value: number | null | undefined): number => {
  return Math.min(normalizeNumber(value), 255);
};

const getGpsPoints = (workout: HealthRunningWorkout) => workout.gpsPoints ?? [];

const summarizeWorkouts = (workouts: HealthRunningWorkout[]) => {
  const routeStatusCounts = ROUTE_STATUSES.reduce<Record<HealthRouteStatus | 'unknown', number>>(
    (accumulator, status) => {
      accumulator[status] = 0;
      return accumulator;
    },
    { unknown: 0 } as Record<HealthRouteStatus | 'unknown', number>
  );
  let workoutsWithGps = 0;
  let totalGpsPoints = 0;

  workouts.forEach((workout) => {
    const gpsPoints = getGpsPoints(workout);
    if (gpsPoints.length > 0) workoutsWithGps += 1;
    totalGpsPoints += gpsPoints.length;
    routeStatusCounts[workout.routeStatus ?? 'unknown'] += 1;
  });

  return {
    workoutCount: workouts.length,
    workoutsWithGps,
    totalGpsPoints,
    routeStatusCounts,
  };
};

const summarizeBatchRecords = (records: HealthImportBatchRecord[]) => ({
  recordCount: records.length,
  recordsWithItems: records.filter((record) => record.items.length > 0).length,
  totalGpsPoints: records.reduce(
    (total, record) => total + record.items.reduce(
      (itemTotal, item) => itemTotal + item.gpsPoints.length,
      0
    ),
    0
  ),
});

const sortWorkoutsForCursor = (workouts: HealthRunningWorkout[]): HealthRunningWorkout[] =>
  [...workouts].sort((left, right) => {
    const endDiff = left.endTimestamp - right.endTimestamp;
    if (endDiff !== 0) return endDiff;
    return left.startTimestamp - right.startTimestamp;
  });

const toBatchRecord = (workout: HealthRunningWorkout): HealthImportBatchRecord => {
  const gpsPoints = getGpsPoints(workout);
  const requiredValues = [workout.distance, workout.durationSec, workout.startTimestamp, workout.endTimestamp];
  if (requiredValues.some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0) ||
      workout.endTimestamp < workout.startTimestamp ||
      workout.durationSec > workout.endTimestamp - workout.startTimestamp ||
      (workout.distance > 0 && workout.durationSec <= 0)) {
    throw new RunningValidationError('RUNNING_INVALID_METRICS');
  }
  const distance = Math.round(workout.distance);
  const durationSec = Math.floor(workout.durationSec);
  const startTimestamp = Math.floor(workout.startTimestamp);
  const endTimestamp = Math.floor(workout.endTimestamp);
  if (distance > 0 && durationSec === 0) throw new RunningValidationError('RUNNING_INVALID_METRICS');

  return {
    externalId: workout.sourceRecordId,
    sourceBundleId: workout.sourceBundleId,
    recordingMethod: workout.recordingMethod ?? 'UNKNOWN',
    distance,
    durationSec,
    cadence: normalizeCadence(workout.cadence),
    heartRate: normalizeNumber(workout.heartRate),
    calorie: normalizeNumber(workout.calorie),
    startTimestamp,
    endTimestamp,
    items: gpsPoints.length > 0 ? [{
      distance,
      durationSec,
      cadence: normalizeCadence(workout.cadence),
      heartRate: normalizeNumber(workout.heartRate),
      minHeartRate: normalizeNumber(workout.heartRate),
      maxHeartRate: normalizeNumber(workout.heartRate),
      orderIndex: 0,
      startTimestamp,
      endTimestamp,
      gpsPoints,
    }] : [],
  };
};

const invalidateAfterImport = async (response: HealthImportBatchResponse, snapshot: SessionSnapshot) => {
  assertCurrentSession(snapshot);
  await queryClient.invalidateQueries({ queryKey: queryKeys.running.all });
  assertCurrentSession(snapshot);
  await queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all });
  assertCurrentSession(snapshot);
  await queryClient.invalidateQueries({ queryKey: ['runningRecords'] });
  assertCurrentSession(snapshot);
  await queryClient.invalidateQueries({ queryKey: queryKeys.healthImport.configuration });

  if (response.leagueDistanceChanged) {
    assertCurrentSession(snapshot);
    await queryClient.invalidateQueries({ queryKey: queryKeys.league.current });
  }

  if (response.awardedPoint > 0) {
    assertCurrentSession(snapshot);
    await queryClient.invalidateQueries({ queryKey: queryKeys.point.all });
    assertCurrentSession(snapshot);
    await queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    assertCurrentSession(snapshot);
  }
  assertCurrentSession(snapshot);
};

const finalizeSync = async (snapshot: SessionSnapshot): Promise<HealthImportSyncResult> => {
  assertCurrentSession(snapshot);
  logHealthImport('finalize sync cursor');
  const response = await healthImportService.importBatch({ records: [] }, snapshot);
  await invalidateAfterImport(response, snapshot);
  return { importedCount: 0, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 0 };
};

const importWorkouts = async (
  workouts: HealthRunningWorkout[],
  snapshot: SessionSnapshot
): Promise<HealthImportSyncResult> => {
  let importedCount = 0;
  let duplicateCount = 0;
  let personalOnlyCount = 0;
  let awardedPoint = 0;

  if (workouts.length === 0) {
    return { importedCount: 0, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 0 };
  }

  for (let index = 0; index < workouts.length; index += BATCH_SIZE) {
    assertCurrentSession(snapshot);
    const records = workouts.slice(index, index + BATCH_SIZE).map(toBatchRecord);
    if (records.length === 0) continue;

    logHealthImport('import batch request', summarizeBatchRecords(records));
    const response = await healthImportService.importBatch({ records }, snapshot).catch((error: unknown) => {
      logHealthImport('import batch failed', { errorCode: getErrorCode(error) });
      throw error;
    });
    assertCurrentSession(snapshot);
    logHealthImport('import batch response', {
      createdCount: response.createdCount,
      updatedCount: response.updatedCount,
      duplicateCount: response.duplicateCount,
      leagueDistanceChanged: response.leagueDistanceChanged,
    });
    importedCount += response.createdCount + response.updatedCount;
    duplicateCount += response.duplicateCount;
    personalOnlyCount += response.personalOnlyCount ?? 0;
    awardedPoint += response.awardedPoint;
    await invalidateAfterImport(response, snapshot);
  }

  return { importedCount, duplicateCount, personalOnlyCount, awardedPoint };
};

export const healthImportService = {
  getConfiguration: async (snapshot = getSessionSnapshot()): Promise<HealthImportConfiguration> => {
    assertCurrentSession(snapshot);
    const configuration = await userConfigurationService.get(undefined, snapshot);
    assertCurrentSession(snapshot);
    return configuration;
  },

  setHealthImportEnabled: async (enabled: boolean, snapshot = getSessionSnapshot()): Promise<HealthImportConfiguration> => {
    assertCurrentSession(snapshot);
    const request: UpdateHealthImportConfigurationRequest = { healthImportEnabled: enabled };
    const data = await userConfigurationService.update(request, undefined, snapshot);
    assertCurrentSession(snapshot);
    await queryClient.invalidateQueries({ queryKey: queryKeys.healthImport.configuration });
    assertCurrentSession(snapshot);
    return data;
  },

  importBatch: async (request: HealthImportBatchRequest, snapshot = getSessionSnapshot()): Promise<HealthImportBatchResponse> => {
    assertCurrentSession(snapshot);
    const { data } = await apiClient.post<HealthImportBatchResponse>(API_ENDPOINTS.RUNNING.IMPORT_BATCH, request, { sessionSnapshot: snapshot });
    assertCurrentSession(snapshot);
    return data;
  },

  sync: async (snapshot = getSessionSnapshot()): Promise<HealthImportSyncResult> => {
    assertCurrentSession(snapshot);
    const configuration = await healthImportService.getConfiguration(snapshot);
    assertCurrentSession(snapshot);
    logHealthImport('sync start', {
      platform: Platform.OS,
      enabled: configuration.healthImportEnabled,
      hasLastSyncedTimestamp: configuration.healthImportLastSyncedTimestamp != null,
    });
    if (!configuration.healthImportEnabled) {
      logHealthImport('sync skipped: disabled');
      return { importedCount: 0, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 0 };
    }

    const available = await healthImportBridge.isAvailable();
    assertCurrentSession(snapshot);
    logHealthImport('native availability checked', { available });
    if (!available) {
      logHealthImport('sync skipped: health unavailable');
      return { importedCount: 0, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 0 };
    }

    const permission = Platform.OS === 'android'
      ? await healthImportBridge.getPermissionStatus()
      : 'granted';
    assertCurrentSession(snapshot);
    logHealthImport('permission checked', { permission });
    if (permission !== 'granted') {
      logHealthImport('sync skipped: permission not granted', { permission });
      return { importedCount: 0, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 0 };
    }

    const nowTimestamp = Math.floor(Date.now() / 1000);
    const startTimestamp = configuration.healthImportLastSyncedTimestamp ?? 0;
    const workouts = await healthImportBridge.readRunningWorkouts({
      startTimestamp,
      endTimestamp: nowTimestamp,
    }).catch((error: unknown) => {
      logHealthImport('native workouts read failed', { errorCode: getErrorCode(error) });
      throw error;
    });
    assertCurrentSession(snapshot);
    if (workouts.some((workout) => workout.routeStatus === 'readFailed')) {
      throw Object.assign(new Error('Health workout read failed'), { code: 'health_read_failed' });
    }
    logHealthImport('native workouts read', summarizeWorkouts(workouts));
    const importableWorkouts = sortWorkoutsForCursor(workouts);
    logHealthImport('importable workouts selected', {
      importableCount: importableWorkouts.length,
      workoutsWithoutGps: importableWorkouts.filter((workout) => getGpsPoints(workout).length === 0).length,
    });

    if (configuration.healthImportLastSyncedTimestamp == null) {
      const result = await importWorkouts(importableWorkouts, snapshot);
      assertCurrentSession(snapshot);
      await finalizeSync(snapshot);
      return result;
    }

    if (importableWorkouts.length === 0) {
      return { importedCount: 0, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 0 };
    }

    return importWorkouts(importableWorkouts, snapshot);
  },
};
