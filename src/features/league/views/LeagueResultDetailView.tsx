import { useAppTranslation } from '~/i18n';
import { ScrollView, StyleSheet, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { NativeText as Text } from '~/shared/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  type LeagueResult,
  LeagueResultStatus,
  formatDistance,
} from '../models';
import { useConfirmResult } from '../services';
import { LeagueResultCharacterView, RankingSection } from './components';
import { PRIMARY, GREY } from '~/shared/styles';
import { RunningStatusFormat } from '~/shared/utils/formatters';

interface LeagueResultDetailViewProps {
  result: LeagueResult;
  participantId?: number | undefined;
}

export const LeagueResultDetailView = ({ result, participantId }: LeagueResultDetailViewProps) => {
  const t = useAppTranslation();
  const { height, fontScale } = useWindowDimensions();
  const expanded = fontScale > 1.3;
  const scrollSummary = height < 680 || expanded;
  // 결과 확인 완료 API (캐시 무효화 포함)
  const confirmMutation = useConfirmResult(participantId);

  // 확인 버튼 클릭
  const handleConfirm = () => {
    confirmMutation.mutate(undefined, {
      onSuccess: () => {
        // /league 스택을 완전히 빠져나가기: 2번 back
        router.back(); // result-detail → result
        router.back(); // result → 탭(원래 위치)
      },
      onError: (error) => {
        console.error('결과 확인 실패:', error);
        // 에러가 나도 메인으로 이동
        router.back();
        router.back();
      },
    });
  };

  // 거리 포맷팅
  const distanceFormatted = formatDistance(result.totalDistance);

  // 승급 시에만 보상 포인트 표시
  const showRewardPoints =
    result.resultStatus === LeagueResultStatus.PROMOTED &&
    result.rewardPoints != null &&
    result.rewardPoints > 0;

  const summary = (
    <View style={styles.summary}>
      <View style={[styles.statsRow, expanded && styles.statsStack]}>
        <View style={[styles.statItem, expanded && styles.statItemExpanded]}>
          <Text style={styles.statLabel}>{t("최종 순위")}</Text>
          <Text style={styles.statValue}>
            {result.finalRank}{t("위 / ")}{result.totalParticipants}{t("명")}
          </Text>
        </View>

        <View style={[styles.statItem, expanded ? styles.statItemExpanded : styles.statItemRight]}>
          <Text style={styles.statLabel}>{t("총 거리")}</Text>
          <Text style={[styles.statValue, !expanded && styles.distanceValue]}>{distanceFormatted}</Text>
        </View>
      </View>

      {showRewardPoints && (
        <View style={styles.rewardCard}>
          <Text style={styles.rewardLabel}>{t("승격 보상 포인트")}</Text>
          <Text style={styles.rewardValue}>
            {RunningStatusFormat.points(result.rewardPoints, { signed: true, useGrouping: true })}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <LeagueResultCharacterView resultStatus={result.resultStatus} />

      <View style={styles.contentContainer}>
        {result.participants.length === 0 ? (
          <ScrollView>{summary}</ScrollView>
        ) : (
          <>
            {!scrollSummary && summary}
            <RankingSection
              participants={result.participants}
              variant="result"
              pageHeader={scrollSummary ? summary : undefined}
            />
          </>
        )}

        {/* 확인 버튼 */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          disabled={confirmMutation.isPending}
          accessibilityRole="button"
          accessibilityState={{ busy: confirmMutation.isPending, disabled: confirmMutation.isPending }}
        >
          <Text style={styles.confirmButtonText}>
            {confirmMutation.isPending ? t("처리 중...") : t("확인")}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: GREY.WHITE,
    paddingHorizontal: 16,
  },
  summary: {
    paddingTop: 28,
    paddingBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    minWidth: 0,
  },
  statsStack: {
    flexDirection: 'column',
    gap: 16,
  },
  statItemExpanded: {
    flex: 0,
  },
  statItemRight: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
    fontWeight: '400',
    color: GREY[700],
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: GREY[900],
  },
  distanceValue: {
    textAlign: 'right',
  },
  rewardCard: {
    backgroundColor: '#D4F5CD',
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 18,
    gap: 8,
  },
  rewardLabel: {
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
    fontWeight: '400',
    color: PRIMARY[950],
  },
  rewardValue: {
    fontSize: 20,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: PRIMARY[950],
  },
  confirmButton: {
    backgroundColor: PRIMARY[600],
    minHeight: 56,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  confirmButtonText: {
    fontSize: 18,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    color: GREY[900],
    textAlign: 'center',
  },
});
