export type HealthPermissionStatus = 'unavailable' | 'notDetermined' | 'granted' | 'denied' | 'partial';

export interface HealthGpsPoint {
  latitude: number;
  longitude: number;
  timestampMs: number;
  speed: number;
  altitude: number;
  accuracy?: number | null;
}

export interface HealthRunningWorkout {
  sourceRecordId: string;
  sourceBundleId?: string | null;
  startTimestamp: number;
  endTimestamp: number;
  distance: number;
  durationSec: number;
  calorie?: number | null;
  cadence?: number | null;
  heartRate?: number | null;
  gpsPoints?: HealthGpsPoint[];
}

export interface HealthImportConfiguration {
  userId: number;
  healthImportEnabled: boolean;
  healthImportLastSyncedTimestamp: number | null;
}

export interface UpdateHealthImportConfigurationRequest {
  healthImportEnabled: boolean;
}

export interface HealthImportBatchRecord {
  externalId: string;
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
  awardedPoint: number;
  leagueDistanceChanged: boolean;
}

export interface HealthImportSyncResult {
  importedCount: number;
  duplicateCount: number;
  awardedPoint: number;
}
