// import { useState, useCallback } from 'react'; // TODO: 향후 Hook 변환시 사용
import { RunningStats, RunningLocation, RunningRecord, RunningState } from '../models/running-types';

export class RunningViewModel {
  private listeners: Array<() => void> = [];
  private _state: RunningState = RunningState.IDLE;
  private _currentRecord: RunningRecord | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _startTime: Date | null = null;
  private _pausedTime: number = 0;

  constructor() {
    this._currentRecord = this.createEmptyRecord();
  }

  get state(): RunningState {
    return this._state;
  }

  get currentRecord(): RunningRecord | null {
    return this._currentRecord;
  }

  get stats(): RunningStats | null {
    return this._currentRecord?.stats || null;
  }

  private createEmptyRecord(): RunningRecord {
    return {
      stats: {
        distance: 0,
        duration: 0,
        pace: 0,
        calories: 0,
        startTime: new Date()
      },
      locations: [],
      isActive: false,
      isPaused: false
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  addListener(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  startRunning(): void {
    if (this._state !== RunningState.IDLE && this._state !== RunningState.PAUSED) {
      return;
    }

    this._state = RunningState.RUNNING;
    this._startTime = new Date();

    if (this._currentRecord) {
      this._currentRecord.isActive = true;
      this._currentRecord.isPaused = false;
      this._currentRecord.stats.startTime = this._startTime;
    }

    this.startTimer();
    this.notifyListeners();
  }

  pauseRunning(): void {
    if (this._state !== RunningState.RUNNING) {
      return;
    }

    this._state = RunningState.PAUSED;

    if (this._currentRecord) {
      this._currentRecord.isPaused = true;
    }

    this.stopTimer();
    this.notifyListeners();
  }

  resumeRunning(): void {
    if (this._state !== RunningState.PAUSED) {
      return;
    }

    this._state = RunningState.RUNNING;

    if (this._currentRecord) {
      this._currentRecord.isPaused = false;
    }

    this.startTimer();
    this.notifyListeners();
  }

  stopRunning(): void {
    if (this._state === RunningState.IDLE || this._state === RunningState.FINISHED) {
      return;
    }

    this._state = RunningState.FINISHED;

    if (this._currentRecord) {
      this._currentRecord.isActive = false;
      this._currentRecord.isPaused = false;
      this._currentRecord.stats.endTime = new Date();
    }

    this.stopTimer();
    this.notifyListeners();
  }

  resetRunning(): void {
    this._state = RunningState.IDLE;
    this._currentRecord = this.createEmptyRecord();
    this._startTime = null;
    this._pausedTime = 0;
    this.stopTimer();
    this.notifyListeners();
  }

  private startTimer(): void {
    this.stopTimer();
    this._timer = setInterval(() => {
      if (this._currentRecord && this._startTime) {
        const now = new Date();
        const elapsed = (now.getTime() - this._startTime.getTime()) / 1000 - this._pausedTime;
        this._currentRecord.stats.duration = Math.max(0, elapsed);
        this.calculatePace();
        this.notifyListeners();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  private calculatePace(): void {
    if (this._currentRecord && this._currentRecord.stats.distance > 0) {
      const distanceKm = this._currentRecord.stats.distance / 1000;
      const durationMinutes = this._currentRecord.stats.duration / 60;
      this._currentRecord.stats.pace = durationMinutes / distanceKm * 60; // seconds per km
    }
  }

  addLocation(location: RunningLocation): void {
    if (!this._currentRecord) {
      return;
    }

    this._currentRecord.locations.push(location);

    // Calculate distance if we have previous location
    if (this._currentRecord.locations.length > 1) {
      const previousLocation = this._currentRecord.locations[this._currentRecord.locations.length - 2];
      const distance = this.calculateDistance(previousLocation, location);
      this._currentRecord.stats.distance += distance;
      this.calculatePace();
      this.calculateCalories();
    }

    this.notifyListeners();
  }

  private calculateDistance(from: RunningLocation, to: RunningLocation): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(from.latitude)) * Math.cos(this.toRadians(to.latitude)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateCalories(): void {
    if (this._currentRecord) {
      // Simple calorie calculation: approximately 60 calories per km
      const distanceKm = this._currentRecord.stats.distance / 1000;
      this._currentRecord.stats.calories = Math.round(distanceKm * 60);
    }
  }
}