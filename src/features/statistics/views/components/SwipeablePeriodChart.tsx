/**
 * Swipeable Period Chart Component
 *
 * 차트 영역을 좌우 스와이프하여 이전/다음 기간 전환
 * - ScrollView 기반으로 네이티브 스크롤 느낌 제공
 * - 우로 스와이프: 이전 기간
 * - 좌로 스와이프: 다음 기간
 * - 미래 날짜 스와이프 제한
 *
 * 깜빡임 방지:
 * - 이전 차트 데이터 캐싱으로 전환 중에도 차트 표시
 * - 페이드 애니메이션 제거 (즉시 투명화가 깜빡임 원인)
 * - 스크롤 리셋 후 상태 업데이트로 순서 보장
 */

import React, { useRef, useCallback, useMemo, memo, useState, useEffect } from 'react';
import {
  ScrollView,
  Dimensions,
  StyleSheet,
  View,
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { ChartDataPoint } from '../../models';
import { Period, PeriodDirection, isFutureDate, calculateNextReferenceDate } from '../../models';
import { PeriodChart } from './PeriodChart';
import { PRIMARY } from '~/shared/styles';

interface SwipeablePeriodChartProps {
  data: ChartDataPoint[];
  period: Period;
  isEmpty?: boolean;
  referenceDate: Date;
  onSwipePeriodChange: (direction: PeriodDirection) => void;
  /** 초기 로딩 상태 (캐시 없음) - 오버레이 표시 */
  isInitialLoading?: boolean;
  /** 백그라운드 페칭 상태 (캐시 있음) - 오버레이 표시 안함 */
  isBackgroundFetching?: boolean;

  // 프리페치 데이터 (스와이프 시 깜빡임 방지)
  prevData?: ChartDataPoint[];
  prevReferenceDate?: Date;
  prevIsEmpty?: boolean;
  nextData?: ChartDataPoint[];
  nextReferenceDate?: Date;
  nextIsEmpty?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * 캐시된 차트 데이터 타입
 */
interface CachedChartData {
  data: ChartDataPoint[];
  isEmpty: boolean;
  referenceDate: Date;
}

const SwipeablePeriodChartComponent: React.FC<SwipeablePeriodChartProps> = ({
  data,
  period,
  isEmpty = false,
  referenceDate,
  onSwipePeriodChange,
  isInitialLoading = false,
  isBackgroundFetching = false,
  // 프리페치 데이터
  prevData,
  prevReferenceDate: prevRefDateProp,
  prevIsEmpty: prevIsEmptyProp,
  nextData,
  nextReferenceDate: nextRefDateProp,
  nextIsEmpty: nextIsEmptyProp,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);

  // 이전 차트 데이터 캐싱 (깜빡임 방지)
  // 새 데이터가 로딩되는 동안 이전 데이터를 계속 표시
  const [cachedChart, setCachedChart] = useState<CachedChartData>({
    data,
    isEmpty,
    referenceDate,
  });

  // 캐시 업데이트 조건:
  // 1. 백그라운드 페칭 중이 아닐 때 (데이터와 referenceDate가 일치)
  // 2. 또는 초기 로딩이 완료되었을 때
  // 이렇게 하면 referenceDate는 변경되었지만 data는 이전 값인 상태(불일치)에서
  // 캐시가 업데이트되지 않아 깜빡임 방지
  useEffect(() => {
    // 백그라운드 페칭 중이면 캐시 업데이트 보류
    // (referenceDate와 data 불일치 상태)
    if (isBackgroundFetching) {
      return;
    }

    // 데이터 페칭 완료 후 캐시 업데이트
    setCachedChart({
      data,
      isEmpty,
      referenceDate,
    });
  }, [data, isEmpty, referenceDate, isBackgroundFetching]);

  // 이전 기간의 referenceDate 계산 (캐시된 날짜 기준)
  const previousReferenceDate = useMemo(() => {
    return calculateNextReferenceDate(cachedChart.referenceDate, period, PeriodDirection.PREVIOUS);
  }, [cachedChart.referenceDate, period]);

  // 다음 기간의 referenceDate 계산 (캐시된 날짜 기준)
  const nextReferenceDate = useMemo(() => {
    return calculateNextReferenceDate(cachedChart.referenceDate, period, PeriodDirection.NEXT);
  }, [cachedChart.referenceDate, period]);

  // 미래 날짜 체크 (다음 기간으로 스와이프 가능 여부)
  const canSwipeToNext = useMemo(() => {
    return !isFutureDate(nextReferenceDate, period);
  }, [nextReferenceDate, period]);

  // 스크롤 완료 시 기간 변경
  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // 이미 처리 중이면 무시
      if (isScrollingRef.current) return;

      const offsetX = event.nativeEvent.contentOffset.x;
      const pageIndex = Math.round(offsetX / SCREEN_WIDTH);

      let direction: PeriodDirection | null = null;
      if (pageIndex === 0) {
        // 우로 스와이프 → 이전 기간으로 이동
        direction = PeriodDirection.PREVIOUS;
      } else if (pageIndex === 2) {
        // 좌로 스와이프 → 다음 기간으로 이동
        direction = PeriodDirection.NEXT;
      }

      if (direction !== null) {
        isScrollingRef.current = true;
        const capturedDirection = direction;

        // 1. 캐시를 프리페치 데이터로 즉시 업데이트 (스크롤 리셋 전!)
        // 이렇게 하면 스크롤 리셋 후 중앙 슬롯에 새 기간 데이터가 즉시 표시됨
        if (capturedDirection === PeriodDirection.NEXT && nextData && nextRefDateProp) {
          setCachedChart({
            data: nextData,
            isEmpty: nextIsEmptyProp ?? nextData.length === 0,
            referenceDate: nextRefDateProp,
          });
        } else if (capturedDirection === PeriodDirection.PREVIOUS && prevData && prevRefDateProp) {
          setCachedChart({
            data: prevData,
            isEmpty: prevIsEmptyProp ?? prevData.length === 0,
            referenceDate: prevRefDateProp,
          });
        }

        // 2. 스크롤을 중앙으로 리셋 (즉시, 애니메이션 없이)
        scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });

        // 3. 다음 프레임에서 상태 업데이트
        // requestAnimationFrame을 사용하여 스크롤 리셋이 완료된 후 상태 업데이트
        requestAnimationFrame(() => {
          // 상태 업데이트 → referenceDate 변경 → 새 데이터 페칭
          // 캐시는 이미 프리페치 데이터로 업데이트됨 → 깜빡임 없음
          onSwipePeriodChange(capturedDirection);

          // 4. 상태 업데이트 후 플래그 리셋
          requestAnimationFrame(() => {
            isScrollingRef.current = false;
          });
        });
      }
    },
    [
      onSwipePeriodChange,
      nextData,
      nextIsEmptyProp,
      nextRefDateProp,
      prevData,
      prevIsEmptyProp,
      prevRefDateProp,
    ]
  );

  // 스크롤 시작 시 상태 초기화
  const handleScrollBeginDrag = useCallback(() => {
    // 드래그 시작하면 스크롤 플래그 리셋
    isScrollingRef.current = false;
  }, []);

  return (
    <View style={styles.container}>
      {/* 초기 로딩 시에만 오버레이 표시 (캐시된 데이터가 있으면 표시 안함) */}
      {isInitialLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={PRIMARY[600]} />
        </View>
      )}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollBeginDrag={handleScrollBeginDrag}
        scrollEventThrottle={16}
        bounces={false}
        contentOffset={{ x: SCREEN_WIDTH, y: 0 }}
        scrollEnabled={!isInitialLoading}
      >
        {/* 이전 기간 - 프리페치 데이터 사용 */}
        <View style={styles.chartSlot}>
          <PeriodChart
            data={prevData ?? []}
            period={period}
            isEmpty={prevIsEmptyProp ?? true}
            referenceDate={prevRefDateProp ?? previousReferenceDate}
          />
        </View>

        {/* 현재 기간 - 캐시된 데이터 사용 */}
        <View style={styles.chartSlot}>
          <PeriodChart
            data={cachedChart.data}
            period={period}
            isEmpty={cachedChart.isEmpty}
            referenceDate={cachedChart.referenceDate}
          />
        </View>

        {/* 다음 기간 - 프리페치 데이터 사용 (미래면 렌더링하지 않음) */}
        {canSwipeToNext && (
          <View style={styles.chartSlot}>
            <PeriodChart
              data={nextData ?? []}
              period={period}
              isEmpty={nextIsEmptyProp ?? true}
              referenceDate={nextRefDateProp ?? nextReferenceDate}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  chartSlot: {
    width: SCREEN_WIDTH,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 8,
  },
});

/**
 * memo로 감싸서 불필요한 리렌더링 방지
 *
 * 주의: 내부에서 cachedChart를 사용하므로 props 변경에 덜 민감함
 * isInitialLoading 변경은 허용 (로딩 오버레이 제어)
 */
export const SwipeablePeriodChart = memo(SwipeablePeriodChartComponent, (prev, next) => {
  // period 변경은 항상 리렌더링
  if (prev.period !== next.period) return false;

  // isInitialLoading 변경은 항상 리렌더링 (로딩 오버레이)
  if (prev.isInitialLoading !== next.isInitialLoading) return false;

  // data, referenceDate, isEmpty는 내부 캐시로 관리되므로
  // 변경되어도 리렌더링 필요 (useEffect에서 캐시 업데이트)
  const dataEqual =
    prev.data.length === next.data.length &&
    prev.data.every((item, i) => {
      const nextItem = next.data[i];
      return (
        nextItem !== undefined &&
        item.datetime === nextItem.datetime &&
        item.distance === nextItem.distance
      );
    });

  if (!dataEqual) return false;
  if (prev.referenceDate.getTime() !== next.referenceDate.getTime()) return false;
  if (prev.isEmpty !== next.isEmpty) return false;

  return true;
});
