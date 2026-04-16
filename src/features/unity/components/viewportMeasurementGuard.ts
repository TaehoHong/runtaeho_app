import type { UnityViewport, UnityViewportFrame } from '~/stores/unity/unityStore';

const VIEWPORT_FRAME_EPSILON = 2;

const doViewportFramesMatch = (
  left: UnityViewportFrame,
  right: UnityViewportFrame
): boolean =>
  Math.abs(left.x - right.x) <= VIEWPORT_FRAME_EPSILON
  && Math.abs(left.y - right.y) <= VIEWPORT_FRAME_EPSILON
  && Math.abs(left.width - right.width) <= VIEWPORT_FRAME_EPSILON
  && Math.abs(left.height - right.height) <= VIEWPORT_FRAME_EPSILON;

export const doesViewportMeasurementMatch = (
  currentViewport: UnityViewport | null,
  expectedViewport: UnityViewport
): boolean =>
  !!currentViewport
  && currentViewport.owner === expectedViewport.owner
  && doViewportFramesMatch(currentViewport.frame, expectedViewport.frame);
