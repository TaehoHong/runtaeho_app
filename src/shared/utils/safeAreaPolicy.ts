import type { Edge } from 'react-native-safe-area-context';

const TOP_EDGES: Edge[] = ['top'];
const TOP_AND_BOTTOM_EDGES: Edge[] = ['top', 'bottom'];
const MAIN_TAB_BAR_BASE_HEIGHT = 60;
const MAIN_TAB_BAR_FALLBACK_BOTTOM_PADDING = 10;
const MAIN_TAB_BAR_SCROLL_GAP = 16;

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

/**
 * 메인 탭바의 하단 패딩은 iOS safe-area가 있으면 inset을 사용하고,
 * inset이 없는 환경에서는 기존 디자인의 10px 여백을 유지한다.
 */
export const getMainTabBarBottomPadding = (bottomInset: number): number => {
  return bottomInset > 0 ? bottomInset : MAIN_TAB_BAR_FALLBACK_BOTTOM_PADDING;
};

/**
 * app/(tabs)/_layout.tsx의 absolute 탭바 실제 높이.
 * 화면별 스크롤 하단 여백과 같은 기준을 써야 마지막 컨텐츠가 탭바에 가려지지 않는다.
 */
export const getMainTabBarHeight = (bottomInset: number): number => {
  return MAIN_TAB_BAR_BASE_HEIGHT + getMainTabBarBottomPadding(bottomInset);
};

export const getMainTabBarScrollContentPaddingBottom = (bottomInset: number): number => {
  return getMainTabBarHeight(bottomInset) + MAIN_TAB_BAR_SCROLL_GAP;
};
