/**
 * Period Chart Component
 *
 * 기간별 러닝 데이터를 바 차트로 표시
 * - 주단위: 요일별 (월~일)
 * - 월단위: 날짜별 (1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31)
 * - 년단위: 월별 (1~12)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import type { ChartDataPoint } from '../../models';
import { Period } from '../../models';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

interface PeriodChartProps {
  data: ChartDataPoint[];
  period: Period;
  isEmpty?: boolean;
}

const CHART_WIDTH = 335;
const CHART_HEIGHT = 315;
const CHART_PADDING = { top: 56, right: 16, bottom: 40, left: 35 };
const BAR_WIDTH = 14;

export const PeriodChart: React.FC<PeriodChartProps> = ({
  data,
  period,
  isEmpty = false,
}) => {
  // X축 라벨 (기간에 따라 다름)
  const xAxisLabels = useMemo(() => {
    switch (period) {
      case Period.WEEK:
        return ['월', '화', '수', '목', '금', '토', '일'];
      case Period.MONTH:
        return ['1', '4', '7', '10', '13', '16', '19', '22', '25', '28', '31'];
      case Period.YEAR:
        return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      default:
        return [];
    }
  }, [period]);

  // 기간 라벨 (좌측 상단)
  const periodLabel = useMemo(() => {
    const now = new Date();
    switch (period) {
      case Period.WEEK:
        // "1주차" 형식
        const weekNum = Math.ceil(now.getDate() / 7);
        return `${now.getMonth() + 1}월\n${weekNum}주차`;
      case Period.MONTH:
        return `${now.getMonth() + 1}월`;
      case Period.YEAR:
        return `${now.getFullYear()}년`;
      default:
        return '';
    }
  }, [period]);

  // 차트 데이터 정규화 (거리를 km로 변환)
  const normalizedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      distanceKm: point.distance / 1000,
    }));
  }, [data]);

  // 최대값 계산 (Y축 스케일링용)
  // 데이터 최댓값 + 3km (예: 최대 15km면 Y축은 18km까지)
  const maxValue = useMemo(() => {
    if (isEmpty || normalizedData.length === 0) return 3.0;
    const dataMax = Math.max(...normalizedData.map((d) => d.distanceKm));
    return dataMax + 3;
  }, [normalizedData, isEmpty]);

  // Y축 라벨 (maxValue 기반으로 동적 생성)
  const yAxisLabels = useMemo(() => {
    const step = maxValue / 5; // 6개 라벨을 위한 5단계
    return [
      maxValue,
      maxValue - step,
      maxValue - step * 2,
      maxValue - step * 3,
      maxValue - step * 4,
      0.0,
    ];
  }, [maxValue]);

  // 바 높이 계산
  const getBarHeight = (value: number) => {
    const chartInnerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
    return (value / maxValue) * chartInnerHeight;
  };

  // 차트 내부 크기
  const chartInnerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const chartInnerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  // Y축 그리드 라인 Y 좌표
  const getYPosition = (value: number) => {
    return CHART_PADDING.top + ((maxValue - value) / maxValue) * chartInnerHeight;
  };

  return (
    <View style={styles.container}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* 기간 라벨 (좌측 상단) */}
        <SvgText
          x={16}
          y={32}
          fontSize={18}
          fontWeight="600"
          fill="#000000"
        >
          {periodLabel.split('\n')[0]}
        </SvgText>
        {periodLabel.split('\n')[1] && (
          <SvgText
            x={16}
            y={48}
            fontSize={14}
            fill="#666666"
          >
            {periodLabel.split('\n')[1]}
          </SvgText>
        )}

        {/* Y축 라벨 */}
        {yAxisLabels.map((label, index) => (
          <SvgText
            key={`y-label-${index}`}
            x={11}
            y={getYPosition(label) + 4}
            fontSize={10}
            fontWeight="500"
            fill="#BCBCBC"
          >
            {label.toFixed(1)}
          </SvgText>
        ))}

        {/* 수평 그리드 라인 */}
        {yAxisLabels.map((label, index) => (
          <Line
            key={`grid-${index}`}
            x1={CHART_PADDING.left}
            y1={getYPosition(label)}
            x2={CHART_WIDTH - CHART_PADDING.right}
            y2={getYPosition(label)}
            stroke="#EDEDED"
            strokeWidth={1}
          />
        ))}

        {/* 바 차트 */}
        {!isEmpty &&
          normalizedData.map((point, index) => {
            const barHeight = getBarHeight(point.distanceKm);
            const barX =
              CHART_PADDING.left +
              (index / (xAxisLabels.length - 1)) * chartInnerWidth -
              BAR_WIDTH / 2;
            const barY =
              CHART_PADDING.top + chartInnerHeight - barHeight;

            return (
              <Rect
                key={`bar-${index}`}
                x={barX}
                y={barY}
                width={BAR_WIDTH}
                height={barHeight}
                fill="#45DA31"
                rx={7}
                ry={7}
              />
            );
          })}

        {/* X축 라벨 */}
        {xAxisLabels.map((label, index) => {
          const x =
            CHART_PADDING.left +
            (index / (xAxisLabels.length - 1)) * chartInnerWidth;
          return (
            <SvgText
              key={`x-label-${index}`}
              x={x}
              y={CHART_HEIGHT - CHART_PADDING.bottom + 20}
              fontSize={10}
              fontWeight="500"
              fill="#BCBCBC"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
});
