/**
 * League Main Screen
 * 리그 메인 화면
 *
 * 주요 기능:
 * - 현재 티어 표시
 * - 내 순위 및 거리 표시
 * - 승격/강등 프로그레스 바
 * - 주변 순위 리스트
 * - 미확인 결과 체크 후 결과 화면으로 리다이렉트
 */

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useLeagueViewModel } from '../viewmodels';
import { useGetUncheckedResult } from '../services';
import { useAppStore } from '~/stores/app/appStore';
import { LeagueHeader } from './components/LeagueHeader';
import { MyRankCard } from './components/MyRankCard';
import { RankingSection } from './components/RankingSection';
import { LeagueNotJoinedView } from './components/LeagueNotJoinedView';
import { PRIMARY, GREY } from '~/shared/styles';

export const LeagueView = () => {
  const router = useRouter();
  const [hasCheckedResult, setHasCheckedResult] = useState(false);

  // 이전 리그 순위 (애니메이션용) - running-finished에서 설정됨
  const previousLeagueRank = useAppStore((state) => state.previousLeagueRank);
  const setPreviousLeagueRank = useAppStore((state) => state.setPreviousLeagueRank);

  // 미확인 결과 조회
  const { data: uncheckedResult, isLoading: isCheckingResult } = useGetUncheckedResult({
    enabled: !hasCheckedResult,
  });

  // 미확인 결과가 있으면 결과 화면으로 리다이렉트
  useEffect(() => {
    if (!isCheckingResult && uncheckedResult && !hasCheckedResult) {
      setHasCheckedResult(true);
      console.log('🏆 [LEAGUE_VIEW] 미확인 결과 발견, 결과 화면으로 이동');
      router.push({
        pathname: '/league/result' as const,
        params: { resultData: JSON.stringify(uncheckedResult) },
      } as any);
    } else if (!isCheckingResult && !uncheckedResult) {
      setHasCheckedResult(true);
    }
  }, [isCheckingResult, uncheckedResult, hasCheckedResult, router]);

  const {
    formattedData,
    isLoading,
    isRefreshing,
    hasError,
    hasValidData,
    isNotJoined,
    error,
    handleRefresh,
  } = useLeagueViewModel();

  // 탭 포커스 시 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      console.log('🏆 [LEAGUE_VIEW] 탭 포커스 - 데이터 새로고침');
      handleRefresh();
    }, [handleRefresh])
  );

  // 순위가 변경되면 애니메이션 후 previousLeagueRank 초기화
  useEffect(() => {
    if (formattedData?.myRank && previousLeagueRank !== null) {
      // 애니메이션 시간(1초) 후 초기화
      const timer = setTimeout(() => {
        console.log('🏆 [LEAGUE_VIEW] 이전 순위 초기화');
        setPreviousLeagueRank(null);
      }, 1100);

      return () => clearTimeout(timer);
    }
  }, [formattedData?.myRank, previousLeagueRank, setPreviousLeagueRank]);

  // 컨텐츠 렌더링 함수
  const renderContent = () => {
    // 디버그 로그
    console.log('🏆 [LEAGUE_VIEW] renderContent 상태:', {
      isCheckingResult,
      hasCheckedResult,
      isLoading,
      hasValidData,
      hasError,
      isNotJoined,
      formattedData: formattedData ? 'exists' : 'null',
      error: error?.message ?? 'none',
    });

    // 결과 체크 중이거나 로딩 상태
    if ((isCheckingResult && !hasCheckedResult) || (isLoading && !hasValidData)) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PRIMARY[600]} />
          <Text style={styles.loadingText}>리그 정보를 불러오는 중...</Text>
        </View>
      );
    }

    // 에러 상태
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

    // 리그 미참가 상태
    if (isNotJoined) {
      return <LeagueNotJoinedView />;
    }

    // 정상 데이터
    if (formattedData) {
      return (
        <>
          {/* 상단: 티어 정보 */}
          <LeagueHeader tierType={formattedData.tierType} />

          {/* 내 순위 카드 */}
          <MyRankCard
            myRank={formattedData.myRank}
            totalParticipants={formattedData.totalParticipants}
            myDistanceFormatted={formattedData.myDistanceFormatted}
            promotionCutRank={formattedData.promotionCutRank}
            relegationCutRank={formattedData.relegationCutRank}
            promotionStatus={formattedData.promotionStatus}
            progressPosition={formattedData.progressPosition}
          />

          {/* 순위표 */}
          <RankingSection
            participants={formattedData.participants}
            previousRank={previousLeagueRank ?? undefined}
          />

          {/* 개발용 애니메이션 테스트 버튼 */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.devTestButton}
              onPress={() => {
                // 현재 순위보다 5위 낮은 순위(숫자가 큼)에서 시작하는 애니메이션 테스트
                const testPreviousRank = formattedData.myRank + 5;
                console.log(`🧪 [DEV] 애니메이션 테스트 시작: ${testPreviousRank} → ${formattedData.myRank}`);

                // 먼저 previousRank를 초기화하여 새 애니메이션 트리거 준비
                setPreviousLeagueRank(null);

                // 다음 렌더 사이클에서 새 previousRank 설정
                setTimeout(() => {
                  setPreviousLeagueRank(testPreviousRank);
                  console.log(`🧪 [DEV] previousLeagueRank 설정됨: ${testPreviousRank}`);
                }, 50);
              }}
            >
              <Text style={styles.devTestButtonText}>🧪 순위 상승 애니메이션 테스트</Text>
            </TouchableOpacity>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
    backgroundColor: GREY.WHITE,
  },
  container: {
    flex: 1,
    backgroundColor: GREY[50],
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // 탭바 영역 확보
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
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
    color: GREY[500],
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    color: GREY[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
    color: GREY[500],
    textAlign: 'center',
  },
  devTestButton: {
    marginHorizontal: 14,
    marginTop: 16,
    padding: 12,
    backgroundColor: GREY[200],
    borderRadius: 8,
    alignItems: 'center',
  },
  devTestButtonText: {
    fontSize: 14,
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
    color: GREY[700],
  },
});
