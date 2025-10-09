/**
 * Lazy Loading 컴포넌트들
 * 성능 최적화를 위한 지연 로딩 컴포넌트
 */

import React, { Suspense, lazy } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '~/shared/components/typography';
// ==========================================
// 로딩 컴포넌트
// ==========================================

const LoadingFallback: React.FC<{ message?: string }> = ({ message = '로딩 중...' }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#2196F3" />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

// ==========================================
// Lazy 컴포넌트들
// ==========================================

// Unity 테스트 화면 (큰 컴포넌트)
export const LazyUnityTestScreen = lazy(() =>
  import('../../features/unity/UnityScreen').then(module => ({
    default: module.UnityScreen,
  }))
);

// 통계 관련 컴포넌트들
// 통계 관련 컴포넌트들 (실제 컴포넌트가 생성되면 활성화)
// export const LazyStatisticComponents = {
//   PersonalRecords: lazy(() =>
//     import('../../features/statistics/components/PersonalRecordsView').then(module => ({
//       default: module.PersonalRecordsView,
//     })).catch(() => ({ default: () => <Text>컴포넌트를 불러올 수 없습니다.</Text> }))
//   ),
//   TrendsChart: lazy(() =>
//     import('../../features/statistics/components/TrendsChartView').then(module => ({
//       default: module.TrendsChartView,
//     })).catch(() => ({ default: () => <Text>차트를 불러올 수 없습니다.</Text> }))
//   ),
// };

// ==========================================
// Suspense Wrapper 컴포넌트
// ==========================================

interface SuspenseWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorMessage?: string;
}

export const SuspenseWrapper: React.FC<SuspenseWrapperProps> = ({
  children,
  fallback,
  errorMessage = '컴포넌트를 불러오는 중 오류가 발생했습니다.',
}) => {
  return (
    <Suspense fallback={fallback || <LoadingFallback />}>
      {children}
    </Suspense>
  );
};

// ==========================================
// 고차 컴포넌트: withLazyLoading
// ==========================================

export const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingMessage?: string
) => {
  const LazyComponent: React.FC<P> = (props) => (
    <SuspenseWrapper fallback={<LoadingFallback message={loadingMessage} />}>
      <Component {...props} />
    </SuspenseWrapper>
  );

  LazyComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  return LazyComponent;
};

// ==========================================
// 스타일
// ==========================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});