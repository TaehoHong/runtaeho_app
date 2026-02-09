/**
 * Dummy GPS Data
 * 테스트용 더미 GPS 좌표 데이터 (userId=1 전용)
 *
 * 강남역 근처에서 역삼역 방향으로 약 1km 러닝 경로
 * 15개의 GPS 좌표 포인트 생성
 */

import type { Location } from '~/features/running/models';

/**
 * 강남역(37.4979, 127.0276) → 역삼역 방향 약 1km 러닝 경로
 * 실제 러닝 데이터처럼 자연스럽게 약간의 변동을 포함
 */
export const DUMMY_GPS_LOCATIONS: Location[] = [
  // 시작: 강남역 2번 출구 부근
  {
    latitude: 37.4979,
    longitude: 127.0276,
    timestamp: new Date(Date.now() - 600000), // 10분 전
    speed: 2.5,
    altitude: 25,
    accuracy: 5,
  },
  // 강남대로 북쪽으로 이동
  {
    latitude: 37.4985,
    longitude: 127.0279,
    timestamp: new Date(Date.now() - 560000),
    speed: 2.8,
    altitude: 26,
    accuracy: 4,
  },
  {
    latitude: 37.4992,
    longitude: 127.0282,
    timestamp: new Date(Date.now() - 520000),
    speed: 2.7,
    altitude: 26,
    accuracy: 5,
  },
  // 테헤란로 방향으로 우회전
  {
    latitude: 37.4998,
    longitude: 127.0288,
    timestamp: new Date(Date.now() - 480000),
    speed: 2.6,
    altitude: 27,
    accuracy: 4,
  },
  {
    latitude: 37.5004,
    longitude: 127.0296,
    timestamp: new Date(Date.now() - 440000),
    speed: 2.9,
    altitude: 27,
    accuracy: 5,
  },
  // 역삼역 방향 직진
  {
    latitude: 37.5008,
    longitude: 127.0305,
    timestamp: new Date(Date.now() - 400000),
    speed: 2.8,
    altitude: 28,
    accuracy: 4,
  },
  {
    latitude: 37.5012,
    longitude: 127.0315,
    timestamp: new Date(Date.now() - 360000),
    speed: 2.7,
    altitude: 28,
    accuracy: 5,
  },
  {
    latitude: 37.5015,
    longitude: 127.0325,
    timestamp: new Date(Date.now() - 320000),
    speed: 2.9,
    altitude: 29,
    accuracy: 4,
  },
  // 중간 지점
  {
    latitude: 37.5018,
    longitude: 127.0335,
    timestamp: new Date(Date.now() - 280000),
    speed: 2.6,
    altitude: 29,
    accuracy: 5,
  },
  {
    latitude: 37.5022,
    longitude: 127.0345,
    timestamp: new Date(Date.now() - 240000),
    speed: 2.8,
    altitude: 30,
    accuracy: 4,
  },
  // 역삼역 접근
  {
    latitude: 37.5026,
    longitude: 127.0355,
    timestamp: new Date(Date.now() - 200000),
    speed: 2.7,
    altitude: 30,
    accuracy: 5,
  },
  {
    latitude: 37.5030,
    longitude: 127.0365,
    timestamp: new Date(Date.now() - 160000),
    speed: 2.9,
    altitude: 31,
    accuracy: 4,
  },
  {
    latitude: 37.5034,
    longitude: 127.0375,
    timestamp: new Date(Date.now() - 120000),
    speed: 2.6,
    altitude: 31,
    accuracy: 5,
  },
  // 역삼역 도착 직전
  {
    latitude: 37.5038,
    longitude: 127.0385,
    timestamp: new Date(Date.now() - 80000),
    speed: 2.5,
    altitude: 32,
    accuracy: 4,
  },
  // 종료: 역삼역 3번 출구 부근
  {
    latitude: 37.5042,
    longitude: 127.0395,
    timestamp: new Date(Date.now() - 40000),
    speed: 2.3,
    altitude: 32,
    accuracy: 5,
  },
];

/**
 * 더미 GPS 데이터를 현재 시간 기준으로 재생성
 * 타임스탬프를 현재 시간 기준으로 조정
 */
export const generateDummyLocations = (): Location[] => {
  const now = Date.now();
  return DUMMY_GPS_LOCATIONS.map((loc, index) => ({
    ...loc,
    // 40초 간격으로 타임스탬프 재생성 (약 10분 러닝)
    timestamp: new Date(now - (DUMMY_GPS_LOCATIONS.length - 1 - index) * 40000),
  }));
};
