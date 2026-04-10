/**
 * DraggableRouteMap Component
 * GPS 좌표를 SVG 경로로 시각화하는 드래그 가능한 지도 컴포넌트
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, Filter, FeGaussianBlur } from 'react-native-svg';
import type { Location } from '~/features/running/models';
import type { ElementTransform } from '../../models/types';
import { SCALE_RANGES } from '../../constants/shareOptions';
import { gpsToSVGPath } from '../../utils/gpsToPath';
import { useDraggableTransformGesture } from './useDraggableTransformGesture';
import { PRIMARY } from '~/shared/styles';

interface DraggableRouteMapProps {
  /** GPS 좌표 배열 */
  locations: Location[];
  /** 현재 변환 상태 */
  transform: ElementTransform;
  /** 변환 변경 콜백 */
  onTransformChange: (transform: ElementTransform) => void;
  /** 표시 여부 */
  visible: boolean;
  /** 제스처 활성화 여부 */
  interactive?: boolean;
}

// SVG ViewBox 크기 (Figma 기준)
const SVG_WIDTH = 160;
const SVG_HEIGHT = 180;

// 마커 스타일 상수
const MARKER_OUTER_RADIUS = 6;
const MARKER_INNER_RADIUS = 4;

export const DraggableRouteMap: React.FC<DraggableRouteMapProps> = ({
  locations,
  transform,
  onTransformChange,
  visible,
  interactive = true,
}) => {
  const { combinedGesture, animatedStyle } = useDraggableTransformGesture({
    transform,
    scaleRange: SCALE_RANGES.map,
    onTransformChange,
  });

  // 숨김 처리
  if (!visible) {
    return null;
  }

  // GPS 좌표 → SVG Path 변환
  const pathData = gpsToSVGPath(locations, { width: SVG_WIDTH, height: SVG_HEIGHT });

  // 좌표 데이터가 없으면 렌더링하지 않음
  if (!pathData) {
    return null;
  }

  const content = (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Svg
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      >
        <Defs>
          {/* 글로우 효과를 위한 필터 */}
          <Filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur stdDeviation="2" result="blur" />
          </Filter>
        </Defs>

        {/* 글로우 효과 (외곽선) */}
        <Path
          d={pathData.path}
          stroke={`${PRIMARY[500]}4D`} // 30% 투명도
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 메인 경로 라인 */}
        <Path
          d={pathData.path}
          stroke={PRIMARY[500]}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 시작점 (초록색) */}
        <Circle
          cx={pathData.startPoint.x}
          cy={pathData.startPoint.y}
          r={MARKER_OUTER_RADIUS}
          fill={PRIMARY[500]}
        />
        <Circle
          cx={pathData.startPoint.x}
          cy={pathData.startPoint.y}
          r={MARKER_INNER_RADIUS}
          fill="white"
        />

        {/* 종료점 (빨간색) */}
        <Circle
          cx={pathData.endPoint.x}
          cy={pathData.endPoint.y}
          r={MARKER_OUTER_RADIUS}
          fill="#ef4444"
        />
        <Circle
          cx={pathData.endPoint.x}
          cy={pathData.endPoint.y}
          r={MARKER_INNER_RADIUS}
          fill="white"
        />
      </Svg>
    </Animated.View>
  );

  if (!interactive) {
    return content;
  }

  return (
    <GestureDetector gesture={combinedGesture}>
      {content}
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    // 그림자 효과
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default DraggableRouteMap;
