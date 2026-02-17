import {
  calculateAveragePace,
  calculateAverageSpeed,
  formatDuration,
  formatRunningRecord,
  type RunningRecord,
} from '~/features/running/models/RunningRecord';

describe('RunningRecord model helpers', () => {
  const sampleRecord: RunningRecord = {
    id: 1,
    distance: 5000,
    steps: 6000,
    cadence: 172,
    heartRate: 145,
    calorie: 320,
    durationSec: 1500,
    startTimestamp: 1700000000,
  };

  it('calculates pace and speed from distance and duration', () => {
    expect(calculateAveragePace(sampleRecord)).toBe(5);
    expect(calculateAverageSpeed(sampleRecord)).toBeCloseTo(12, 5);
  });

  it('formats duration and running record for UI', () => {
    expect(formatDuration(125)).toBe('2 분 05 초');

    const formatted = formatRunningRecord(sampleRecord);
    expect(formatted.distance).toBe('5.00 km');
    expect(formatted.pace).toContain('/km');
    expect(formatted.speed).toContain('km/h');
    expect(formatted.cadence).toBe('172 spm');
    expect(formatted.heartRate).toBe('145 bpm');
  });
});
