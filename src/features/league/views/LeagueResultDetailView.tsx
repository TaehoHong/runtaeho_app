/**
 * LeagueResultDetailView
 * 리그 결과 상세 화면 (순위, 거리, 보상 포인트)
 *
 * 피그마: #리그_결과_상세
 */

import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import {
  type LeagueResult,
  LeagueResultStatus,
  formatDistance,
} from '../models';
import { leagueService } from '../services';
import { LeagueResultCharacterView, RankingSection } from './components';
import { PRIMARY, GREY } from '~/shared/styles';

interface LeagueResultDetailViewProps {
  result: LeagueResult;
}

export const LeagueResultDetailView = ({ result }: LeagueResultDetailViewProps) => {
  const router = useRouter();

  // 결과 확인 완료 API
  const confirmMutation = useMutation({
    mutationFn: leagueService.confirmResult,
    onSuccess: () => {
      // 메인 리그 화면으로 이동
      router.replace('/(tabs)/league' as any);
    },
    onError: (error) => {
      console.error('결과 확인 실패:', error);
      // 에러가 나도 메인으로 이동
      router.replace('/(tabs)/league' as any);
    },
  });

  // 확인 버튼 클릭
  const handleConfirm = () => {
    confirmMutation.mutate();
  };

  // 거리 포맷팅
  const distanceFormatted = formatDistance(result.totalDistance);

  // 승급 시에만 보상 포인트 표시
  const showRewardPoints =
    result.resultStatus === LeagueResultStatus.PROMOTED &&
    result.rewardPoints != null &&
    result.rewardPoints > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 상단 캐릭터 영역 (Unity) */}
      <LeagueResultCharacterView resultStatus={result.resultStatus} />

      {/* 결과 콘텐츠 */}
      <View style={styles.contentContainer}>
        {/* 순위 & 거리 */}
        <View style={styles.statsRow}>
          {/* 최종 순위 */}
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>최종 순위</Text>
            <Text style={styles.statValue}>
              {result.finalRank}위 / {result.totalParticipants}명
            </Text>
          </View>

          {/* 총 거리 */}
          <View style={[styles.statItem, styles.statItemRight]}>
            <Text style={styles.statLabel}>총 거리</Text>
            <Text style={[styles.statValue, styles.distanceValue]}>
              {distanceFormatted}
            </Text>
          </View>
        </View>

        {/* 보상 포인트 카드 (승급 시에만) */}
        {showRewardPoints && (
          <View style={styles.rewardCard}>
            <Text style={styles.rewardLabel}>승격 보상 포인트</Text>
            <Text style={styles.rewardValue}>+{result.rewardPoints} P</Text>
          </View>
        )}

        {/* 순위표 */}
        {result.participants.length > 0 && (
          <View style={styles.rankingSectionWrapper}>
            <RankingSection
              participants={result.participants}
              previousRank={undefined}
              isRefreshing={false}
            />
          </View>
        )}

        {/* 확인 버튼 */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          disabled={confirmMutation.isPending}
        >
          <Text style={styles.confirmButtonText}>
            {confirmMutation.isPending ? '처리 중...' : '확인'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREY[50],
  },
  contentContainer: {
    flex: 1,
    backgroundColor: GREY.WHITE,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
  },
  statItemRight: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
    fontWeight: '400',
    color: GREY[500],
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: GREY[900],
  },
  distanceValue: {
    color: PRIMARY[600],
  },
  rewardCard: {
    backgroundColor: '#D4F5CD',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 24,
  },
  rewardLabel: {
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
    fontWeight: '400',
    color: PRIMARY[600],
    marginBottom: 4,
  },
  rewardValue: {
    fontSize: 28,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: PRIMARY[600],
  },
  rankingSectionWrapper: {
    flex: 1,
    marginHorizontal: -16, // contentContainer의 paddingHorizontal 상쇄
    minHeight: 200,
  },
  confirmButton: {
    backgroundColor: PRIMARY[600],
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 16,
  },
  confirmButtonText: {
    fontSize: 18,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    color: GREY.WHITE,
  },
});
