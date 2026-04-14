import { calculateTotalDistance } from '~/features/running/models/Location';
import type { ShareRunningData } from '../../models/types';
import { generateDummyLocations, generateDummyShareRunningData } from '../dummyGpsData';

describe('dummyGpsData', () => {
  const baseShareData: ShareRunningData = {
    distance: 1000,
    durationSec: 300,
    pace: '05:00',
    startTimestamp: '2026-04-13T00:00:00.000Z',
    earnedPoints: 10,
    locations: [],
  };

  it('creates a Yeouido route close to 6.52km', () => {
    const locations = generateDummyLocations(Date.UTC(2026, 3, 13, 1, 0, 0));

    expect(locations).toHaveLength(29);
    expect(locations[0]).toMatchObject({
      latitude: 37.52682,
      longitude: 126.92978,
    });
    expect(locations.at(-1)).toMatchObject({
      latitude: 37.5342,
      longitude: 126.94555,
    });

    const totalDistance = calculateTotalDistance(locations);
    expect(totalDistance).toBeGreaterThan(6500);
    expect(totalDistance).toBeLessThan(6535);
    expect(locations.every((location, index, all) => (
      index === 0 || location.timestamp.getTime() > all[index - 1]!.timestamp.getTime()
    ))).toBe(true);
  });

  it('creates full dummy share data with the requested summary values', () => {
    const shareData = generateDummyShareRunningData(
      baseShareData,
      Date.UTC(2026, 3, 13, 1, 0, 0)
    );

    expect(shareData).toMatchObject({
      distance: 6520,
      durationSec: 2300,
      pace: '05:53',
      startTimestamp: baseShareData.startTimestamp,
      earnedPoints: 65,
    });
    expect(shareData.locations).toHaveLength(29);
  });
});
