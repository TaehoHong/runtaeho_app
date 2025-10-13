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

import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import { Period } from '../models';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStatisticsViewModel } from '../viewmodels';
import { DateFilterTabs } from './components/DateFilterTabs';
import { PeriodChart } from './components/PeriodChart';
import { RunningRecordList } from './components/RunningRecordList';
import { StatisticsSummaryCard } from './components/StatisticsSummaryCard';

export const StatisticsView = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(Period.MONTH);

  const {
    formattedSummary,
    chartData,
    formattedChartData,
    localStats,
    isLoading,
    isRefreshing,
    hasError,
    hasValidData,
    errors,
    handlePeriodChange,
    handleRefresh,
  } = useStatisticsViewModel(selectedPeriod);

  // 기간 변경 핸들러
  const onPeriodChange = (period: Period) => {
    setSelectedPeriod(period);
    handlePeriodChange(period);
  };

  // 데이터 상태 계산
  const isEmpty = !hasValidData || (localStats && localStats.runCount === 0);
  const displaySummary = formattedSummary || localStats;

  // 컨텐츠 렌더링 함수
  const renderContent = () => {
    // 로딩 상태 (초기 로딩)
    if (isLoading && !hasValidData) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#45DA31" />
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
            {errors.summary?.message || errors.records?.message || '네트워크를 확인해주세요'}
          </Text>
        </View>
      );
    }

    // 정상 데이터 또는 Empty 상태
    return (
      <>
        {/* 상단: 날짜 필터 탭 */}
        <DateFilterTabs selected={selectedPeriod} onSelect={onPeriodChange} />

        {/* 기간별 차트 */}
        <PeriodChart
          data={isEmpty ? [] : (formattedChartData || chartData || [])}
          period={selectedPeriod}
          isEmpty={isEmpty}
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
        <RunningRecordList period={selectedPeriod} />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
    minHeight: 400,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#9D9D9D',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202020',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9D9D9D',
    textAlign: 'center',
  },
});
