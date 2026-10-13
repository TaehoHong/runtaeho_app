import type { AppStateStatus } from 'react-native';
import { RunningState } from '~/stores/app/appStore';
import type { Location } from '../models';
import type { GpsFilterState } from './gps/GpsFilter';
import {
  backgroundTaskService,
  type BackgroundLocationData,
  type BackgroundPaceSignal,
} from './BackgroundTaskService';
import {
  locationService,
  type LocationTrackingData,
  type LocationPaceSignal,
} from './LocationService';

export type TrackingSource = 'idle' | 'foreground' | 'background';

export interface TrackingPaceSignal {
  timestampMs: number;
  speedMps?: number;
  accuracyMeters?: number;
  distanceDeltaMeters?: number;
}

export interface TrackingSnapshot {
  distance: number;
  locations: Location[];
  trackingData: LocationTrackingData | null;
  latestPaceSignal: TrackingPaceSignal | null;
  source: TrackingSource;
}

export interface AppStateTransitionResult {
  autoPaused: boolean;
  reason: 'background_tracking_unavailable';
}

type SnapshotListener = (snapshot: TrackingSnapshot) => void;

interface BackgroundResumeState {
  snapshot: TrackingSnapshot;
  filterState: GpsFilterState;
}

const BACKGROUND_TASK_UNAVAILABLE_MESSAGE =
  'Background tracking task is not registered while app is not active';

const EMPTY_SNAPSHOT: TrackingSnapshot = {
  distance: 0,
  locations: [],
  trackingData: null,
  latestPaceSignal: null,
  source: 'idle',
};

const toTrackingPaceSignal = (
  signal: LocationPaceSignal | BackgroundPaceSignal | null
): TrackingPaceSignal | null => {
  if (!signal) return null;

  return {
    timestampMs: signal.timestampMs,
    ...(signal.speedMps !== undefined && { speedMps: signal.speedMps }),
    ...(signal.accuracyMeters !== undefined && { accuracyMeters: signal.accuracyMeters }),
    ...(signal.distanceDeltaMeters !== undefined && {
      distanceDeltaMeters: signal.distanceDeltaMeters,
    }),
  };
};

const toBackgroundLocation = (location: Location): BackgroundLocationData => ({
  latitude: location.latitude,
  longitude: location.longitude,
  timestamp: location.timestamp.getTime(),
  speed: location.speed,
  altitude: location.altitude,
  accuracy: location.accuracy ?? 0,
});

const fromBackgroundLocation = (location: BackgroundLocationData): Location => ({
  latitude: location.latitude,
  longitude: location.longitude,
  altitude: location.altitude,
  accuracy: location.accuracy,
  speed: location.speed,
  timestamp: new Date(location.timestamp),
});

const cloneTrackingData = (trackingData: LocationTrackingData | null): LocationTrackingData | null => {
  if (!trackingData) return null;

  return {
    ...trackingData,
    currentLocation: trackingData.currentLocation ? { ...trackingData.currentLocation } : null,
  };
};

