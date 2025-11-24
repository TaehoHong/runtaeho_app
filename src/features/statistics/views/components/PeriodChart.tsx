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
import { Period } from '../../models';
import { PRIMARY, GREY } from '~/shared/styles';

interface PeriodChartProps {
  data: ChartDataPoint[];
  period: Period;
  isEmpty?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 40; // 좌우 20px 마진
const CHART_HEIGHT = 315;
const CHART_PADDING = { top: 56, right: 16, bottom: 40, left: 35 };
const X_AXIS_MARGIN = 10; // X축 양 끝 마진

export const PeriodChart: React.FC<PeriodChartProps> = ({
  data,
  period,
  isEmpty = false,
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

  // 현재 월의 마지막 날 계산
  const lastDayOfMonth = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    // 다음 달의 0일 = 이번 달의 마지막 날
    return new Date(year, month + 1, 0).getDate();
  }, []);

  // X축 라벨 (기간에 따라 다름)
  const xAxisLabels = useMemo(() => {
    switch (period) {
      case Period.WEEK:
        return ['월', '화', '수', '목', '금', '토', '일'];
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
        return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      default:
        return [];
    }
  }, [period, lastDayOfMonth]);

  // 기간 라벨
  const periodLabel = useMemo(() => {
    const now = new Date();
    switch (period) {
      case Period.WEEK: {
        // 이번 주의 월요일 구하기
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 일요일이면 -6, 아니면 월요일까지의 차이
        const monday = new Date(now);
        monday.setDate(now.getDate() + diff);

        // 이번 주의 일요일 구하기
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        // 날짜 포맷팅
        const startMonth = monday.getMonth() + 1;
        const startDay = monday.getDate();
        const endMonth = sunday.getMonth() + 1;
        const endDay = sunday.getDate();

        // 같은 달이면 "24일~30일", 다른 달이면 "27일~11월1일"
        const dateRange = startMonth === endMonth
          ? `${startDay}일~${endDay}일`
          : `${startDay}일~${endMonth}월${endDay}일`;

        return {
          left: `${now.getMonth() + 1}월`,
          right: dateRange,
        };
      }
      case Period.MONTH:
        return {
          left: `${now.getMonth() + 1}월`,
          right: null,
        };
      case Period.YEAR:
        return {
          left: `${now.getFullYear()}년`,
          right: null,
        };
      default:
        return { left: '', right: null };
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
          normalizedData.map((point, index) => {
            const barHeight = getBarHeight(point.distanceKm);
            const barX = getBarXPosition(point);
            const barY = CHART_PADDING.top + chartInnerHeight - barHeight;

            // 상단만 둥근 막대 (하단은 직선)
            const pathData = createRoundedTopBarPath(barX, barY, barWidth, barHeight, barWidth / 2);

            return (
              <Path
                key={`bar-${index}`}
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
