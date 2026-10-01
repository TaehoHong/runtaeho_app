import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { useOfflineSync } from '../hooks/useOfflineSync';
import type { RunningRecordItem } from '../models/RunningRecordItem';
import { offlineStorageService } from '../services/OfflineStorageService';

const mockSaveItems = jest.fn();
const mockEndRunning = jest.fn();

// Execute the original hook with dynamic imports compiled for Jest's CommonJS runtime.
jest.mock('../hooks/useOfflineSync', () => {
  const fs = jest.requireActual<typeof import('fs')>('fs');
  const ts = jest.requireActual<typeof import('typescript')>('typescript');
  const source = fs.readFileSync(require.resolve('../hooks/useOfflineSync'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const hookModule = { exports: {} };
  new Function('require', 'exports', 'module', compiled.outputText)(require, hookModule.exports, hookModule);
  return hookModule.exports;
});

jest.mock('../services/runningService', () => ({
  runningService: {
    saveRunningRecordItems: (...args: unknown[]) => mockSaveItems(...args),
    endRunning: (...args: unknown[]) => mockEndRunning(...args),
  },
}));

const segment: RunningRecordItem = {
  id: 1,
  distance: 80,
  cadence: 170,
  heartRate: 150,
  calories: 15,
  orderIndex: 0,
  durationSec: 120,
  startTimestamp: 1735689600,
  locations: [{
    latitude: 37.5,
    longitude: 127,
    timestamp: new Date('2025-01-01T09:00:00.123+09:00'),
    speed: 3.2,
    altitude: 20,
    accuracy: 5,
  }, {
    latitude: 37.501,
    longitude: 127.001,
    timestamp: new Date('2025-01-01T00:00:01.456Z'),
    speed: 3.3,
    altitude: 21,
  }],
  isUploaded: false,
};

describe('offline GPS segment synchronization', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockSaveItems.mockReset().mockResolvedValue(undefined);
    mockEndRunning.mockReset().mockResolvedValue(undefined);
  });

  it('restores GPS dates from persisted JSON without changing queue timestamps', async () => {
    await offlineStorageService.addPendingSegmentUpload(404, [segment]);
    const stored = await AsyncStorage.getItem('@pending_segment_uploads');
    expect(stored).toContain('2025-01-01T00:00:00.123Z');

    const pending = await offlineStorageService.getPendingSegmentUploads();
    expect(pending[0]?.timestamp).toEqual(expect.any(Number));
    const locations = pending[0]?.segments[0]?.locations;
    expect(locations?.[0]?.timestamp).toBeInstanceOf(Date);
    expect(locations?.[0]?.timestamp.getTime()).toBe(1735689600123);
    expect(locations?.[1]?.timestamp.getTime()).toBe(1735689601456);
  });

  it('uploads persisted GPS coordinates and millisecond timestamps, then removes the queue entry', async () => {
    await offlineStorageService.addPendingSegmentUpload(404, [segment]);
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      expect(await result.current.syncOfflineData()).toEqual({
        records: { success: 0, failed: 0 },
        segments: { success: 1, failed: 0 },
      });
    });

    expect(mockSaveItems).toHaveBeenCalledWith({
      runningRecordId: 404,
      items: [{
        distance: 80,
        durationSec: 120,
        cadence: 170,
        heartRate: 150,
        minHeartRate: 150,
        maxHeartRate: 150,
        orderIndex: 0,
        startTimeStamp: 1735689600,
        endTimeStamp: 1735689720,
        gpsPoints: [{
          latitude: 37.5, longitude: 127, timestampMs: 1735689600123,
          speed: 3.2, altitude: 20, accuracy: 5,
        }, {
          latitude: 37.501, longitude: 127.001, timestampMs: 1735689601456,
          speed: 3.3, altitude: 21, accuracy: undefined,
        }],
      }],
    });
    expect(await offlineStorageService.getPendingSegmentCount()).toBe(0);
    expect(mockEndRunning).not.toHaveBeenCalled();
  });

  it('retains GPS data after an API failure and uploads it on the next retry', async () => {
    await offlineStorageService.addPendingSegmentUpload(404, [segment]);
    const storedBefore = await AsyncStorage.getItem('@pending_segment_uploads');
    mockSaveItems.mockRejectedValueOnce(new Error('network-unavailable'));
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      expect((await result.current.syncOfflineData())?.segments).toEqual({ success: 0, failed: 1 });
    });
    expect(mockSaveItems).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem('@pending_segment_uploads')).toBe(storedBefore);

    await act(async () => {
      expect((await result.current.syncOfflineData())?.segments).toEqual({ success: 1, failed: 0 });
    });
    expect(mockSaveItems).toHaveBeenCalledTimes(2);
    expect(await offlineStorageService.getPendingSegmentCount()).toBe(0);
  });

  it('keeps segments with missing or empty GPS locations uploadable', async () => {
    const { locations: _locations, ...withoutLocations } = segment;
    await offlineStorageService.addPendingSegmentUpload(404, [
      withoutLocations, { ...segment, locations: [], orderIndex: 1 },
    ]);
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      expect((await result.current.syncOfflineData())?.segments).toEqual({ success: 1, failed: 0 });
    });
    expect(mockSaveItems).toHaveBeenCalledWith({
      runningRecordId: 404,
      items: [
        expect.objectContaining({ orderIndex: 0, gpsPoints: [] }),
        expect.objectContaining({ orderIndex: 1, gpsPoints: [] }),
      ],
    });
  });

  it('does not call the API when no uploads are pending', async () => {
    const { result } = renderHook(() => useOfflineSync());
    await act(async () => { expect(await result.current.syncOfflineData()).toBeNull(); });
    expect(mockSaveItems).not.toHaveBeenCalled();
    expect(mockEndRunning).not.toHaveBeenCalled();
  });
});
