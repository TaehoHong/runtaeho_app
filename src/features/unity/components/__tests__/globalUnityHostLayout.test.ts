import { areWindowOriginsEqual, toHostLocalFrame } from '../globalUnityHostLayout';

describe('globalUnityHostLayout', () => {
  it('normalizes Android running viewport coordinates against the overlay origin', () => {
    expect(
      toHostLocalFrame(
        { x: 0, y: -26.666656494140625, width: 360, height: 400 },
        { x: 0, y: -26.666656494140625 }
      )
    ).toEqual({
      x: 0,
      y: 0,
      width: 360,
      height: 400,
    });
  });

  it('normalizes Android share viewport coordinates against the overlay origin', () => {
    expect(
      toHostLocalFrame(
        { x: 16, y: 62.333343505859375, width: 328, height: 410 },
        { x: 0, y: -26.666656494140625 }
      )
    ).toEqual({
      x: 16,
      y: 89,
      width: 328,
      height: 410,
    });
  });

  it('treats nearly identical overlay origins as equal to avoid re-render churn', () => {
    expect(
      areWindowOriginsEqual(
        { x: 0, y: -26.666656494140625 },
        { x: 0.2, y: -26.366656494140624 }
      )
    ).toBe(true);
  });
});
