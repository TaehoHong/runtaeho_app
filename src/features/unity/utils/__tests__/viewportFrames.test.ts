import { doViewportFramesMatch } from '../viewportFrames';

describe('viewport frame tolerance', () => {
  const frame = { x: 0, y: 0, width: 100, height: 100 };
  it('preserves the strict store tolerance and looser share tolerance', () => {
    expect(doViewportFramesMatch(frame, { ...frame, x: 1 }, 0.5)).toBe(false);
    expect(doViewportFramesMatch(frame, { ...frame, x: 1 }, 2)).toBe(true);
    expect(doViewportFramesMatch(frame, { ...frame, height: 102 }, 2)).toBe(true);
    expect(doViewportFramesMatch(frame, { ...frame, height: 102.01 }, 2)).toBe(false);
  });
});
