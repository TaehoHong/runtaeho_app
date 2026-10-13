import { normalizeRouteLocations } from '../routeLocations';
import { normalizeRouteLocations as compatibleNormalize } from '~/features/share/utils/routeLocations';

describe('running route owner', () => {
  it('keeps the legacy export and normalizes snapshots without mutating the producer array', () => {
    const first = { latitude: 1, longitude: 2, timestamp: new Date(1000), speed: 0, altitude: 0 };
    const last = { ...first, latitude: 2, timestamp: new Date(2000) };
    const invalid = { ...first, latitude: NaN };
    const source = [last, first, { ...first }, invalid];
    expect(compatibleNormalize).toBe(normalizeRouteLocations);
    expect(normalizeRouteLocations(source)).toEqual([first, last]);
    expect(source).toEqual([last, first, { ...first }, invalid]);
  });
});
