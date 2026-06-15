import type { Location } from '~/features/running/models';
import type { RunningRecordItemResponse } from '~/features/running/services/runningService';

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface RouteRegion extends RouteCoordinate {
  latitudeDelta: number;
  longitudeDelta: number;
}

const MIN_DELTA = 0.01;
const REGION_PADDING_RATIO = 1.4;

export const normalizeRouteLocations = (source: Location[]): Location[] => {
  const validLocations = source
    .filter((point) =>
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude) &&
      point.timestamp instanceof Date &&
      Number.isFinite(point.timestamp.getTime())
    )
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const deduplicated: Location[] = [];
  for (const location of validLocations) {
    const prev = deduplicated[deduplicated.length - 1];
    if (
      prev &&
      prev.latitude === location.latitude &&
      prev.longitude === location.longitude &&
      prev.timestamp.getTime() === location.timestamp.getTime()
    ) {
      continue;
    }
    deduplicated.push(location);
  }

  return deduplicated;
};

export const runningRecordItemsToLocations = (
  items: RunningRecordItemResponse[]
): Location[] =>
  normalizeRouteLocations(
    items.flatMap((item) =>
      (item.gpsPoints ?? []).map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: new Date(point.timestampMs),
        speed: point.speed,
        altitude: point.altitude,
        ...(point.accuracy !== undefined && { accuracy: point.accuracy }),
      }))
    )
  );

export const hasRenderableRoute = (locations: Location[]): boolean =>
  normalizeRouteLocations(locations).length >= 2;

export const getRouteCoordinates = (locations: Location[]): RouteCoordinate[] =>
  normalizeRouteLocations(locations).map((location) => ({
    latitude: location.latitude,
    longitude: location.longitude,
  }));

export const getRouteRegion = (locations: Location[]): RouteRegion | null => {
  const coordinates = getRouteCoordinates(locations);
  if (coordinates.length < 2) {
    return null;
  }

  let minLatitude = Infinity;
  let maxLatitude = -Infinity;
  let minLongitude = Infinity;
  let maxLongitude = -Infinity;

  for (const coordinate of coordinates) {
    minLatitude = Math.min(minLatitude, coordinate.latitude);
    maxLatitude = Math.max(maxLatitude, coordinate.latitude);
    minLongitude = Math.min(minLongitude, coordinate.longitude);
    maxLongitude = Math.max(maxLongitude, coordinate.longitude);
  }

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * REGION_PADDING_RATIO, MIN_DELTA),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * REGION_PADDING_RATIO, MIN_DELTA),
  };
};
