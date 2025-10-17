/**
 * 위치 데이터 모델
 * Swift Location struct에서 마이그레이션
 */
export interface Location {
  latitude: number;
  longitude: number;
  timestamp: Date;
  speed: number;
  altitude: number;
  accuracy?: number; // 위치 정확도 (미터)
}

/**
 * Location 생성을 위한 팩토리 함수
 * Swift Location init과 동일
 */
export const createLocation = (data: {
  latitude: number;
  longitude: number;
  timestamp: Date;
  speed: number;
  altitude: number;
  accuracy?: number;
}): Location => ({
  latitude: data.latitude,
  longitude: data.longitude,
  timestamp: data.timestamp,
  speed: data.speed,
  altitude: data.altitude,
  ...(data.accuracy !== undefined && { accuracy: data.accuracy }),
});

/**
 * 지리 좌표계 기반 Location 생성
 * Expo Location API의 LocationObject에서 생성
 */
export const createLocationFromPosition = (position: {
  coords: {
    latitude: number;
    longitude: number;
    speed: number | null;
    altitude: number | null;
    accuracy: number | null;
  };
  timestamp: number;
}): Location => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  timestamp: new Date(position.timestamp),
  speed: position.coords.speed ?? 0,
  altitude: position.coords.altitude ?? 0,
  ...(position.coords.accuracy !== null && { accuracy: position.coords.accuracy }),
});

/**
 * 두 Location 간의 거리 계산 (Haversine formula)
 */
export const calculateDistance = (loc1: Location, loc2: Location): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (loc1.latitude * Math.PI) / 180;
  const φ2 = (loc2.latitude * Math.PI) / 180;
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Location 배열에서 총 거리 계산
 */
export const calculateTotalDistance = (locations: Location[]): number => {
  if (locations.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < locations.length; i++) {
    const prev = locations[i - 1];
    const curr = locations[i];
    if (prev && curr) {
      totalDistance += calculateDistance(prev, curr);
    }
  }

  return totalDistance;
};