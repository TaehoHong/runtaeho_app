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

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GREY, PRIMARY } from '~/shared/styles';
import { useLeagueCheckStore } from '~/stores';
import { useAppStore } from '~/stores/app/appStore';
import { useLeagueCheck } from '../hooks';
import { useLeagueViewModel } from '../viewmodels';
import { LeagueHeader } from './components/LeagueHeader';
import { LeagueNotJoinedView } from './components/LeagueNotJoinedView';
import { MyRankCard } from './components/MyRankCard';
import { RankingSection } from './components/RankingSection';

export const LeagueView = () => {
  const router = useRouter();
  const [hasCheckedResult, setHasCheckedResult] = useState(false);

  // 이전 리그 순위 (애니메이션용) - running-finished에서 설정됨
  const previousLeagueRank = useAppStore((state) => state.previousLeagueRank);
  const setPreviousLeagueRank = useAppStore((state) => state.setPreviousLeagueRank);

  // 미확인 결과 (Single Point of Truth: AuthProvider에서 API 호출, Store에서 상태 참조)
  const pendingResult = useLeagueCheckStore((state) => state.pendingResult);
  const clearPendingResult = useLeagueCheckStore((state) => state.clearPendingResult);

  // 리그 결과 체크 함수
  const { checkUncheckedLeagueResult } = useLeagueCheck();

  // 미확인 결과가 있으면 결과 화면으로 리다이렉트
  useEffect(() => {
    if (pendingResult && !hasCheckedResult) {
      setHasCheckedResult(true);
      router.push({
        pathname: '/league/result' as const,
        params: { resultData: JSON.stringify(pendingResult) },
      } as any);
      clearPendingResult();
    } else if (!pendingResult && !hasCheckedResult) {
      setHasCheckedResult(true);
    }
  }, [pendingResult, hasCheckedResult, router, clearPendingResult]);

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

  // 탭 포커스 시 데이터 새로고침 및 리그 결과 재확인
  useFocusEffect(
    useCallback(() => {
      // 현재 리그 정보 갱신
      handleRefresh();

      // 리그 결과 재확인 (포그라운드 정산 감지용)
      useLeagueCheckStore.getState().allowRecheck();
      checkUncheckedLeagueResult();
    }, [handleRefresh, checkUncheckedLeagueResult])
  );

  // 순위가 변경되면 애니메이션 후 previousLeagueRank 초기화
  useEffect(() => {
    if (formattedData?.myRank && previousLeagueRank !== null) {
      // 애니메이션 시간(1초) 후 초기화
      const timer = setTimeout(() => {
        setPreviousLeagueRank(null);
      }, 1100);

      return () => clearTimeout(timer);
    }
  }, [formattedData?.myRank, previousLeagueRank, setPreviousLeagueRank]);

  // 컨텐츠 렌더링 함수
  const renderContent = () => {
    // 로딩 상태
    if (isLoading && !hasValidData) {
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

          {/* 순위표 (스크롤 가능 영역) */}
          <RankingSection
            participants={formattedData.participants}
            previousRank={previousLeagueRank ?? undefined}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        </>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* 개발 모드 애니메이션 테스트 버튼 */}
          <View style={styles.devTestContainer}>
            <Text style={styles.devTestLabel}>🧪 애니메이션 테스트</Text>
            <View style={styles.devTestButtons}>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => setPreviousLeagueRank(5)}
              >
                <Text style={styles.devButtonText}>5→현재</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => setPreviousLeagueRank(15)}
              >
                <Text style={styles.devButtonText}>15→현재</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.devButton, styles.devButtonReset]}
                onPress={() => setPreviousLeagueRank(null)}
              >
                <Text style={styles.devButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        {renderContent()}
      </View>
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
  // 개발 모드 테스트 버튼 스타일
  devTestContainer: {
    backgroundColor: '#FFF3CD',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFEEBA',
  },
  devTestLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 6,
  },
  devTestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  devButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  devButtonReset: {
    backgroundColor: '#FF3B30',
  },
  devButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
