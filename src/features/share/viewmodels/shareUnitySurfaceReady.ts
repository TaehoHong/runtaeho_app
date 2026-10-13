import { doViewportFramesMatch as matchViewportFrames } from '~/features/unity/utils/viewportFrames';
import type {
  RenderedUnityViewport,
  UnityViewport,
  UnityViewportFrame,
} from '~/stores/unity/unityStore';

const VIEWPORT_FRAME_EPSILON = 2;

export const doShareViewportFramesMatch = (
  left: UnityViewportFrame,
  right: UnityViewportFrame
): boolean =>
  matchViewportFrames(left, right, VIEWPORT_FRAME_EPSILON);

export const isShareSurfaceAttached = (
  activeViewport: UnityViewport | null,
  renderedViewport: RenderedUnityViewport | null,
  isSurfaceVisible: boolean
): boolean => {
  if (!isSurfaceVisible) {
    return false;
  }

  if (!activeViewport || activeViewport.owner !== 'share') {
    return false;
  }

  if (!renderedViewport || renderedViewport.owner !== 'share') {
    return false;
  }

  return true;
};

export const isShareExportViewportSettled = (
  expectedFrame: UnityViewportFrame,
  renderedViewport: RenderedUnityViewport | null
): boolean =>
  !!renderedViewport
  && renderedViewport.owner === 'share'
  && doShareViewportFramesMatch(expectedFrame, renderedViewport.frame);
