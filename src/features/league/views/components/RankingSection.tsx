/**
 * RankingSection Component
 * 순위표 섹션
 *
 * 순위 상승 애니메이션:
 * - "나"가 위로 연속적으로 올라감 (멈춤 없음)
 * - 밀려나는 항목들이 시차를 두고 아래로 이동
 * - 스케일 효과로 이동 중인 항목 강조
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { GREY, PRIMARY } from '~/shared/styles';
import type { LeagueParticipant } from '../../models';
import { RankItem } from './RankItem';

const RANK_ITEM_HEIGHT = 56;
const STEP_DURATION = 200; // 각 칸 이동 시간 (ms)

interface RankingSectionProps {
  participants: LeagueParticipant[];
  previousRank?: number;
}

export const RankingSection = ({ participants, previousRank }: RankingSectionProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<LeagueParticipant[]>([]);

  // "나" 애니메이션 값
  const myAnimatedY = useRef(new Animated.Value(0)).current;
  const myAnimatedScale = useRef(new Animated.Value(1)).current;

  // 밀려나는 항목들의 애니메이션 값 (최대 10개 지원)
  const displacedAnimations = useRef(
    Array.from({ length: 10 }, () => new Animated.Value(0))
  ).current;

  // "나" 참가자 찾기
  const myParticipant = participants.find(p => p.isMe);
  const myCurrentRank = myParticipant?.rank ?? 0;

  // 실제 시작 위치 (참가자 수 초과 시 마지막 위치로 제한)
  const effectiveStartRank = previousRank !== undefined
    ? Math.min(previousRank, participants.length)
    : myCurrentRank;

  // 이동해야 할 칸 수
  const totalSteps = effectiveStartRank - myCurrentRank;

  // 애니메이션 실행
  useEffect(() => {
    if (previousRank === undefined || myCurrentRank <= 0 || totalSteps <= 0) {
      setDisplayOrder([...participants]);
      setIsAnimating(false);
      return;
    }

    // 초기 순서 설정 (나를 previousRank 위치에 배치)
    const reordered = createInitialOrder(participants, myCurrentRank, previousRank);
    setDisplayOrder(reordered);
    setIsAnimating(true);

    // 애니메이션 값 초기화
    myAnimatedY.setValue(0);
    myAnimatedScale.setValue(1);
    displacedAnimations.forEach(anim => anim.setValue(0));

    console.log(`🏆 [RankingSection] 연속 밀어내기 애니메이션 시작: ${effectiveStartRank}위 → ${myCurrentRank}위 (${totalSteps}칸)`);

    // 전체 애니메이션 시간
    const totalDuration = STEP_DURATION * totalSteps;

    // "나"의 이동 애니메이션 (연속)
    const myMoveAnimation = Animated.timing(myAnimatedY, {
      toValue: -RANK_ITEM_HEIGHT * totalSteps,
      duration: totalDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    // 스케일 업 애니메이션
    const scaleUpAnimation = Animated.timing(myAnimatedScale, {
      toValue: 1.1,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    // 밀려나는 항목들의 애니메이션 (시차 적용)
    const displacedMoveAnimations: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < totalSteps; i++) {
      const delay = STEP_DURATION * i;
      displacedMoveAnimations.push(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(displacedAnimations[i]!, {
            toValue: RANK_ITEM_HEIGHT,
            duration: STEP_DURATION,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      );
    }

    // 스케일 다운 애니메이션
    const scaleDownAnimation = Animated.timing(myAnimatedScale, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    // 전체 애니메이션 실행
    Animated.sequence([
      // 스케일 업과 동시에 이동 + 밀어내기 시작
      Animated.parallel([
        scaleUpAnimation,
        myMoveAnimation,
        ...displacedMoveAnimations,
      ]),
      // 완료 후 스케일 다운
      scaleDownAnimation,
    ]).start(() => {
      console.log(`🏆 [RankingSection] 애니메이션 완료`);
      setIsAnimating(false);
      setDisplayOrder([...participants]); // 최종 순서로 복원
    });
  }, [previousRank, myCurrentRank, totalSteps, participants]);

  // "나"의 초기 인덱스 (애니메이션 시작 위치)
  const myInitialIndex = displayOrder.findIndex(p => p.isMe);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>순위표</Text>
      </View>

      {/* 순위 리스트 */}
      <View style={styles.list}>
        {displayOrder.map((participant, index) => {
          // 애니메이션 중인 "나" 항목
          if (participant.isMe && isAnimating) {
            return (
              <Animated.View
                key={`me-${participant.rank}`}
                style={[
                  styles.animatedItem,
                  {
                    transform: [
                      { translateY: myAnimatedY },
                      { scale: myAnimatedScale },
                    ],
                  },
                ]}
              >
                <View style={styles.animatedMeContent}>
                  <Text style={styles.animatedRank}>{myCurrentRank}</Text>
                  <View style={styles.animatedAvatar} />
                  <Text style={styles.animatedName}>나</Text>
                  <Text style={styles.animatedDistance}>
                    {(participant.distance / 1000).toFixed(2)}km
                  </Text>
                </View>
              </Animated.View>
            );
          }

          // 애니메이션 중 밀려나는 항목들 ("나" 위의 항목들)
          if (isAnimating && myInitialIndex > 0) {
            // "나"의 위에 있는 항목들 (밀려날 항목들)
            const displacedIndex = myInitialIndex - 1 - index;
            if (displacedIndex >= 0 && displacedIndex < totalSteps) {
              return (
                <Animated.View
                  key={`displaced-${participant.rank}-${index}`}
                  style={[
                    styles.displacedItem,
                    {
                      transform: [{ translateY: displacedAnimations[displacedIndex] }],
                    },
                  ]}
                >
                  <RankItem
                    participant={{
                      ...participant,
                      rank: index + 1,
                    }}
                  />
                </Animated.View>
              );
            }
          }

          // 일반 항목
          return (
            <RankItem
              key={participant.rank}
              participant={{
                ...participant,
                rank: index + 1,
              }}
            />
          );
        })}
      </View>
    </View>
  );
};

