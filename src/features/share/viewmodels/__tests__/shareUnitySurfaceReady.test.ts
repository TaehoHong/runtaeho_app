import {
  isShareExportViewportSettled,
  isShareSurfaceAttached,
} from '../shareUnitySurfaceReady';

describe('isShareSurfaceAttached', () => {
  it('returns false when the Unity surface is not visible yet', () => {
    expect(
      isShareSurfaceAttached(
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

  it('returns false when the rendered viewport is not owned by share', () => {
    expect(
      isShareSurfaceAttached(
        {
          owner: 'share',
          frame: { x: 16, y: 120, width: 328, height: 410 },
        },
        {
          owner: 'running',
          frame: { x: 16, y: 96, width: 328, height: 410 },
        },
        true
      )
    ).toBe(false);
  });

  it('returns true when the share surface is visible and both active/rendered owners are share', () => {
    expect(
      isShareSurfaceAttached(
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

describe('isShareExportViewportSettled', () => {
  it('returns false when the rendered viewport frame does not match the export frame', () => {
    expect(
      isShareExportViewportSettled(
        { x: 16, y: 120, width: 328, height: 410 },
        {
          owner: 'share',
          frame: { x: 16, y: 96, width: 328, height: 410 },
        }
      )
    ).toBe(false);
  });

  it('returns true when the rendered viewport matches the export frame within epsilon', () => {
    expect(
      isShareExportViewportSettled(
        { x: 16, y: 120, width: 328, height: 410 },
        {
          owner: 'share',
          frame: { x: 16.5, y: 119, width: 329, height: 410.5 },
        }
      )
    ).toBe(true);
  });
});
