/**
 * Statistics Main Screen
 * Figma 디자인: #2_메인페이지_기존유저_월단위화면 기반
 *
 * 주요 기능:
 * - 주/월/년 단위 필터 선택
 * - 통계 요약 (러닝 횟수, 총 거리, 페이스)
 * - 기간별 차트 (바 차트)
 * - 무한 스크롤 러닝 기록 리스트
 * - Empty State (데이터 없을 때)
 */

import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Period, PeriodDirection, calculateNextReferenceDate } from '../models';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStatisticsViewModel } from '../viewmodels';
import { DateFilterTabs } from './components/DateFilterTabs';
import { SwipeablePeriodChart } from './components/SwipeablePeriodChart';
import { RunningRecordList } from './components/RunningRecordList';
import { StatisticsSummaryCard } from './components/StatisticsSummaryCard';
import { StatisticsErrorBoundary } from './components/StatisticsErrorBoundary';
import { PRIMARY, GREY } from '~/shared/styles';
import { getMainTabBarScrollContentPaddingBottom } from '~/shared/utils/safeAreaPolicy';

export const StatisticsView = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(Period.MONTH);
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const insets = useSafeAreaInsets();

  const {
    summary,
    formattedSummary,
    chartData,
    formattedChartData,
    isLoading,
    isInitialLoading,
    isBackgroundFetching,
    hasError,
    hasValidData,
    error,
    handleRefresh,
    currentPeriodRange,
    // 프리페치 데이터
    prevChartData,
    nextChartData,
    prevReferenceDate,
    nextReferenceDate,
    prevIsEmpty,
    nextIsEmpty,
  } = useStatisticsViewModel(selectedPeriod, referenceDate);

  // 사용자 주도 Pull-to-Refresh 상태 (로컬 관리)
  // isRefetching은 날짜 변경 등 모든 백그라운드 페칭에서 true가 되어
  // RefreshControl 애니메이션이 의도치 않게 발생하므로 분리
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // 수동 새로고침 핸들러
  const onManualRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await handleRefresh();
    } finally {
      setIsManualRefreshing(false);
    }
  }, [handleRefresh]);

  // 탭 포커스 시 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      console.log('📊 [STATISTICS_VIEW] 탭 포커스 - 데이터 새로고침');
      handleRefresh();
    }, [handleRefresh])
  );

  // 기간 변경 핸들러 - period가 변경되면 referenceDate를 오늘로 리셋
  const onPeriodChange = (period: Period) => {
    setSelectedPeriod(period);
    setReferenceDate(new Date()); // 탭 전환 시 오늘로 리셋
  };

  // 스와이프 기간 변경 핸들러
  const handleSwipePeriodChange = useCallback((direction: PeriodDirection) => {
    setReferenceDate(prev => calculateNextReferenceDate(prev, selectedPeriod, direction));
  }, [selectedPeriod]);

  // 데이터 상태 계산
  const isEmpty = !hasValidData;
  const displaySummary = formattedSummary || summary;

  // 컨텐츠 렌더링 함수
  const renderContent = () => {
    // 로딩 상태 (초기 로딩)
    if (isLoading && !hasValidData) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PRIMARY[600]} />
          <Text style={styles.loadingText}>통계를 불러오는 중...</Text>
        </View>
      );
    }

    // 에러 상태 (초기 로딩 실패)
    if (hasError && !hasValidData) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>데이터를 불러올 수 없습니다</Text>
          <Text style={styles.errorSubText}>
            {error?.message || '네트워크를 확인해주세요'}
          </Text>
        </View>
      );
    }

    // 정상 데이터 또는 Empty 상태
    return (
      <>
        {/* 상단: 날짜 필터 탭 */}
        <DateFilterTabs selected={selectedPeriod} onSelect={onPeriodChange} />

        {/* 기간별 차트 (스와이프 가능) */}
        <SwipeablePeriodChart
          data={isEmpty ? [] : (formattedChartData || chartData || [])}
          period={selectedPeriod}
          isEmpty={isEmpty}
          referenceDate={referenceDate}
          onSwipePeriodChange={handleSwipePeriodChange}
          isInitialLoading={isInitialLoading}
          isBackgroundFetching={isBackgroundFetching}
          // 프리페치 데이터 전달
          prevData={prevChartData}
          prevReferenceDate={prevReferenceDate}
          prevIsEmpty={prevIsEmpty}
          nextData={nextChartData}
          nextReferenceDate={nextReferenceDate}
          nextIsEmpty={nextIsEmpty}
        />

        {/* 통계 요약 카드 */}
        {isEmpty ? (
          <StatisticsSummaryCard
            runCount={0}
            totalDistance={0}
            averagePace={0}
          />
        ) : (
          displaySummary && (
            <StatisticsSummaryCard
              runCount={displaySummary.runCount}
              totalDistance={displaySummary.totalDistance}
              averagePace={displaySummary.averagePace || 0}
            />
          )
        )}

        {/* Empty State 또는 러닝 기록 리스트 */}
        <RunningRecordList
          startDate={currentPeriodRange.startDate}
          endDate={currentPeriodRange.endDate}
          emptyMessage="선택한 기간에 러닝 기록이 없어요."
        />
      </>
    );
  };

  return (
    <StatisticsErrorBoundary onRetry={handleRefresh}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: getMainTabBarScrollContentPaddingBottom(insets.bottom) },
          ]}
          refreshControl={
            <RefreshControl refreshing={isManualRefreshing} onRefresh={onManualRefresh} />
          }
        >
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </StatisticsErrorBoundary>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GREY[50],
  },
  container: {
    flex: 1,
    backgroundColor: GREY[50],
  },
  scrollContent: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GREY[50],
    padding: 20,
    minHeight: 400,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: GREY[500],
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: GREY[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    fontWeight: '500',
    color: GREY[500],
    textAlign: 'center',
  },
});
