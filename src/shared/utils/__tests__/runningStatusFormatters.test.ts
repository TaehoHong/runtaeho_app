import { RunningStatusFormat } from '../runningStatusFormatters';

describe('RunningStatusFormat', () => {
  it('formats running distance with km spacing and fixed precision', () => {
    expect(RunningStatusFormat.distance(6520)).toBe('6.52 km');
    expect(RunningStatusFormat.distance(1534, { fractionDigits: 1 })).toBe('1.5 km');
    expect(RunningStatusFormat.distance(-100)).toBe('0.00 km');
    expect(RunningStatusFormat.distanceParts(6520)).toEqual({
      value: '6.52',
      unit: 'km',
      text: '6.52 km',
    });
  });

  it('formats duration as M:SS before one hour and H:MM:SS after one hour', () => {
    expect(RunningStatusFormat.duration(2300)).toBe('38:20');
    expect(RunningStatusFormat.duration(3723)).toBe('1:02:03');
    expect(RunningStatusFormat.duration(-1)).toBe('00:00');
  });

  it('formats pace with runner notation and /km unit', () => {
    expect(RunningStatusFormat.pace(5.8833)).toBe('5\'53"/km');
    expect(RunningStatusFormat.paceFromMetersAndSeconds(6520, 2300)).toBe('5\'53"/km');
    expect(RunningStatusFormat.paceFromSecondsPerKm(300)).toBe('5\'00"/km');
    expect(RunningStatusFormat.pace(0)).toBe('--/km');
  });

  it('formats sensors, calories, and points without leading zero padding', () => {
    expect(RunningStatusFormat.heartRate(99)).toBe('99 bpm');
    expect(RunningStatusFormat.heartRate(0)).toBe('--');
    expect(RunningStatusFormat.cadence(172)).toBe('172 spm');
    expect(RunningStatusFormat.calories(320)).toBe('320 kcal');
    expect(RunningStatusFormat.speedKmh(12)).toBe('12.0 km/h');
    expect(RunningStatusFormat.points(65, { signed: true })).toBe('+65 P');
    expect(RunningStatusFormat.points(12340, { useGrouping: true })).toBe('12,340 P');
  });
});
