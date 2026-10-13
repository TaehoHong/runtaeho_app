import type { UnityViewportFrame } from '~/stores/unity/unityStore';

export const doViewportFramesMatch = (
  left: UnityViewportFrame,
  right: UnityViewportFrame,
  epsilon: number
): boolean =>
  Math.abs(left.x - right.x) <= epsilon
  && Math.abs(left.y - right.y) <= epsilon
  && Math.abs(left.width - right.width) <= epsilon
  && Math.abs(left.height - right.height) <= epsilon;
