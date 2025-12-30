/**
 * RankingSection Component
 * 순위표 섹션
 *
 * 순위 상승 애니메이션:
 * - "나"가 위로 올라가면서 다른 참가자를 아래로 밀어냄
 * - 단계별로 한 칸씩 스왑하며 연속 이동
 * - 스케일 효과로 이동 중인 항목 강조
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { GREY, PRIMARY } from '~/shared/styles';
import type { LeagueParticipant } from '../../models';
import { RankItem } from './RankItem';

const RANK_ITEM_HEIGHT = 56;
const STEP_DURATION = 250; // 각 단계 애니메이션 시간 (ms)

interface RankingSectionProps {
  participants: LeagueParticipant[];
  previousRank?: number;
}

export const RankingSection = ({ participants, previousRank }: RankingSectionProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [displayOrder, setDisplayOrder] = useState<LeagueParticipant[]>([]);

  // 애니메이션 값
  const myAnimatedY = useRef(new Animated.Value(0)).current;
  const myAnimatedScale = useRef(new Animated.Value(1)).current;
  const displacedAnimatedY = useRef(new Animated.Value(0)).current;

  // "나" 참가자 찾기
  const myParticipant = participants.find(p => p.isMe);
  const myCurrentRank = myParticipant?.rank ?? 0;

  // 실제 시작 위치 (참가자 수 초과 시 마지막 위치로 제한)
  const effectiveStartRank = previousRank !== undefined
    ? Math.min(previousRank, participants.length)
    : myCurrentRank;

  // 이동해야 할 칸 수
  const totalSteps = effectiveStartRank - myCurrentRank;

  // 초기 순서 설정 (previousRank 기준)
  useEffect(() => {
    if (previousRank !== undefined && myCurrentRank > 0 && totalSteps > 0) {
      const reordered = createInitialOrder(participants, myCurrentRank, previousRank);
      setDisplayOrder(reordered);
      setCurrentStep(0);
      setIsAnimating(true);

      // 애니메이션 값 초기화
      myAnimatedY.setValue(0);
      myAnimatedScale.setValue(1);
      displacedAnimatedY.setValue(0);

      console.log(`🏆 [RankingSection] 밀어내기 애니메이션 시작: ${effectiveStartRank}위 → ${myCurrentRank}위`);
    } else {
      setDisplayOrder([...participants]);
      setIsAnimating(false);
    }
  }, [previousRank, myCurrentRank, totalSteps, participants]);

  // 단계별 애니메이션 실행 (멈춤 없이 연속)
  useEffect(() => {
    if (!isAnimating || !previousRank) return;

    const isFirstStep = currentStep === 0;

    if (currentStep >= totalSteps) {
      // 애니메이션 완료 - 스케일 다운 후 종료
      Animated.timing(myAnimatedScale, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        console.log(`🏆 [RankingSection] 애니메이션 완료`);
        setIsAnimating(false);
        setDisplayOrder([...participants]);
      });
      return;
    }

    // Y값 초기화
    myAnimatedY.setValue(0);
    displacedAnimatedY.setValue(0);

    // 애니메이션 배열 구성
    const animations: Animated.CompositeAnimation[] = [
      // "나" 위로 이동
      Animated.timing(myAnimatedY, {
        toValue: -RANK_ITEM_HEIGHT,
        duration: STEP_DURATION,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      // 밀려나는 항목 아래로 이동
      Animated.timing(displacedAnimatedY, {
        toValue: RANK_ITEM_HEIGHT,
        duration: STEP_DURATION,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ];

    // 첫 스텝에서만 스케일 업
    if (isFirstStep) {
      animations.push(
        Animated.timing(myAnimatedScale, {
          toValue: 1.1,
          duration: STEP_DURATION * 0.5,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start(() => {
      // 순서 업데이트 후 즉시 다음 스텝
      setDisplayOrder(prev => {
        const newOrder = [...prev];
        const myIndex = newOrder.findIndex(p => p.isMe);
        if (myIndex > 0) {
          [newOrder[myIndex - 1], newOrder[myIndex]] = [newOrder[myIndex], newOrder[myIndex - 1]];
        }
        return newOrder;
      });
      setCurrentStep(prev => prev + 1);
    });
  }, [isAnimating, currentStep, previousRank, totalSteps, myAnimatedY, myAnimatedScale, displacedAnimatedY, participants]);

  // displayOrder에서 "나"의 현재 인덱스 찾기
  const myIndexInDisplay = displayOrder.findIndex(p => p.isMe);

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
                  <Text style={styles.animatedRank}>{index + 1}</Text>
                  <View style={styles.animatedAvatar} />
                  <Text style={styles.animatedName}>나</Text>
                  <Text style={styles.animatedDistance}>
                    {(participant.distance / 1000).toFixed(2)}km
                  </Text>
                </View>
              </Animated.View>
            );
          }

          // 애니메이션 중 밀려나는 항목 (나의 바로 위 항목)
          if (isAnimating && index === myIndexInDisplay - 1) {
            return (
              <Animated.View
                key={`displaced-${participant.rank}`}
                style={[
                  styles.displacedItem,
                  {
                    transform: [{ translateY: displacedAnimatedY }],
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
