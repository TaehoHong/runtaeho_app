/**
 * Dummy GPS Data
 * 테스트용 더미 공유 데이터 (userId=1 전용)
 *
 * 여의도 한강공원 근처를 도는 약 6.52km 러닝 경로
 */

import type { Location } from '~/features/running/models';
import type { ShareRunningData } from '../models/types';

const DUMMY_SHARE_DISTANCE_METERS = 6520;
const DUMMY_SHARE_DURATION_SEC = 38 * 60 + 20;
const DUMMY_SHARE_PACE = '05:53';
const DUMMY_SHARE_EARNED_POINTS = Math.floor(DUMMY_SHARE_DISTANCE_METERS / 100);

/**
 * 여의도 한강공원 근처를 한 바퀴 반 정도 도는 더미 경로
 * 실제 러닝 데이터처럼 자연스럽게 약간의 변동을 포함
 */
export const DUMMY_GPS_LOCATIONS: Location[] = [
  {
    latitude: 37.52682,
    longitude: 126.92978,
    timestamp: new Date(0),
    speed: 2.7,
    altitude: 9,
    accuracy: 4,
  },
  {
    latitude: 37.52695,
    longitude: 126.9321,
    timestamp: new Date(0),
    speed: 2.8,
    altitude: 9,
    accuracy: 4,
  },
  {
    latitude: 37.52718,
    longitude: 126.9346,
    timestamp: new Date(0),
    speed: 2.9,
    altitude: 10,
    accuracy: 5,
  },
  {
    latitude: 37.52762,
    longitude: 126.93745,
    timestamp: new Date(0),
    speed: 2.8,
    altitude: 10,
    accuracy: 4,
  },
  {
    latitude: 37.52805,
    longitude: 126.94035,
    timestamp: new Date(0),
    speed: 2.9,
    altitude: 10,
    accuracy: 5,
  },
  {
    latitude: 37.52862,
    longitude: 126.9431,
    timestamp: new Date(0),
    speed: 3,
    altitude: 10,
    accuracy: 4,
  },
  {
    latitude: 37.52968,
    longitude: 126.9456,
    timestamp: new Date(0),
    speed: 2.9,
    altitude: 11,
    accuracy: 4,
  },
  {
    latitude: 37.53105,
    longitude: 126.9472,
    timestamp: new Date(0),
    speed: 2.8,
    altitude: 11,
    accuracy: 5,
  },
  {
    latitude: 37.53255,
    longitude: 126.94755,
    timestamp: new Date(0),
    speed: 2.7,
    altitude: 12,
    accuracy: 4,
  },
  {
    latitude: 37.53375,
    longitude: 126.94585,
    timestamp: new Date(0),
    speed: 2.7,
    altitude: 12,
    accuracy: 5,
  },
  {
    latitude: 37.53418,
    longitude: 126.94295,
    timestamp: new Date(0),
    speed: 2.8,
    altitude: 13,
    accuracy: 4,
  },
  {
    latitude: 37.5341,
    longitude: 126.93975,
    timestamp: new Date(0),
    speed: 2.6,
    altitude: 13,
    accuracy: 5,
  },
  {
    latitude: 37.53368,
    longitude: 126.93645,
    timestamp: new Date(0),
    speed: 2.7,
    altitude: 12,
    accuracy: 4,
  },
  {
    latitude: 37.53295,
    longitude: 126.9333,
    timestamp: new Date(0),
    speed: 2.8,
    altitude: 12,
    accuracy: 5,
  },
  {
    latitude: 37.5318,
    longitude: 126.93095,
    timestamp: new Date(0),
    speed: 2.9,
    altitude: 11,
    accuracy: 4,
  },
  {
    latitude: 37.52995,
    longitude: 126.92945,
    timestamp: new Date(0),
    speed: 2.7,
    altitude: 10,
    accuracy: 5,
  },
  {
    latitude: 37.52815,
    longitude: 126.92895,
    timestamp: new Date(0),
    speed: 2.6,
    altitude: 9,
    accuracy: 4,
  },
  {
    latitude: 37.52682,
    longitude: 126.92978,
    timestamp: new Date(0),
    speed: 2.7,
    altitude: 9,
    accuracy: 5,
  },
  {
    latitude: 37.52695,
    longitude: 126.9321,
    timestamp: new Date(0),
    speed: 2.8,
    altitude: 9,
    accuracy: 4,
  },
  {
    latitude: 37.52718,
    longitude: 126.9346,
    timestamp: new Date(0),
    speed: 2.9,
    altitude: 10,
    accuracy: 5,
  },
  {
    latitude: 37.52762,
    longitude: 126.93745,
    timestamp: new Date(0),
    speed: 2.8,
    altitude: 10,
    accuracy: 4,
  },
  {
    latitude: 37.52805,
    longitude: 126.94035,
    timestamp: new Date(0),
    speed: 2.9,
    altitude: 10,
    accuracy: 5,
  },
  {
    latitude: 37.52862,
    longitude: 126.9431,
    timestamp: new Date(0),
    speed: 3,
    altitude: 10,
    accuracy: 4,
  },
  {
    latitude: 37.52968,
    longitude: 126.9456,
    timestamp: new Date(0),
    speed: 2.9,
    altitude: 11,
    accuracy: 5,
  },
  {
    latitude: 37.53105,
    longitude: 126.9472,
    timestamp: new Date(0),
    speed: 2.8,
    altitude: 11,
    accuracy: 4,
  },
  {
    latitude: 37.53255,
    longitude: 126.94755,
    timestamp: new Date(0),
    speed: 2.7,
    altitude: 12,
    accuracy: 5,
  },
  {
    latitude: 37.53375,
    longitude: 126.94585,
    timestamp: new Date(0),
    speed: 2.7,
    altitude: 12,
    accuracy: 4,
  },
  {
    latitude: 37.53418,
    longitude: 126.94295,
    timestamp: new Date(0),
    speed: 2.8,
    altitude: 13,
    accuracy: 5,
  },
  {
    latitude: 37.5342,
    longitude: 126.94555,
    timestamp: new Date(0),
    speed: 2.6,
    altitude: 13,
    accuracy: 5,
  },
];

/**
 * 더미 GPS 데이터를 현재 시간 기준으로 재생성
 */
export const generateDummyLocations = (endTime = Date.now()): Location[] => {
  const intervalMs = Math.round(
    (DUMMY_SHARE_DURATION_SEC * 1000) / Math.max(DUMMY_GPS_LOCATIONS.length - 1, 1)
  );

  return DUMMY_GPS_LOCATIONS.map((loc, index) => ({
    ...loc,
    timestamp: new Date(endTime - (DUMMY_GPS_LOCATIONS.length - 1 - index) * intervalMs),
  }));
};

export const generateDummyShareRunningData = (
  baseData?: ShareRunningData,
  endTime = Date.now()
): ShareRunningData => ({
  distance: DUMMY_SHARE_DISTANCE_METERS,
  durationSec: DUMMY_SHARE_DURATION_SEC,
  pace: DUMMY_SHARE_PACE,
  startTimestamp:
    baseData?.startTimestamp ?? new Date(endTime - DUMMY_SHARE_DURATION_SEC * 1000).toISOString(),
  earnedPoints: DUMMY_SHARE_EARNED_POINTS,
  locations: generateDummyLocations(endTime),
});