/**
 * 초기 순서 생성: "나"를 previousRank 위치에 배치
 * previousRank가 참가자 수를 초과하면 마지막 위치에 배치
 */
function createInitialOrder(
  participants: LeagueParticipant[],
  myCurrentRank: number,
  previousRank: number
): LeagueParticipant[] {
  const myParticipant = participants.find(p => p.isMe);
  if (!myParticipant) return [...participants];

  // "나"를 제외한 참가자들
  const others = participants.filter(p => !p.isMe);

  // previousRank가 참가자 수를 초과하면 마지막 위치로 제한
  const targetIndex = Math.min(previousRank - 1, participants.length - 1);

  // "나"를 targetIndex 위치에 삽입
  const result: LeagueParticipant[] = [];
  let otherIndex = 0;

  for (let i = 0; i < participants.length; i++) {
    if (i === targetIndex) {
      result.push(myParticipant);
    } else {
      if (otherIndex < others.length) {
        result.push(others[otherIndex]!);
        otherIndex++;
      }
    }
  }

  console.log(`🏆 [createInitialOrder] 결과:`, result.map((p, idx) => `${idx + 1}: ${p.isMe ? '나' : p.name}`).join(', '));

  return result;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: GREY.WHITE,
    marginHorizontal: 16,
    marginTop: 23,
    borderRadius: 8,
    paddingBottom: 16,
    minHeight: 400,
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    color: GREY[900],
  },
  list: {
    paddingHorizontal: 16,
  },
  animatedItem: {
    zIndex: 10,
  },
  displacedItem: {
    zIndex: 5,
  },
  animatedMeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY[50],
    paddingHorizontal: 10,
    paddingVertical: 12,
    height: 56,
    gap: 12,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: PRIMARY[600],
    shadowColor: PRIMARY[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  animatedRank: {
    fontSize: 16,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: PRIMARY[600],
    minWidth: 24,
    textAlign: 'center',
  },
  animatedAvatar: {
    width: 32,
    height: 32,
    backgroundColor: PRIMARY[600],
    borderRadius: 4,
  },
  animatedName: {
    fontSize: 14,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    color: PRIMARY[600],
    flex: 1,
  },
  animatedDistance: {
    fontSize: 14,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: PRIMARY[600],
  },
});
