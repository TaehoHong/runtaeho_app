/**
 * MyRankCard Component
 * 내 순위 정보 카드
 *
 * 순위 상승 시 애니메이션 효과:
 * - 이전 순위에서 현재 순위로 1초간 카운트다운 애니메이션
 */

// 🔥 파일 로드 확인용 - 이 로그가 안 나오면 다른 파일이 사용되고 있음
console.log('🔥🔥🔥 [MyRankCard.tsx] 파일 로드됨! 타임스탬프:', Date.now());

import { useEffect, useRef, useState } from 'react';
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
  previousRank?: number | undefined; // 이전 순위 (러닝 완료 후 전달)
}

export const MyRankCard = ({
  myRank,
  totalParticipants,
  myDistanceFormatted,
  promotionCutRank,
  relegationCutRank,
  promotionStatus,
  progressPosition,
  previousRank,
}: MyRankCardProps) => {
  const [displayRank, setDisplayRank] = useState(myRank);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // previousRank가 유효한 값으로 변경될 때 애니메이션 실행
  useEffect(() => {
    console.log(`🎯 [MyRankCard] useEffect 실행:`, { previousRank, myRank, displayRank });

    // 이전 인터벌 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // 애니메이션 조건: previousRank가 있고, 현재 순위보다 큰 경우 (순위 상승)
    if (previousRank !== undefined && previousRank > myRank) {
      console.log(`🎯 [MyRankCard] 카운트다운 애니메이션 시작: ${previousRank} → ${myRank}`);

      // 시작값 설정
      let currentRank = previousRank;
      setDisplayRank(currentRank);
      setIsAnimating(true);

      // 총 단계 수와 간격 계산
      const totalSteps = previousRank - myRank;
      const intervalTime = 1000 / totalSteps; // 1초를 단계 수로 나눔

      console.log(`🎯 [MyRankCard] 총 ${totalSteps}단계, 간격 ${intervalTime}ms`);

      // setInterval로 순위 감소
      intervalRef.current = setInterval(() => {
        currentRank -= 1;
        console.log(`🎯 [MyRankCard] 현재 표시 순위: ${currentRank}`);
        setDisplayRank(currentRank);

        if (currentRank <= myRank) {
          console.log(`🎯 [MyRankCard] 애니메이션 완료`);
          setIsAnimating(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, intervalTime);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsAnimating(false);
      };
    } else {
      // previousRank가 없으면 바로 현재 순위 표시
      setDisplayRank(myRank);
      setIsAnimating(false);
    }
  }, [previousRank, myRank]);

  // 렌더링 로그 - 매 렌더마다 출력
  console.log(`🖼️ [MyRankCard] 렌더링: displayRank=${displayRank}, myRank=${myRank}, isAnimating=${isAnimating}`);

  // 프로그레스 바 영역 비율 계산
  const promotionZoneWidth = (promotionCutRank / totalParticipants) * 100;
  const relegationZoneWidth = ((totalParticipants - relegationCutRank + 1) / totalParticipants) * 100;
  const markerPosition = progressPosition * 100;

  return (
    <View style={[
      styles.container,
      isAnimating && styles.animatingContainer,
    ]}>
      {/* 내 순위 */}
      <View style={styles.row}>
        <View style={styles.rankSection}>
          <Text style={[
            styles.label,
            isAnimating && styles.animatingLabel,
          ]}>
            {isAnimating ? '🎯 순위 상승 중!' : '내 순위'}
          </Text>
          <View style={styles.rankDisplay}>
            <Text style={[
              styles.rankNumber,
              isAnimating && styles.animatingRankNumber,
            ]}>
              {displayRank}
            </Text>
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

      {/* 프로그레스 바 - 애니메이션 중에는 숨김 */}
      {!isAnimating && (
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
      )}
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
  // 애니메이션 중 스타일
  animatingContainer: {
    backgroundColor: PRIMARY[50],
    borderWidth: 3,
    borderColor: PRIMARY[600],
  },
  animatingLabel: {
    color: PRIMARY[600],
    fontSize: 14,
  },
  animatingRankNumber: {
    color: PRIMARY[600],
    fontSize: 48,
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
