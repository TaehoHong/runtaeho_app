/**
 * MyRankCard Component
 * 내 순위 정보 카드
 */

import { StyleSheet, Text, View } from 'react-native';
import { PRIMARY, GREY, RED } from '~/shared/styles';
import type { PromotionStatus } from '../../models';

interface MyRankCardProps {
  myRank: number;
  totalParticipants: number;
  myDistanceFormatted: string;
  promotionCutRank: number;
  relegationCutRank: number;
  promotionStatus: PromotionStatus;
  progressPosition: number; // 0~1 비율
}

export const MyRankCard = ({
  myRank,
  totalParticipants,
  myDistanceFormatted,
  promotionCutRank,
  relegationCutRank,
  promotionStatus,
  progressPosition,
}: MyRankCardProps) => {
  // 프로그레스 바 영역 비율 계산
  const promotionZoneWidth = (promotionCutRank / totalParticipants) * 100;
  const relegationZoneWidth = ((totalParticipants - relegationCutRank + 1) / totalParticipants) * 100;
  const markerPosition = progressPosition * 100;

  return (
    <View style={styles.container}>
      {/* 내 순위 */}
      <View style={styles.row}>
        <View style={styles.rankSection}>
          <Text style={styles.label}>내 순위</Text>
          <View style={styles.rankDisplay}>
            <Text style={styles.rankNumber}>{myRank}</Text>
            <Text style={styles.rankUnit}>위</Text>
            <Text style={styles.totalParticipants}>/ {totalParticipants}명</Text>
          </View>
        </View>

        {/* 주간 거리 */}
        <View style={styles.distanceSection}>
          <Text style={styles.label}>주간 거리</Text>
          <Text style={styles.distanceValue}>{myDistanceFormatted}</Text>
        </View>
      </View>

      {/* 프로그레스 바 */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          {/* 승격 영역 */}
          <View
            style={[
              styles.promotionZone,
              { width: `${promotionZoneWidth}%` },
            ]}
          />
          {/* 강등 영역 */}
          <View
            style={[
              styles.relegationZone,
              { width: `${relegationZoneWidth}%` },
            ]}
          />
          {/* 내 위치 마커 */}
          <View
            style={[
              styles.myPositionMarker,
              { left: `${markerPosition}%` },
              promotionStatus === 'PROMOTION' && styles.markerPromotion,
              promotionStatus === 'RELEGATION' && styles.markerRelegation,
            ]}
          />
        </View>

        {/* 레이블 */}
        <View style={styles.progressLabels}>
          <Text style={styles.promotionLabel}>승격 (상위 30%)</Text>
          <Text style={styles.maintainLabel}>유지</Text>
          <Text style={styles.relegationLabel}>강등 (하위 20%)</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: GREY.WHITE,
    marginHorizontal: 14,
    marginTop: 23,
    padding: 16,
    borderRadius: 8,
    height: 140,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rankSection: {
    flex: 1,
  },
  distanceSection: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    color: GREY[500],
    marginBottom: 8,
  },
  rankDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  rankNumber: {
    fontSize: 36,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: GREY[900],
  },
  rankUnit: {
    fontSize: 18,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    color: GREY[900],
  },
  totalParticipants: {
    fontSize: 14,
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
    color: GREY[500],
    marginLeft: 4,
  },
  distanceValue: {
    fontSize: 24,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: PRIMARY[600],
  },
  progressBarContainer: {
    marginTop: 16,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: GREY[100],
    borderRadius: 4,
    position: 'relative',
    overflow: 'visible',
  },
  promotionZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 8,
    backgroundColor: PRIMARY[600],
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  relegationZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: 8,
    backgroundColor: RED.DEFAULT,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  myPositionMarker: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    backgroundColor: PRIMARY[600],
    borderWidth: 2,
    borderColor: GREY.WHITE,
    borderRadius: 2,
    marginLeft: -8, // 중앙 정렬
  },
  markerPromotion: {
    backgroundColor: PRIMARY[600],
  },
  markerRelegation: {
    backgroundColor: RED.DEFAULT,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  promotionLabel: {
    fontSize: 10,
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
    color: PRIMARY[600],
  },
  maintainLabel: {
    fontSize: 10,
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
    color: GREY[500],
  },
  relegationLabel: {
    fontSize: 10,
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
    color: RED.DEFAULT,
  },
});
