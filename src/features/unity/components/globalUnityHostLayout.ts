import type { UnityViewportFrame } from '~/stores/unity/unityStore';

export interface WindowOrigin {
  x: number;
  y: number;
}

const WINDOW_ORIGIN_EPSILON = 0.5;

export const areWindowOriginsEqual = (
  left: WindowOrigin | null,
  right: WindowOrigin
): boolean =>
  !!left
  && Math.abs(left.x - right.x) <= WINDOW_ORIGIN_EPSILON
  && Math.abs(left.y - right.y) <= WINDOW_ORIGIN_EPSILON;

export const toHostLocalFrame = (
  frame: UnityViewportFrame,
  overlayWindowOrigin: WindowOrigin
): UnityViewportFrame => ({
  x: frame.x - overlayWindowOrigin.x,
  y: frame.y - overlayWindowOrigin.y,
  width: frame.width,
  height: frame.height,
});
