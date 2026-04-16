import { doesViewportMeasurementMatch } from '../viewportMeasurementGuard';

describe('viewportMeasurementGuard', () => {
  it('accepts the same owner and nearly identical frame', () => {
    expect(
      doesViewportMeasurementMatch(
        {
          owner: 'share',
          frame: { x: 16.5, y: 118.5, width: 329, height: 410.5 },
        },
        {
          owner: 'share',
          frame: { x: 16, y: 120, width: 328, height: 410 },
        }
      )
    ).toBe(true);
  });

  it('rejects a stale owner', () => {
    expect(
      doesViewportMeasurementMatch(
        {
          owner: 'running',
          frame: { x: 0, y: 0, width: 360, height: 400 },
        },
        {
          owner: 'share',
          frame: { x: 16, y: 120, width: 328, height: 410 },
        }
      )
    ).toBe(false);
  });

  it('rejects a stale frame for the same owner', () => {
    expect(
      doesViewportMeasurementMatch(
        {
          owner: 'share',
          frame: { x: 16, y: 90, width: 328, height: 410 },
        },
        {
          owner: 'share',
          frame: { x: 16, y: 120, width: 328, height: 410 },
        }
      )
    ).toBe(false);
  });
});
