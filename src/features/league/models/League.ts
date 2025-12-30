/**
 * League 모델
 * 백엔드 API Response와 매핑되는 타입 정의
 */

/**
 * 리그 티어 타입
 * 백엔드 LeagueTierType enum과 동일
 */
export enum LeagueTierType {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
  CHALLENGER = 'CHALLENGER',
}

/**
 * 티어별 표시 정보
 */
export const TIER_INFO: Record<LeagueTierType, {
  displayName: string;
  color: string;
  order: number;
}> = {
  [LeagueTierType.BRONZE]: {
    displayName: 'BRONZE',
    color: '#CD7F32',
    order: 1,
  },
  [LeagueTierType.SILVER]: {
    displayName: 'SILVER',
    color: '#C0C0C0',
    order: 2,
  },
  [LeagueTierType.GOLD]: {
    displayName: 'GOLD',
    color: '#FFD600',
    order: 3,
  },
  [LeagueTierType.PLATINUM]: {
    displayName: 'PLATINUM',
    color: '#00CED1',
    order: 4,
  },
  [LeagueTierType.DIAMOND]: {
    displayName: 'DIAMOND',
    color: '#B9F2FF',
    order: 5,
  },
  [LeagueTierType.CHALLENGER]: {
    displayName: 'CHALLENGER',
    color: '#FF4500',
    order: 6,
  },
};

/**
 * 리그 참가자 정보
 * 백엔드 ParticipantResponse 매핑
 */
export interface LeagueParticipant {
  id: number;
  rank: number;
  nickname: string | null;
  distance: number; // 미터 단위
  isMe: boolean;
  isBot: boolean;
}

/**
 * 현재 리그 정보
 * 백엔드 CurrentLeagueResponse 매핑
 */
export interface CurrentLeague {
  sessionId: number;
  tierName: string;
  myRank: number;
  totalParticipants: number;
  myDistance: number; // 미터 단위
  promotionCutRank: number;
  relegationCutRank: number;
  remainingDays: number;
  seasonEndDatetime: string; // ISO 8601 형식
  participants: LeagueParticipant[];
}

/**
 * 리그 프로필 정보 (확장용)
 */
export interface LeagueProfile {
  currentTier: LeagueTierType;
  totalSeasons: number;
  highestTier: LeagueTierType;
  totalDistance: number;
  averageRank: number;
}

/**
 * 거리 포맷팅 헬퍼 (미터 -> km)
 */
export const formatDistance = (meters: number): string => {
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
};

/**
 * 티어 이름을 enum으로 변환
 */
export const getTierType = (tierName: string): LeagueTierType => {
  const tier = tierName.toUpperCase() as LeagueTierType;
  return Object.values(LeagueTierType).includes(tier)
    ? tier
    : LeagueTierType.BRONZE;
};

/**
 * 리그 결과 상태
 * 백엔드 PromotionStatus enum과 동일
 */
export enum LeagueResultStatus {
  PROMOTED = 'PROMOTED',     // 승급
  MAINTAINED = 'MAINTAINED', // 유지
  RELEGATED = 'RELEGATED',   // 강등
  REBIRTH = 'REBIRTH',       // 환생 (최고 티어 → 재시작)
}

/**
 * 리그 결과 응답
 * 백엔드 LeagueResultResponse 매핑
 */
export interface LeagueResult {
  previousTier: LeagueTierType;
  currentTier: LeagueTierType;
  resultStatus: LeagueResultStatus;
  finalRank: number;
  totalParticipants: number;
  totalDistance: number;       // 미터 단위
  rewardPoints: number | null; // 승급 시에만 존재
}

/**
 * 결과 상태별 메시지 생성
 */
export const getResultMessage = (
  status: LeagueResultStatus,
  tierName: string
): { title: string; subtitle: string } => {
  switch (status) {
    case LeagueResultStatus.PROMOTED:
      return {
        title: '축하합니다!',
        subtitle: `${tierName} 리그로 승급했습니다`,
      };
    case LeagueResultStatus.MAINTAINED:
      return {
        title: '수고하셨습니다!',
        subtitle: `${tierName} 리그에 잔류합니다`,
      };
    case LeagueResultStatus.RELEGATED:
      return {
        title: '아쉽습니다',
        subtitle: `${tierName} 리그로 강등되었습니다`,
      };
    case LeagueResultStatus.REBIRTH:
      return {
        title: '환생!',
        subtitle: '다시 처음부터 시작합니다',
      };
  }
};

/**
 * 승격/강등 상태 계산
 */
export type PromotionStatus = 'PROMOTION' | 'MAINTAIN' | 'RELEGATION';

export const getPromotionStatus = (
  myRank: number,
  promotionCutRank: number,
  relegationCutRank: number
): PromotionStatus => {
  if (myRank <= promotionCutRank) {
    return 'PROMOTION';
  } else if (myRank >= relegationCutRank) {
    return 'RELEGATION';
  }
  return 'MAINTAIN';
};

/**
 * 프로그레스 바 위치 계산 (0~1 비율)
 */
export const calculateProgressPosition = (
  myRank: number,
  totalParticipants: number
): number => {
  if (totalParticipants <= 1) return 0;
  return (myRank - 1) / (totalParticipants - 1);
};
