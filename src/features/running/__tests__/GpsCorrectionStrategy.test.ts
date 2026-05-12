import * as Location from 'expo-location';
import { DEFAULT_GPS_FILTER_CONFIG } from '~/features/running/services/gps/GpsFilter';
import { getGpsCorrectionStrategy } from '~/features/running/services/gps/GpsCorrectionStrategy';

jest.mock('expo-location', () => ({
  __esModule: true,
  Accuracy: {
    BestForNavigation: 'bestForNavigation',
    High: 'high',
  },
}));

describe('GpsCorrectionStrategy', () => {
  it('keeps the default filter config for iOS foreground and background', () => {
    expect(
      getGpsCorrectionStrategy({ platform: 'ios', source: 'foreground' }).getFilterConfig()
    ).toEqual(DEFAULT_GPS_FILTER_CONFIG);
    expect(
      getGpsCorrectionStrategy({ platform: 'ios', source: 'background' }).getFilterConfig()
    ).toEqual(DEFAULT_GPS_FILTER_CONFIG);
  });

  it('keeps the default filter config for Android foreground', () => {
    expect(
      getGpsCorrectionStrategy({ platform: 'android', source: 'foreground' }).getFilterConfig()
    ).toEqual(DEFAULT_GPS_FILTER_CONFIG);
  });

  it('relaxes only Android background gap and accuracy rejection thresholds', () => {
    const config = getGpsCorrectionStrategy({
      platform: 'android',
      source: 'background',
    }).getFilterConfig();

    expect(config).toEqual({
      ...DEFAULT_GPS_FILTER_CONFIG,
      maxAccuracyMeters: 50,
      maxDeltaSeconds: 60,
    });
  });

  it('uses Android background collection options without changing iOS defaults', () => {
    const androidOptions = getGpsCorrectionStrategy({
      platform: 'android',
      source: 'background',
    }).getLocationOptions();
    const iosOptions = getGpsCorrectionStrategy({
      platform: 'ios',
      source: 'background',
    }).getLocationOptions();

    expect(androidOptions).toEqual(
      expect.objectContaining({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 5,
        deferredUpdatesInterval: 1000,
        deferredUpdatesDistance: 5,
        mayShowUserSettingsDialog: true,
      })
    );
    expect(iosOptions).toEqual(
      expect.objectContaining({
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 5,
        deferredUpdatesInterval: 2000,
        deferredUpdatesDistance: 5,
      })
    );
  });
});
