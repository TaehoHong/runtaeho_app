import type { RunningRecordItem } from '../models/RunningRecordItem';

export const toSegmentPayload = (segment: RunningRecordItem) => ({
  distance: segment.distance,
  durationSec: segment.durationSec,
  cadence: segment.cadence ?? 0,
  heartRate: segment.heartRate ?? 0,
  minHeartRate: segment.heartRate ?? 0,
  maxHeartRate: segment.heartRate ?? 0,
  orderIndex: segment.orderIndex,
  startTimeStamp: segment.startTimestamp,
  endTimeStamp: segment.endTimestamp ?? segment.startTimestamp + segment.durationSec,
  gpsPoints: (segment.locations ?? []).map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    timestampMs: point.timestamp.getTime(),
    speed: point.speed,
    altitude: point.altitude,
    ...(point.accuracy !== undefined && { accuracy: point.accuracy }),
  })),
});
