/**
 * Period Chart Component
 *
 * 기간별 러닝 데이터를 바 차트로 표시
 * - 주단위: 요일별 (월~일)
 * - 월단위: 날짜별 (1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31)
 * - 년단위: 월별 (1~12)
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import type { ChartDataPoint } from '../../models';
import { Period, formatPeriodLabel, getLastDayOfPeriod } from '../../models';
import { PRIMARY, GREY } from '~/shared/styles';

interface PeriodChartProps {
  data: ChartDataPoint[];
  period: Period;
  isEmpty?: boolean;
  referenceDate?: Date; // 기준 날짜 (스와이프 기간 전환용)
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 40; // 좌우 20px 마진
const CHART_HEIGHT = 315;
const CHART_PADDING = { top: 56, right: 16, bottom: 40, left: 35 };
const X_AXIS_MARGIN = 10; // X축 양 끝 마진

// X축 라벨 상수 (배열 재생성 방지)
const WEEK_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;
const YEAR_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;

const PeriodChartComponent: React.FC<PeriodChartProps> = ({
  data,
  period,
  isEmpty = false,
  referenceDate = new Date(),
}) => {
  // 기간별 막대 너비 (Figma 디자인)
  const barWidth = useMemo(() => {
    switch (period) {
      case Period.MONTH:
        return 4;
      case Period.WEEK:
        return 20;
      case Period.YEAR:
        return 12;
      default:
        return 4;
    }
  }, [period]);

  // 해당 월의 마지막 날 계산 (referenceDate 기준)
  const lastDayOfMonth = useMemo(() => {
    return getLastDayOfPeriod(referenceDate, Period.MONTH);
  }, [referenceDate]);

  // X축 라벨 (기간에 따라 다름)
  // WEEK/YEAR는 상수 배열 참조 (재생성 방지)
  const xAxisLabels = useMemo((): readonly string[] => {
    switch (period) {
      case Period.WEEK:
        return WEEK_LABELS;
      case Period.MONTH: {
        // 3일 간격으로 표시 (1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 마지막날)
        const labels: string[] = [];
        for (let day = 1; day <= lastDayOfMonth; day += 3) {
          labels.push(String(day));
        }
        // 마지막 날이 포함되지 않았으면 추가
        const lastLabel = labels[labels.length - 1];
        if (lastLabel && parseInt(lastLabel) !== lastDayOfMonth) {
          labels.push(String(lastDayOfMonth));
        }
        return labels;
      }
      case Period.YEAR:
        return YEAR_LABELS;
      default:
        return [];
    }
  }, [period, lastDayOfMonth]);

  // 기간 라벨 (referenceDate 기준)
  const periodLabel = useMemo(() => {
    const formatted = formatPeriodLabel(referenceDate, period);
    return {
      left: formatted.primary,
      right: formatted.secondary || null,
    };
  }, [period, referenceDate]);

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

  // 실제 날짜 기반 X 위치 계산
  const getBarXPosition = (point: ChartDataPoint) => {
    const date = new Date(point.datetime);
    let position = 0;

    switch (period) {
      case Period.WEEK: {
        // 요일 기반 (0=일요일, 1=월요일, ..., 6=토요일)
        let dayOfWeek = date.getDay();
        // 월요일을 0으로 변환 (월=0, 화=1, ..., 일=6)
        dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        // 0~6 범위를 0~1로 정규화
        position = dayOfWeek / 6;
        break;
      }
      case Period.MONTH: {
        // 날짜 기반 (1~실제 마지막 날)
        const day = date.getDate();
        // 1~lastDayOfMonth를 0~1로 정규화
        position = (day - 1) / (lastDayOfMonth - 1);
        break;
      }
      case Period.YEAR: {
        // 월 기반 (1~12월)
        const month = date.getMonth() + 1;
        // 1~12를 0~1로 정규화
        position = (month - 1) / 11;
        break;
      }
    }

    // X축 마진을 적용한 실제 차트 영역
    const effectiveChartWidth = chartInnerWidth - X_AXIS_MARGIN * 2;
    return CHART_PADDING.left + X_AXIS_MARGIN + position * effectiveChartWidth - barWidth / 2;
  };

  // 상단만 둥근 막대 Path 생성 (하단은 직선)
  const createRoundedTopBarPath = (x: number, y: number, width: number, height: number, radius: number) => {
    const r = Math.min(radius, width / 2, height);
    return `
      M ${x},${y + height}
      L ${x},${y + r}
      Q ${x},${y} ${x + r},${y}
      L ${x + width - r},${y}
      Q ${x + width},${y} ${x + width},${y + r}
      L ${x + width},${y + height}
      Z
    `;
  };

  return (
    <View style={styles.container}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* 기간 라벨 - 월/년 (좌측 상단) */}
        <SvgText
          x={16}
          y={32}
          fontSize={18}
          fontWeight="600"
          fill={GREY[900]}
        >
          {periodLabel.left}
        </SvgText>

        {/* 주차 라벨 (우측 상단) - Period.WEEK일 때만 표시 */}
        {periodLabel.right && (
          <SvgText
            x={CHART_WIDTH - 16}
            y={32}
            fontSize={14}
            fontWeight="500"
            fill={GREY[700]}
            textAnchor="end"
          >
            {periodLabel.right}
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
            fill={GREY[300]}
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
            stroke={GREY[100]}
            strokeWidth={1}
          />
        ))}

        {/* 바 차트 */}
        {!isEmpty &&
          normalizedData.map((point) => {
            const barHeight = getBarHeight(point.distanceKm);
            const barX = getBarXPosition(point);
            const barY = CHART_PADDING.top + chartInnerHeight - barHeight;

            // 상단만 둥근 막대 (하단은 직선)
            const pathData = createRoundedTopBarPath(barX, barY, barWidth, barHeight, barWidth / 2);

            return (
              <Path
                key={`bar-${point.datetime}`}
                d={pathData}
                fill={PRIMARY[600]}
              />
            );
          })}

        {/* X축 라벨 */}
        {xAxisLabels.map((label, index) => {
          // 막대와 동일하게 마진 적용
          const effectiveChartWidth = chartInnerWidth - X_AXIS_MARGIN * 2;
          const x =
            CHART_PADDING.left +
            X_AXIS_MARGIN +
            (index / (xAxisLabels.length - 1)) * effectiveChartWidth;
          return (
            <SvgText
              key={`x-label-${index}`}
              x={x}
              y={CHART_HEIGHT - CHART_PADDING.bottom + 20}
              fontSize={10}
              fontWeight="500"
              fill={GREY[300]}
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

/**
 * React.memo로 감싸서 불필요한 SVG 재생성 방지
 * 비교 조건:
 * - period, isEmpty 값 비교
 * - referenceDate 시간값 비교
 * - data 배열 내용 비교 (길이 + 각 요소의 datetime, distance)
 */
export const PeriodChart = React.memo(PeriodChartComponent, (prevProps, nextProps) => {
  // period 비교
  if (prevProps.period !== nextProps.period) return false;

  // isEmpty 비교
  if (prevProps.isEmpty !== nextProps.isEmpty) return false;

  // referenceDate 비교 (시간값)
  const prevTime = prevProps.referenceDate?.getTime() ?? 0;
  const nextTime = nextProps.referenceDate?.getTime() ?? 0;
  if (prevTime !== nextTime) return false;

  // data 배열 비교
  if (prevProps.data.length !== nextProps.data.length) return false;
  for (let i = 0; i < prevProps.data.length; i++) {
    const prevItem = prevProps.data[i];
    const nextItem = nextProps.data[i];
    if (!prevItem || !nextItem) return false;
    if (prevItem.datetime !== nextItem.datetime) return false;
    if (prevItem.distance !== nextItem.distance) return false;
  }

  return true;
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: GREY.WHITE,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
