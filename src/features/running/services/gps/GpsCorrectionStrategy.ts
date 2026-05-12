import * as Location from 'expo-location';
import type { PlatformOSType } from 'react-native';
import { DEFAULT_GPS_FILTER_CONFIG, type GpsFilterConfig } from './GpsFilter';

export type GpsTrackingSource = 'foreground' | 'background';

export interface GpsCorrectionStrategy {
  getFilterConfig: () => GpsFilterConfig;
  getLocationOptions: () => Location.LocationTaskOptions;
}

export interface GpsCorrectionStrategyParams {
  platform: PlatformOSType;
  source: GpsTrackingSource;
}

const DEFAULT_FOREGROUND_LOCATION_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000,
  distanceInterval: 5,
};

const DEFAULT_BACKGROUND_LOCATION_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 2000,
  distanceInterval: 5,
  deferredUpdatesInterval: 2000,
  deferredUpdatesDistance: 5,
  showsBackgroundLocationIndicator: true,
};

const ANDROID_BACKGROUND_FILTER_CONFIG: GpsFilterConfig = {
  ...DEFAULT_GPS_FILTER_CONFIG,
  maxAccuracyMeters: 50,
  maxDeltaSeconds: 60,
};

const ANDROID_BACKGROUND_LOCATION_OPTIONS: Location.LocationTaskOptions = {
  ...DEFAULT_BACKGROUND_LOCATION_OPTIONS,
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000,
  mayShowUserSettingsDialog: true,
  deferredUpdatesInterval: 1000,
};

const cloneFilterConfig = (config: GpsFilterConfig): GpsFilterConfig => ({ ...config });

const cloneLocationOptions = (
  options: Location.LocationTaskOptions
): Location.LocationTaskOptions => ({ ...options });

const createStrategy = (
  filterConfig: GpsFilterConfig,
  locationOptions: Location.LocationTaskOptions
): GpsCorrectionStrategy => ({
  getFilterConfig: () => cloneFilterConfig(filterConfig),
  getLocationOptions: () => cloneLocationOptions(locationOptions),
});

export const getGpsCorrectionStrategy = ({
  platform,
  source,
}: GpsCorrectionStrategyParams): GpsCorrectionStrategy => {
  if (platform === 'android' && source === 'background') {
    return createStrategy(ANDROID_BACKGROUND_FILTER_CONFIG, ANDROID_BACKGROUND_LOCATION_OPTIONS);
  }

  const locationOptions =
    source === 'background'
      ? DEFAULT_BACKGROUND_LOCATION_OPTIONS
      : DEFAULT_FOREGROUND_LOCATION_OPTIONS;

  return createStrategy(DEFAULT_GPS_FILTER_CONFIG, locationOptions);
};
