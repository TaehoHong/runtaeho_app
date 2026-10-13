import { RunningClock } from '../models/RunningClock';

describe('active running clock', () => {
  it('excludes an ongoing pause and resumes without rounding short pauses', () => {
    const clock = new RunningClock();
    clock.start(0);
    clock.pause(5000);
    expect(clock.elapsed(65000)).toBe(5000);
    clock.resume(65000);
    expect(clock.elapsed(70000)).toBe(10000);
    clock.pause(70000);
    clock.resume(70600);
    clock.pause(71000);
    clock.resume(71600);
    expect(clock.elapsed(72600)).toBe(11400);
  });

  it('does not count paused wall time or carry time into the next run', () => {
    const clock = new RunningClock();
    clock.start(1000);
    clock.pause(6000);
    clock.pause(9000);
    expect(clock.elapsed(50000)).toBe(5000);
    clock.reset();
    expect(clock.elapsed(60000)).toBe(0);
    clock.start(70000);
    expect(clock.elapsed(71000)).toBe(1000);
  });
});
