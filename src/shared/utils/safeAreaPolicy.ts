import type { Edge } from 'react-native-safe-area-context';

const TOP_EDGES: Edge[] = ['top'];
const TOP_AND_BOTTOM_EDGES: Edge[] = ['top', 'bottom'];

/**
 * "상단 중심" 화면에서 사용할 SafeArea edge 규칙.
 * Android edge-to-edge에서는 하단 시스템 바와 겹치지 않도록 bottom도 포함한다.
 */
export const getTopScreenEdgesForPlatform = (os: string): Edge[] => {
  return os === 'android' ? TOP_AND_BOTTOM_EDGES : TOP_EDGES;
};

/**
 * 하단 고정 UI의 기본 오프셋에 플랫폼별 하단 inset 보정을 적용한다.
 * iOS 레이아웃 무영향 요구사항에 따라 iOS는 baseOffset을 그대로 유지한다.
 */
export const getBottomOffsetForPlatform = (
  baseOffset: number,
  bottomInset: number,
  os: string
): number => {
  return os === 'android' ? baseOffset + bottomInset : baseOffset;
};
