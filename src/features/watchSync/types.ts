import type { NativeModule } from 'react-native';

export interface CompletedRunningRequest {
  schemaVersion: 1;
  sessionId: string;
  ownerUserId: number;
  source: 'APPLE_WATCH' | 'WEAR_OS';
  startTimestamp: number;
  endTimestamp: number;
  distance: number;
  durationSec: number;
  cadence: number;
  heartRate: number;
  calorie: number;
  gpsPoints: { latitude: number; longitude: number; timestampMs: number; speed: number; altitude: number; accuracy: number | null }[];
}
export interface WatchSyncNativeBridge extends NativeModule {
  setOwnerUserId(userId: string | null): Promise<void>;
  getPendingRecords(): Promise<CompletedRunningRequest[]>;
  acknowledgeRecord(sessionId: string, source: string, ownerUserId: string, runningRecordId: string): Promise<void>;
}
