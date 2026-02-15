/**
 * PointIcon Component
 * 포인트 표시용 커스텀 SVG 아이콘
 *
 * Figma 디자인 기준 - 두 개의 겹치는 원 + 숫자/체크 형태
 */

import React from 'react';
import { PRIMARY } from '~/shared/styles';
import Svg, { Path } from 'react-native-svg';

interface PointIconProps {
  /** 아이콘 크기 (width = height) */
  size?: number;
  /** 아이콘 색상 */
  color?: string;
}

export const PointIcon: React.FC<PointIconProps> = ({
  size = 24,
  color = PRIMARY[600]
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* 왼쪽 원 (시계/포인트 형태) */}
    <Path
      d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* 오른쪽 원 (체크 표시용) */}
    <Path
      d="M18.0898 10.3691C19.0352 10.7216 19.8763 11.3067 20.5356 12.0703C21.1949 12.834 21.6509 13.7516 21.8616 14.7382C22.0723 15.7248 22.0307 16.7487 21.7409 17.715C21.451 18.6813 20.9222 19.559 20.2033 20.2668C19.4844 20.9745 18.5986 21.4896 17.6278 21.7644C16.6571 22.0391 15.6327 22.0646 14.6495 21.8386C13.6663 21.6126 12.756 21.1422 12.0027 20.4711C11.2494 19.8 10.6775 18.9498 10.3398 17.9991"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* 왼쪽 원 내부 숫자 1 형태 */}
    <Path
      d="M7 6H8V10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* 오른쪽 원 내부 체크 표시 */}
    <Path
      d="M16.7098 13.8809L17.4098 14.5909L14.5898 17.4109"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default PointIcon;
