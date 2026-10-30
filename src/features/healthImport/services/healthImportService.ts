import { getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';
import { SessionSupersededError } from '~/utils/storage/errors';
import { pointService } from '~/features/point/services/pointService';
import { Platform } from 'react-native';
import { queryClient, queryKeys } from '~/services/queryClient';
import { apiClient } from '~/services/api/client';
import { API_ENDPOINTS } from '~/services/api/config';
import { userConfigurationService } from '~/features/user/services/userConfigurationService';
import { getRunningRejectionCode, RunningValidationError } from '~/features/running/services/runningRejection';
import { healthImportBridge } from '../native/HealthImportBridge';
import { healthSyncCursorStore } from './healthSyncCursorStore';
import type {
  HealthImportBatchRecord,
  HealthImportBatchRequest,
  HealthImportBatchResponse,
  HealthImportConfiguration,
  HealthImportSyncResult,
  HealthRouteStatus,
  HealthRunningWorkout,
  HealthRunningWorkoutChanges,
  UpdateHealthImportConfigurationRequest,
} from '../types';

const BATCH_SIZE = 50;
const CHANGE_PAGE_SIZE = 50;
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

// The queue includes cursor storage, so an old session's delayed write finishes
// before a newer session for the same account can read or commit its cursor.
let syncTail: Promise<void> = Promise.resolve();

export class HealthImportPartialSyncError extends Error {
  constructor(readonly originalError: unknown, readonly partialResult: HealthImportSyncResult) {
    super('Health sync did not finish');
    this.name = 'HealthImportPartialSyncError';
  }
}

const emptySyncResult = (): HealthImportSyncResult => ({
  importedCount: 0, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 0,
});

const addSyncResult = (total: HealthImportSyncResult, result: HealthImportSyncResult) => {
  total.importedCount += result.importedCount;
  total.duplicateCount += result.duplicateCount;
  total.personalOnlyCount += result.personalOnlyCount;
  total.awardedPoint += result.awardedPoint;
  if (result.rejectedCount) {
    total.rejectedCount = (total.rejectedCount ?? 0) + result.rejectedCount;
    total.rejectionCodes = [...new Set([...(total.rejectionCodes ?? []), ...(result.rejectionCodes ?? [])])];
  }
};

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
    ...(workout.sourceBundleId !== undefined && { sourceBundleId: workout.sourceBundleId }),
    ...(workout.sourceAppName !== undefined && { sourceAppName: workout.sourceAppName }),
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

const isNonNegativeSafeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const validateImportAcknowledgment = (response: HealthImportBatchResponse, recordCount: number) => {
  if (!response || response.processed !== true ||
      !isNonNegativeSafeInteger(response.createdCount) ||
      !isNonNegativeSafeInteger(response.updatedCount) ||
      !isNonNegativeSafeInteger(response.duplicateCount) ||
      response.createdCount + response.updatedCount + response.duplicateCount !== recordCount ||
      !isNonNegativeSafeInteger(response.awardedPoint) ||
      (response.personalOnlyCount !== undefined &&
        (!isNonNegativeSafeInteger(response.personalOnlyCount) || response.personalOnlyCount > recordCount)) ||
      (response.leagueDistanceChanged !== undefined && typeof response.leagueDistanceChanged !== 'boolean')) {
    throw Object.assign(new Error('Health import acknowledgment is invalid'), { code: 'health_import_failed' });
  }
};

const importWorkouts = async (
  workouts: HealthRunningWorkout[],
  snapshot: SessionSnapshot,
  isolatePermanentRejections: boolean,
  result: HealthImportSyncResult
): Promise<HealthImportSyncResult> => {
  const upload = async (records: HealthImportBatchRecord[]): Promise<void> => {
    assertCurrentSession(snapshot);
    logHealthImport('import batch request', summarizeBatchRecords(records));
    let response: HealthImportBatchResponse;
    try {
      response = await healthImportService.importBatch({ records }, snapshot);
    } catch (error: unknown) {
      assertCurrentSession(snapshot);
      logHealthImport('import batch failed', { errorCode: getErrorCode(error) });
      const code = getRunningRejectionCode(error);
      // Only the existing recognized HTTP 400 validation contract is terminal.
      // A size-50 batch takes at most 99 requests to isolate every rejected record.
      if (!isolatePermanentRejections || !code || error instanceof RunningValidationError) throw error;
      if (records.length === 1) {
        addSyncResult(result, { ...emptySyncResult(), rejectedCount: 1, rejectionCodes: [code] });
        return;
      }
      const middle = Math.floor(records.length / 2);
      await upload(records.slice(0, middle));
      await upload(records.slice(middle));
      return;
    }
    assertCurrentSession(snapshot);
    if (isolatePermanentRejections) validateImportAcknowledgment(response, records.length);
    logHealthImport('import batch response', {
      createdCount: response.createdCount,
      updatedCount: response.updatedCount,
      duplicateCount: response.duplicateCount,
      leagueDistanceChanged: response.leagueDistanceChanged,
    });
    addSyncResult(result, {
      importedCount: response.createdCount + response.updatedCount,
      duplicateCount: response.duplicateCount,
      personalOnlyCount: response.personalOnlyCount ?? 0,
      awardedPoint: response.awardedPoint,
    });
    await invalidateAfterImport(response, snapshot);
  };

  for (let index = 0; index < workouts.length; index += BATCH_SIZE) {
    assertCurrentSession(snapshot);
    const records: HealthImportBatchRecord[] = [];
    for (const workout of workouts.slice(index, index + BATCH_SIZE)) {
      try {
        records.push(toBatchRecord(workout));
      } catch (error: unknown) {
        if (!isolatePermanentRejections || !(error instanceof RunningValidationError)) throw error;
        addSyncResult(result, { ...emptySyncResult(), rejectedCount: 1, rejectionCodes: [error.code] });
      }
    }
    if (records.length > 0) await upload(records);
  }

  return result;
};

const invalidChangePage = () => Object.assign(new Error('Health change page is invalid'), { code: 'health_read_failed' });

const isWorkoutShape = (value: unknown): value is HealthRunningWorkout => {
  if (!value || typeof value !== 'object') return false;
  const workout = value as Record<string, unknown>;
  return typeof workout.sourceRecordId === 'string' && workout.sourceRecordId.length > 0 &&
    ['startTimestamp', 'endTimestamp', 'distance', 'durationSec'].every((field) => typeof workout[field] === 'number') &&
    (workout.sourceBundleId == null || typeof workout.sourceBundleId === 'string') &&
    (workout.sourceAppName == null || typeof workout.sourceAppName === 'string') &&
    (workout.recordingMethod == null || (typeof workout.recordingMethod === 'string' &&
      ['RECORDED', 'MANUAL', 'UNKNOWN'].includes(workout.recordingMethod))) &&
    (workout.routeStatus == null || ROUTE_STATUSES.includes(workout.routeStatus as HealthRouteStatus)) &&
    (workout.gpsPoints == null || (Array.isArray(workout.gpsPoints) && workout.gpsPoints.every((point: unknown) => {
      if (!point || typeof point !== 'object') return false;
      const gps = point as Record<string, unknown>;
      return ['latitude', 'longitude', 'timestampMs', 'speed', 'altitude'].every((field) => typeof gps[field] === 'number');
    })));
};

const validateChangePage = (value: unknown): HealthRunningWorkoutChanges => {
  if (!value || typeof value !== 'object') throw invalidChangePage();
  const page = value as Record<string, unknown>;
  if (!Array.isArray(page.workouts) || !page.workouts.every(isWorkoutShape) ||
      !Array.isArray(page.deletedRecordIds) || !page.deletedRecordIds.every((id: unknown) => typeof id === 'string') ||
      typeof page.hasMore !== 'boolean' || typeof page.resetRequired !== 'boolean' ||
      !(page.nextCursor === null || (typeof page.nextCursor === 'string' && page.nextCursor.length > 0)) ||
      (!page.resetRequired && page.nextCursor === null)) throw invalidChangePage();
  return page as unknown as HealthRunningWorkoutChanges;
};

const syncChanges = async (snapshot: SessionSnapshot, result: HealthImportSyncResult): Promise<HealthImportSyncResult> => {
  const readChanges = healthImportBridge.readRunningWorkoutChanges;
  if (!readChanges) throw invalidChangePage();
  let cursor = await healthSyncCursorStore.read(snapshot);
  let resetAttempted = false;
  try {
    while (true) {
      assertCurrentSession(snapshot);
      const page = validateChangePage(await readChanges({ cursor, limit: CHANGE_PAGE_SIZE }));
      assertCurrentSession(snapshot);
      if (page.resetRequired) {
        if (resetAttempted) throw invalidChangePage();
        resetAttempted = true;
        // Keep the stored cursor until the fresh snapshot has uploaded successfully.
        cursor = null;
        continue;
      }
      if (page.hasMore && page.nextCursor === cursor) throw invalidChangePage();
      if (page.workouts.some((workout) => workout.routeStatus === 'readFailed')) throw invalidChangePage();
      await importWorkouts(page.workouts, snapshot, true, result);
      assertCurrentSession(snapshot);
      // Deletions are consumed without deleting existing history or rewards.
      await healthSyncCursorStore.write(page.nextCursor!, snapshot);
      cursor = page.nextCursor;
      if (!page.hasMore) return result;
    }
  } catch (error: unknown) {
    if (result.rejectedCount) throw new HealthImportPartialSyncError(error, result);
    throw error;
  }
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
    if (data?.processed === false) {
      throw Object.assign(new Error('Health import is disabled'), { code: 'health_import_disabled' });
    }
    return data;
  },

  sync: (snapshot = getSessionSnapshot()): Promise<HealthImportSyncResult> => {
    const sync = syncTail.then(async () => {
      const result = emptySyncResult();
      try {
        return await syncHealthWorkouts(snapshot, result);
      } finally {
        if (result.awardedPoint > 0 && isSessionCurrent(snapshot)) {
          // Balance reads cannot undo accepted imports or prevent cursor commits.
          await pointService.refreshUserPoint(snapshot).catch(() => {
            console.warn('[HealthImport] Point balance refresh failed');
          });
        }
      }
    });
    syncTail = sync.then(() => undefined, () => undefined);
    return sync;
  },
};

const syncHealthWorkouts = async (snapshot: SessionSnapshot, result: HealthImportSyncResult): Promise<HealthImportSyncResult> => {
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

  if (Object.prototype.hasOwnProperty.call(configuration, 'healthImportRewardCutoffTimestamp') &&
      healthImportBridge.readRunningWorkoutChanges) {
    if (snapshot.userId == null || configuration.userId !== snapshot.userId) throw new SessionSupersededError();
    return syncChanges(snapshot, result);
  }

  // Old server/native builds retain timestamp reads; delayed historical writes
  // cannot be discovered reliably until both incremental contracts are present.
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
    await importWorkouts(importableWorkouts, snapshot, false, result);
    assertCurrentSession(snapshot);
    await finalizeSync(snapshot);
    return result;
  }

  if (importableWorkouts.length === 0) {
    return { importedCount: 0, duplicateCount: 0, personalOnlyCount: 0, awardedPoint: 0 };
  }

  return importWorkouts(importableWorkouts, snapshot, false, result);
};
