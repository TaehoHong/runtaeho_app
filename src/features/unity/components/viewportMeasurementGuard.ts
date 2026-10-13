import { doViewportFramesMatch as matchViewportFrames } from '~/features/unity/utils/viewportFrames';
import type { UnityViewport, UnityViewportFrame } from '~/stores/unity/unityStore';

const VIEWPORT_FRAME_EPSILON = 2;

const doViewportFramesMatch = (
  left: UnityViewportFrame,
  right: UnityViewportFrame
): boolean =>
  matchViewportFrames(left, right, VIEWPORT_FRAME_EPSILON);

export const doesViewportMeasurementMatch = (
  currentViewport: UnityViewport | null,
  expectedViewport: UnityViewport
): boolean =>
  !!currentViewport
  && currentViewport.owner === expectedViewport.owner
  && doViewportFramesMatch(currentViewport.frame, expectedViewport.frame);
