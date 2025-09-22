export interface RunningStats {
  distance: number; // meters
  duration: number; // seconds
  pace: number; // seconds per km
  calories: number;
  startTime: Date;
  endTime?: Date;
}

export interface RunningLocation {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
}

export interface RunningRecord {
  id?: string;
  stats: RunningStats;
  locations: RunningLocation[];
  isActive: boolean;
  isPaused: boolean;
}

export enum RunningState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  FINISHED = 'finished'
}