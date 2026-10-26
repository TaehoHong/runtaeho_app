export type HealthPermissionStatus = 'unavailable' | 'notDetermined' | 'granted' | 'denied' | 'partial';

export interface HealthGpsPoint {
  latitude: number;
  longitude: number;
  timestampMs: number;
  speed: number;
  altitude: number;
  accuracy?: number | null;
}

export type HealthRouteStatus = 'available' | 'notAvailable' | 'permissionRequired' | 'readFailed';
export type HealthRecordingMethod = 'RECORDED' | 'MANUAL' | 'UNKNOWN';

export interface HealthRunningWorkout {
  sourceRecordId: string;
  sourceBundleId?: string | null;
  recordingMethod?: HealthRecordingMethod;
  startTimestamp: number;
  endTimestamp: number;
  distance: number;
  durationSec: number;
  calorie?: number | null;
  cadence?: number | null;
  heartRate?: number | null;
  gpsPoints?: HealthGpsPoint[];
  routeStatus?: HealthRouteStatus;
}

export type { UserConfiguration as HealthImportConfiguration } from '~/features/user/models/UserConfiguration';

export interface UpdateHealthImportConfigurationRequest {
  healthImportEnabled: boolean;
}

export interface HealthImportBatchRecord {
  externalId: string;
  sourceBundleId?: string | null;
  recordingMethod?: HealthRecordingMethod;
  distance: number;
  durationSec: number;
  cadence: number;
  heartRate: number;
  calorie: number;
  startTimestamp: number;
  endTimestamp: number;
  items: HealthImportBatchItem[];
}

export interface HealthImportBatchItem {
  distance: number;
  durationSec: number;
  cadence: number;
  heartRate: number;
  minHeartRate: number;
  maxHeartRate: number;
  orderIndex: number;
  startTimestamp: number;
  endTimestamp: number;
  gpsPoints: HealthGpsPoint[];
}

export interface HealthImportBatchRequest {
  records: HealthImportBatchRecord[];
}

export interface HealthImportBatchResponse {
  createdCount: number;
  updatedCount: number;
  duplicateCount: number;
  personalOnlyCount?: number;
  awardedPoint: number;
  leagueDistanceChanged: boolean;
}

export interface HealthImportSyncResult {
  importedCount: number;
  duplicateCount: number;
  personalOnlyCount: number;
  awardedPoint: number;
}
