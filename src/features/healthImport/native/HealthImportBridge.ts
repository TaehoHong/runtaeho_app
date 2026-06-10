import { NativeModules, Platform } from 'react-native';
import type { HealthPermissionStatus, HealthRunningWorkout } from '../types';

interface HealthImportBridge {
  isAvailable(): Promise<boolean>;
  getPermissionStatus(): Promise<HealthPermissionStatus>;
  requestPermissions(options: { includeHistory: boolean; includeRoute: boolean }): Promise<HealthPermissionStatus>;
  readRunningWorkouts(params: {
    startTimestamp: number;
    endTimestamp: number;
    limit?: number;
  }): Promise<HealthRunningWorkout[]>;
  openHealthSettings(): Promise<void>;
}

const nativeBridge = NativeModules.RNHealthImportBridge as HealthImportBridge | undefined;

export const healthImportBridge: HealthImportBridge = {
  isAvailable: async () => {
    if (!nativeBridge || Platform.OS === 'web') return false;
    return nativeBridge.isAvailable();
  },

  getPermissionStatus: async () => {
    if (!nativeBridge || Platform.OS === 'web') return 'unavailable';
    return nativeBridge.getPermissionStatus();
  },

  requestPermissions: async (options) => {
    if (!nativeBridge || Platform.OS === 'web') return 'unavailable';
    return nativeBridge.requestPermissions(options);
  },

  readRunningWorkouts: async (params) => {
    if (!nativeBridge || Platform.OS === 'web') return [];
    return nativeBridge.readRunningWorkouts(params);
  },

  openHealthSettings: async () => {
    if (!nativeBridge || Platform.OS === 'web') return;
    return nativeBridge.openHealthSettings();
  },
};
