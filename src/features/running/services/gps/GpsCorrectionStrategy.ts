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

export const getGpsCorrectionStrategy = ({
  platform,
  source,
}: GpsCorrectionStrategyParams): GpsCorrectionStrategy => {
  const isBackground = source === 'background';
  const filterConfig: GpsFilterConfig = {
    ...DEFAULT_GPS_FILTER_CONFIG,
    ...(platform === 'android' && isBackground && {
      maxAccuracyMeters: 50,
      maxDeltaSeconds: 60,
    }),
  };
  const locationOptions: Location.LocationTaskOptions = {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 0,
    ...(platform === 'android' && { timeInterval: 1000, mayShowUserSettingsDialog: true }),
    ...(isBackground && {
      deferredUpdatesInterval: 1000,
      deferredUpdatesDistance: 0,
      showsBackgroundLocationIndicator: true,
    }),
    ...(platform === 'ios' && isBackground && {
      activityType: Location.ActivityType.Fitness,
      pausesUpdatesAutomatically: false,
    }),
  };

  return {
    getFilterConfig: () => ({ ...filterConfig }),
    getLocationOptions: () => ({ ...locationOptions }),
  };
};
