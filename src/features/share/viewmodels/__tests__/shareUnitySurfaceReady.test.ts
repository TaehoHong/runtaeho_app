import { isShareSurfaceReady } from '../shareUnitySurfaceReady';

describe('isShareSurfaceReady', () => {
  it('returns false when the Unity surface is not visible yet', () => {
    expect(
      isShareSurfaceReady(
        {
          owner: 'share',
          frame: { x: 16, y: 120, width: 328, height: 410 },
        },
        {
          owner: 'share',
          frame: { x: 16, y: 120, width: 328, height: 410 },
        },
        false
      )
    ).toBe(false);
  });

  it('returns false when the rendered viewport does not match the share viewport', () => {
    expect(
      isShareSurfaceReady(
        {
          owner: 'share',
          frame: { x: 16, y: 120, width: 328, height: 410 },
        },
        {
          owner: 'share',
          frame: { x: 16, y: 96, width: 328, height: 410 },
        },
        true
      )
    ).toBe(false);
  });

  it('returns true when the share viewport is visible and rendered in the expected frame', () => {
    expect(
      isShareSurfaceReady(
        {
          owner: 'share',
          frame: { x: 16, y: 120, width: 328, height: 410 },
        },
        {
          owner: 'share',
          frame: { x: 16.5, y: 119, width: 329, height: 410.5 },
        },
        true
      )
    ).toBe(true);
  });
});