export class RunningTrackingCoordinator {
  private snapshot: TrackingSnapshot = EMPTY_SNAPSHOT;
  private listeners = new Set<SnapshotListener>();
  private currentRecordId: number | null = null;
  private runningState: RunningState = RunningState.Stopped;
  private appState: AppStateStatus = 'active';
  private source: TrackingSource = 'idle';
  private transitionInFlight = false;
  private static operations: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private executingGeneration = 0;

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = RunningTrackingCoordinator.operations.then(operation);
    RunningTrackingCoordinator.operations = result.catch(() => undefined);
    return result;
  }

  private assertCurrentOperation(): void {
    if (this.executingGeneration !== this.generation) {
      throw new Error('Tracking session superseded');
    }
  }

  private foregroundDistanceBase = 0;
  private foregroundLocationsBase: Location[] = [];
  private foregroundLiveLocations: Location[] = [];

  private readonly unsubscribeForegroundLocation: () => void;
  private readonly unsubscribeForegroundTracking: () => void;
  private readonly unsubscribeForegroundPaceSignal: () => void;

  constructor(initialAppState: AppStateStatus) {
    this.appState = initialAppState;

    this.unsubscribeForegroundLocation = locationService.subscribeToLocation((location) => {
      if (this.source !== 'foreground') return;

      this.foregroundLiveLocations.push(location);
      this.setSnapshot({
        locations: this.getForegroundCombinedLocations(),
        trackingData: this.snapshot.trackingData
          ? {
              ...this.snapshot.trackingData,
              currentLocation: location,
              accuracy: location.accuracy ?? 0,
            }
          : this.snapshot.trackingData,
      });
    });

    this.unsubscribeForegroundTracking = locationService.subscribeToTrackingData((trackingData) => {
      if (this.source !== 'foreground') return;

      const totalDistance = this.foregroundDistanceBase + trackingData.totalDistance;
      const combinedLocations = this.getForegroundCombinedLocations();
      const currentLocation =
        combinedLocations[combinedLocations.length - 1] ?? trackingData.currentLocation;

      this.setSnapshot({
        distance: totalDistance,
        locations: combinedLocations,
        trackingData: {
          ...trackingData,
          totalDistance,
          currentLocation,
          accuracy: currentLocation?.accuracy ?? trackingData.accuracy,
        },
      });
    });

    this.unsubscribeForegroundPaceSignal = locationService.subscribeToPaceSignal((paceSignal) => {
      if (this.source !== 'foreground') return;

      this.setSnapshot({
        latestPaceSignal: toTrackingPaceSignal(paceSignal),
      });
    });
  }

  destroy(): Promise<void> {
    const cleanup = this.resetSession();
    this.unsubscribeForegroundLocation();
    this.unsubscribeForegroundTracking();
    this.unsubscribeForegroundPaceSignal();
    this.listeners.clear();
    return cleanup;
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());

    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): TrackingSnapshot {
    return {
      distance: this.snapshot.distance,
      locations: [...this.snapshot.locations],
      trackingData: cloneTrackingData(this.snapshot.trackingData),
      latestPaceSignal: this.snapshot.latestPaceSignal
        ? { ...this.snapshot.latestPaceSignal }
        : null,
      source: this.snapshot.source,
    };
  }

  setRunningState(runningState: RunningState): void {
    this.runningState = runningState;
  }

  startSession(recordId: number): Promise<void> {
    const generation = ++this.generation;
    this.transitionInFlight = true;
    return this.enqueue(async () => {
      if (generation !== this.generation) throw new Error('Tracking session superseded');
      this.executingGeneration = generation;
      await this.startSessionInternal(recordId);
      if (generation !== this.generation) throw new Error('Tracking session superseded');
    });
  }

  private async startSessionInternal(recordId: number): Promise<void> {
    this.currentRecordId = recordId;
    this.runningState = RunningState.Running;
    this.source = 'idle';
    this.foregroundDistanceBase = 0;
    this.foregroundLocationsBase = [];
    this.foregroundLiveLocations = [];
    this.setSnapshot(EMPTY_SNAPSHOT);
    this.transitionInFlight = true;
    let shouldCleanupBackgroundTask = false;

    try {
      if (this.appState === 'active') {
        shouldCleanupBackgroundTask = true;
        await backgroundTaskService.startBackgroundTracking(recordId, {}, {
          shouldProcessLocations: false,
        });
        this.assertCurrentOperation();

        if (this.appState !== 'active') {
          await this.startBackgroundSource({ requireRegisteredTask: true });
          return;
        }

        try {
          await this.startForegroundSource();
        } catch (error) {
          if (this.appState !== 'active') {
            locationService.stopTracking();
            await this.startBackgroundSource({ requireRegisteredTask: true });
            return;
          }

          throw error;
        }

        if (this.appState !== 'active') {
          await this.startBackgroundSource({ requireRegisteredTask: true });
        }

        return;
      }

      await this.startBackgroundSource({ requireRegisteredTask: true });
    } catch (error) {
      try {
        if (shouldCleanupBackgroundTask) await this.cleanupBackground();
      } catch (cleanupError) {
        console.error('[RunningTrackingCoordinator] Failed to clean up startup:', cleanupError);
      } finally {
        this.resetFailedStartState();
      }
      throw error;
    } finally {
      this.transitionInFlight = false;
    }
  }

  stopSession(): Promise<{ distance: number; locations: Location[] }> {
    const generation = ++this.generation;
    return this.enqueue(async () => {
      this.executingGeneration = generation;
      return this.stopSessionInternal();
    });
  }

  private async stopSessionInternal(): Promise<{ distance: number; locations: Location[] }> {
    try {
      const hasRegisteredBackgroundTask = await backgroundTaskService.isTaskRegistered();

      if (this.source === 'background') {
        if (hasRegisteredBackgroundTask) {
          await backgroundTaskService.stopBackgroundTracking();
        }
        this.setSnapshot((await this.readBackgroundState()).snapshot, false);
      } else {
        locationService.stopTracking();
        if (hasRegisteredBackgroundTask) {
          await backgroundTaskService.stopBackgroundTracking();
        }
      }

      return {
        distance: this.snapshot.distance,
        locations: [...this.snapshot.locations],
      };
    } finally {
      this.currentRecordId = null;
      this.source = 'idle';
      this.setSnapshot({
        source: 'idle',
        trackingData: this.snapshot.trackingData
          ? {
              ...this.snapshot.trackingData,
              isTracking: false,
            }
          : this.snapshot.trackingData,
      });
    }
  }

  pauseSession(): void {
    this.runningState = RunningState.Paused;
    const generation = this.generation;
    void this.enqueue(async () => {
      if (generation !== this.generation) return;
      if (this.source === 'foreground') locationService.pauseTracking();
      else if (this.source === 'background') await backgroundTaskService.deactivateBackgroundSession();
    }).catch((error) => console.error('[RunningTrackingCoordinator] Failed to pause:', error));
  }

  resumeSession(): void {
    this.runningState = RunningState.Running;
    const generation = this.generation;
    void this.enqueue(async () => {
      if (generation !== this.generation || this.currentRecordId === null) return;
      if (this.source === 'foreground') locationService.resumeTracking();
      else if (this.source === 'background') await backgroundTaskService.activateBackgroundSession();
      else if (this.appState === 'active') await this.startForegroundSource();
      else await this.startBackgroundSource();
    }).catch((error) => console.error('[RunningTrackingCoordinator] Failed to resume:', error));
  }

  resetSession(): Promise<void> {
    const generation = ++this.generation;
    this.runningState = RunningState.Stopped;
    return this.enqueue(async () => {
      this.executingGeneration = generation;
      locationService.stopTracking();
      try {
        await this.cleanupBackground();
      } finally {
        this.resetFailedStartState();
      }
    }).catch((error) => {
      console.error('[RunningTrackingCoordinator] Failed to reset tracking:', error);
    });
  }

  private async cleanupBackground(): Promise<void> {
    try {
      await backgroundTaskService.stopBackgroundTracking();
    } finally {
      await backgroundTaskService.clearBackgroundData();
    }
  }

  async handleAppStateChange(nextAppState: AppStateStatus): Promise<AppStateTransitionResult | null> {
    // Inactive (for example Control Center) is not a request to hand off tracking.
    if (nextAppState !== 'active' && nextAppState !== 'background') return null;
    if (this.appState === nextAppState) return null;
    this.appState = nextAppState;
    const generation = this.generation;
    const wasStarting = this.transitionInFlight;
    const transition = this.enqueue(async () => {
      if (generation !== this.generation || this.currentRecordId === null) return null;
      this.executingGeneration = generation;
      let result: AppStateTransitionResult | null = null;
      let target: AppStateStatus;
      do {
        target = this.appState;
        if (target === 'background') result = await this.handleBackgroundEntry();
        else if (target === 'active') await this.handleActiveEntry();
      } while (generation === this.generation && target !== this.appState);
      return generation === this.generation ? result : null;
    });
    if (wasStarting) {
      void transition.catch((error) => {
        console.error('[RunningTrackingCoordinator] Failed to handle app state change:', error);
      });
      return null;
    }
    return transition.catch((error) => {
      if (generation !== this.generation) return null;
      throw error;
    });
  }

  private async handleBackgroundEntry(): Promise<AppStateTransitionResult | null> {
    if (this.runningState === RunningState.Running) {
      try {
        await this.startBackgroundSource();
        return null;
      } catch (error) {
        this.assertCurrentOperation();
        return this.autoPauseAfterBackgroundFailure(error);
      }
    }

    if (this.runningState === RunningState.Paused && this.source === 'foreground') {
      locationService.stopTracking();
      this.source = 'idle';
      this.setSnapshot({
        source: 'idle',
        trackingData: this.snapshot.trackingData
          ? {
              ...this.snapshot.trackingData,
              isTracking: false,
            }
          : this.snapshot.trackingData,
      });
    }

    return null;
  }

  private async handleActiveEntry(): Promise<void> {
    if (this.source !== 'background') {
      return;
    }

    const backgroundState = await this.readBackgroundState();
    this.assertCurrentOperation();
    this.setSnapshot(backgroundState.snapshot, false);

    if (this.runningState === RunningState.Running) {
      await this.startForegroundSource(backgroundState.filterState);
      return;
    }

    await backgroundTaskService.deactivateBackgroundSession();
    this.source = 'idle';
    this.setSnapshot({
      source: 'idle',
      trackingData: this.snapshot.trackingData
        ? {
            ...this.snapshot.trackingData,
            isTracking: false,
          }
        : this.snapshot.trackingData,
    });
  }

  private async startForegroundSource(filterState?: GpsFilterState): Promise<void> {
    if (this.source === 'foreground') {
      return;
    }

    this.foregroundDistanceBase = this.snapshot.distance;
    this.foregroundLocationsBase = [...this.snapshot.locations];
    this.foregroundLiveLocations = [];

    if (this.source === 'background') {
      await backgroundTaskService.deactivateBackgroundSession();
    }

    this.assertCurrentOperation();
    await locationService.startTracking({
      ...(filterState !== undefined && { filterState }),
    });
    this.assertCurrentOperation();
    this.source = 'foreground';
    this.setSnapshot({
      source: 'foreground',
    });
  }

  private async startBackgroundSource(
    { requireRegisteredTask = false }: { requireRegisteredTask?: boolean } = {}
  ): Promise<boolean> {
    if (this.source === 'background' || this.currentRecordId === null) {
      return this.source === 'background';
    }

    const isRegistered = await backgroundTaskService.isTaskRegistered();
    this.assertCurrentOperation();

    if (!isRegistered && (this.appState !== 'active' || requireRegisteredTask)) {
      throw new Error(BACKGROUND_TASK_UNAVAILABLE_MESSAGE);
    }

    const filterState = this.source === 'foreground' ? locationService.getGpsFilterState() : undefined;
    const seed = {
      totalDistance: this.snapshot.distance,
      locations: this.snapshot.locations.map(toBackgroundLocation),
      latestPaceSignal: this.snapshot.latestPaceSignal
        ? { ...this.snapshot.latestPaceSignal }
        : null,
      ...(filterState !== undefined && { filterState }),
    };

    if (this.source === 'foreground') {
      locationService.stopTracking();
    }

    if (isRegistered) {
      await backgroundTaskService.persistBackgroundTrackingState(this.currentRecordId, seed, {
        shouldProcessLocations: true,
      });
      this.assertCurrentOperation();
      await backgroundTaskService.activateBackgroundSession({ resetFilterState: false });
    } else {
      await backgroundTaskService.startBackgroundTracking(this.currentRecordId, seed);
    }

    this.assertCurrentOperation();
    this.source = 'background';
    this.setSnapshot({
      source: 'background',
    });

    return true;
  }

  private resetFailedStartState(): void {
    this.currentRecordId = null;
    this.runningState = RunningState.Stopped;
    this.source = 'idle';
    this.foregroundDistanceBase = 0;
    this.foregroundLocationsBase = [];
    this.foregroundLiveLocations = [];
    this.setSnapshot(EMPTY_SNAPSHOT);
  }

  private async autoPauseAfterBackgroundFailure(error: unknown): Promise<AppStateTransitionResult> {
    console.warn(
      '[RunningTrackingCoordinator] Auto-pausing session because background tracking is unavailable:',
      error
    );

    locationService.stopTracking();
    try {
      await this.cleanupBackground();
    } catch (cleanupError) {
      console.error('[RunningTrackingCoordinator] Failed to clean up paused session:', cleanupError);
    }

    this.runningState = RunningState.Paused;
    this.source = 'idle';
    this.setSnapshot({
      source: 'idle',
      trackingData: this.snapshot.trackingData
        ? {
            ...this.snapshot.trackingData,
            isTracking: false,
            currentSpeed: 0,
          }
        : this.snapshot.trackingData,
    });

    return {
      autoPaused: true,
      reason: 'background_tracking_unavailable',
    };
  }

  private async readBackgroundState(): Promise<BackgroundResumeState> {
    const totalDistance = await backgroundTaskService.getTotalDistance();
    const storedLocations = await backgroundTaskService.getBackgroundLocations();
    const latestPaceSignal = toTrackingPaceSignal(await backgroundTaskService.getLatestPaceSignal());
    const filterState = await backgroundTaskService.getGpsFilterState();
    const locations = storedLocations.map(fromBackgroundLocation);
    const currentLocation = locations[locations.length - 1] ?? null;
    const currentSpeed = latestPaceSignal?.speedMps
      ? latestPaceSignal.speedMps * 3.6
      : currentLocation?.speed
        ? currentLocation.speed * 3.6
        : 0;

    return {
      filterState,
      snapshot: {
        distance: totalDistance,
        locations,
        latestPaceSignal,
        trackingData: {
          currentLocation,
          totalDistance,
          currentSpeed,
          averageSpeed: this.snapshot.trackingData?.averageSpeed ?? 0,
          accuracy: currentLocation?.accuracy ?? 0,
          isTracking: this.runningState === RunningState.Running,
        },
        source: 'background',
      },
    };
  }

  private getForegroundCombinedLocations(): Location[] {
    if (this.foregroundLiveLocations.length === 0) {
      return [...this.foregroundLocationsBase];
    }

    return [...this.foregroundLocationsBase, ...this.foregroundLiveLocations];
  }

  private setSnapshot(nextSnapshot: Partial<TrackingSnapshot> | TrackingSnapshot, emit: boolean = true): void {
    if (this.executingGeneration !== this.generation) return;
    const merged: TrackingSnapshot = {
      distance:
        'distance' in nextSnapshot && nextSnapshot.distance !== undefined
          ? nextSnapshot.distance
          : this.snapshot.distance,
      locations:
        'locations' in nextSnapshot && nextSnapshot.locations !== undefined
          ? nextSnapshot.locations
          : this.snapshot.locations,
      trackingData:
        'trackingData' in nextSnapshot
          ? nextSnapshot.trackingData ?? null
          : this.snapshot.trackingData,
      latestPaceSignal:
        'latestPaceSignal' in nextSnapshot
          ? nextSnapshot.latestPaceSignal ?? null
          : this.snapshot.latestPaceSignal,
      source:
        'source' in nextSnapshot && nextSnapshot.source !== undefined
          ? nextSnapshot.source
          : this.snapshot.source,
    };

    this.snapshot = {
      distance: merged.distance,
      locations: [...merged.locations],
      trackingData: cloneTrackingData(merged.trackingData),
      latestPaceSignal: merged.latestPaceSignal ? { ...merged.latestPaceSignal } : null,
      source: merged.source,
    };

    if (!emit) {
      return;
    }

    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
