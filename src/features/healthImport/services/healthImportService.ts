import { Platform } from 'react-native';
import { queryClient, queryKeys } from '~/services/queryClient';
import { apiClient } from '~/services/api/client';
import { API_ENDPOINTS } from '~/services/api/config';
import { healthImportBridge } from '../native/HealthImportBridge';
import type {
  HealthImportBatchRecord,
  HealthImportBatchRequest,
  HealthImportBatchResponse,
  HealthImportConfiguration,
  HealthImportSyncResult,
  HealthRunningWorkout,
  UpdateHealthImportConfigurationRequest,
} from '../types';

const BATCH_SIZE = 50;

const normalizeNumber = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
};

const normalizeCadence = (value: number | null | undefined): number => {
  return Math.min(normalizeNumber(value), 255);
};

const toBatchRecord = (workout: HealthRunningWorkout): HealthImportBatchRecord => {
  const gpsPoints = workout.gpsPoints ?? [];

  return {
    externalId: workout.sourceRecordId,
    distance: normalizeNumber(workout.distance),
    durationSec: normalizeNumber(workout.durationSec),
    cadence: normalizeCadence(workout.cadence),
    heartRate: normalizeNumber(workout.heartRate),
    calorie: normalizeNumber(workout.calorie),
    startTimestamp: normalizeNumber(workout.startTimestamp),
    endTimestamp: normalizeNumber(workout.endTimestamp),
    items: gpsPoints.length > 0 ? [{
      distance: normalizeNumber(workout.distance),
      durationSec: normalizeNumber(workout.durationSec),
      cadence: normalizeCadence(workout.cadence),
      heartRate: normalizeNumber(workout.heartRate),
      minHeartRate: normalizeNumber(workout.heartRate),
      maxHeartRate: normalizeNumber(workout.heartRate),
      orderIndex: 0,
      startTimestamp: normalizeNumber(workout.startTimestamp),
      endTimestamp: normalizeNumber(workout.endTimestamp),
      gpsPoints,
    }] : [],
  };
};

const invalidateAfterImport = async (response: HealthImportBatchResponse) => {
  await queryClient.invalidateQueries({ queryKey: queryKeys.running.all });
  await queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all });
  await queryClient.invalidateQueries({ queryKey: ['runningRecords'] });
  await queryClient.invalidateQueries({ queryKey: queryKeys.healthImport.configuration });

  if (response.leagueDistanceChanged) {
    await queryClient.invalidateQueries({ queryKey: queryKeys.league.current });
  }

  if (response.awardedPoint > 0) {
    await queryClient.invalidateQueries({ queryKey: queryKeys.point.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
  }
};

const finalizeSync = async (): Promise<HealthImportSyncResult> => {
  const response = await healthImportService.importBatch({ records: [] });
  await invalidateAfterImport(response);
  return { importedCount: 0, duplicateCount: 0, awardedPoint: 0 };
};

const importWorkouts = async (
  workouts: HealthRunningWorkout[]
): Promise<HealthImportSyncResult> => {
  let importedCount = 0;
  let duplicateCount = 0;
  let awardedPoint = 0;

  if (workouts.length === 0) {
    return { importedCount: 0, duplicateCount: 0, awardedPoint: 0 };
  }

  for (let index = 0; index < workouts.length; index += BATCH_SIZE) {
    const records = workouts.slice(index, index + BATCH_SIZE).map(toBatchRecord);
    if (records.length === 0) continue;

    const response = await healthImportService.importBatch({ records });
    importedCount += response.createdCount + response.updatedCount;
    duplicateCount += response.duplicateCount;
    awardedPoint += response.awardedPoint;
    await invalidateAfterImport(response);
  }

  return { importedCount, duplicateCount, awardedPoint };
};

export const healthImportService = {
  getConfiguration: async (): Promise<HealthImportConfiguration> => {
    const { data } = await apiClient.get<HealthImportConfiguration>(API_ENDPOINTS.USER.CONFIGURATION);
    return data;
  },

  setHealthImportEnabled: async (enabled: boolean): Promise<HealthImportConfiguration> => {
    const request: UpdateHealthImportConfigurationRequest = { healthImportEnabled: enabled };
    const { data } = await apiClient.patch<HealthImportConfiguration>(API_ENDPOINTS.USER.CONFIGURATION, request);
    await queryClient.invalidateQueries({ queryKey: queryKeys.healthImport.configuration });
    return data;
  },

  importBatch: async (request: HealthImportBatchRequest): Promise<HealthImportBatchResponse> => {
    const { data } = await apiClient.post<HealthImportBatchResponse>(API_ENDPOINTS.RUNNING.IMPORT_BATCH, request);
    return data;
  },

  sync: async (): Promise<HealthImportSyncResult> => {
    const configuration = await healthImportService.getConfiguration();
    if (!configuration.healthImportEnabled) {
      return { importedCount: 0, duplicateCount: 0, awardedPoint: 0 };
    }

    const available = await healthImportBridge.isAvailable();
    if (!available) {
      return { importedCount: 0, duplicateCount: 0, awardedPoint: 0 };
    }

    const permission = Platform.OS === 'android'
      ? await healthImportBridge.getPermissionStatus()
      : 'granted';
    if (permission !== 'granted') {
      return { importedCount: 0, duplicateCount: 0, awardedPoint: 0 };
    }

    const nowTimestamp = Math.floor(Date.now() / 1000);
    const startTimestamp = configuration.healthImportLastSyncedTimestamp ?? 0;
    const workouts = await healthImportBridge.readRunningWorkouts({
      startTimestamp,
      endTimestamp: nowTimestamp,
    });

    if (configuration.healthImportLastSyncedTimestamp == null) {
      const result = await importWorkouts(workouts);
      await finalizeSync();
      return result;
    }

    if (workouts.length === 0) {
      return { importedCount: 0, duplicateCount: 0, awardedPoint: 0 };
    }

    return importWorkouts(workouts);
  },
};
