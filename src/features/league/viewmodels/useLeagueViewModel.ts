/**
 * League ViewModel
 * 리그 화면 비즈니스 로직
 */

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../services/queryClient';
import { useGetCurrentLeague, useJoinLeague } from '../services';
import {
  formatDistance,
  getTierType,
  getPromotionStatus,
  calculateProgressPosition,
  type CurrentLeague,
  type LeagueParticipant,
  type PromotionStatus,
} from '../models';

export interface FormattedLeagueData {
  // 티어 정보
  tierName: string;
  tierType: ReturnType<typeof getTierType>;

  // 내 순위 정보
  myRank: number;
  totalParticipants: number;
  myDistanceFormatted: string;
  myDistanceMeters: number;

  // 승격/강등 정보
  promotionStatus: PromotionStatus;
  promotionCutRank: number;
  relegationCutRank: number;
  progressPosition: number; // 0~1 비율

  // 시즌 정보
  seasonNumber: number;
  remainingDays: number;

  // 참가자 목록 (내 주변)
  participants: LeagueParticipant[];
  myParticipant: LeagueParticipant | null;
}

export const useLeagueViewModel = () => {
  const queryClient = useQueryClient();

  // 현재 리그 정보 조회
  const {
    data: currentLeague,
    isLoading,
    isRefetching: isRefreshing,
    error,
    refetch,
  } = useGetCurrentLeague();

  // 리그 참가 뮤테이션
  const joinLeagueMutation = useJoinLeague();

  // 포맷된 리그 데이터
  const formattedData = useMemo((): FormattedLeagueData | null => {
    if (!currentLeague) return null;

    const tierType = getTierType(currentLeague.tierName);
    const promotionStatus = getPromotionStatus(
      currentLeague.myRank,
      currentLeague.promotionCutRank,
      currentLeague.relegationCutRank
    );
    const progressPosition = calculateProgressPosition(
      currentLeague.myRank,
      currentLeague.totalParticipants
    );

    const myParticipant = currentLeague.participants.find(p => p.isMe) ?? null;

    return {
      tierName: currentLeague.tierName,
      tierType,
      myRank: currentLeague.myRank,
      totalParticipants: currentLeague.totalParticipants,
      myDistanceFormatted: formatDistance(currentLeague.myDistance),
      myDistanceMeters: currentLeague.myDistance,
      promotionStatus,
      promotionCutRank: currentLeague.promotionCutRank,
      relegationCutRank: currentLeague.relegationCutRank,
      progressPosition,
      seasonNumber: currentLeague.seasonNumber,
      remainingDays: currentLeague.remainingDays,
      participants: currentLeague.participants,
      myParticipant,
    };
  }, [currentLeague]);

  // 새로고침 핸들러
  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // 리그 참가 핸들러
  const handleJoinLeague = useCallback(async () => {
    await joinLeagueMutation.mutateAsync();
  }, [joinLeagueMutation]);

  // 데이터 유효성 검사
  const hasValidData = currentLeague !== null && currentLeague !== undefined;
  const hasError = error !== null;
  const isNotJoined = !isLoading && !hasError && !hasValidData;

  return {
    // Raw 데이터
    currentLeague,

    // 포맷된 데이터
    formattedData,

    // 상태
    isLoading,
    isRefreshing,
    hasError,
    hasValidData,
    isNotJoined,
    error,

    // 액션
    handleRefresh,
    handleJoinLeague,
    isJoining: joinLeagueMutation.isPending,
  };
};
