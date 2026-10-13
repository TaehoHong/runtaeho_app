import type { LocationObject } from 'expo-location';
import { locationService } from '../services/LocationService';

let mockLocationCallback: (location: LocationObject) => void;
jest.mock('expo-location', () => ({
  Accuracy: { BestForNavigation: 6, High: 4, Balanced: 3 },
  getForegroundPermissionsAsync: async () => ({ granted: true }),
  watchPositionAsync: jest.fn(async (_options, callback) => {
    mockLocationCallback = callback;
    return { remove: jest.fn() };
  }),
}));

const point = (latitude: number, timestamp: number): LocationObject => ({
  coords: { latitude, longitude: 127, altitude: 0, accuracy: 1, altitudeAccuracy: 1, heading: 0, speed: 1.1 },
  timestamp,
});

afterEach(() => locationService.stopTracking());

it('preserves accumulated distance but excludes the pause-to-resume jump', async () => {
  await locationService.startTracking();
  mockLocationCallback(point(37, 1000));
  mockLocationCallback(point(37.00005, 6000));
  const beforePause = locationService.getCurrentTrackingData().totalDistance;
  expect(beforePause).toBeCloseTo(5.56, 1);
  locationService.pauseTracking();
  mockLocationCallback(point(37.00015, 16000));
  locationService.resumeTracking();
  mockLocationCallback(point(37.00015, 17000));
  expect(locationService.getCurrentTrackingData().totalDistance).toBe(beforePause);
  // Calling resume twice must not drop a new valid movement segment.
  locationService.resumeTracking();
  mockLocationCallback(point(37.00020, 22000));
  expect(locationService.getCurrentTrackingData().totalDistance).toBeCloseTo(11.12, 1);
});
