/**
 * Shoe 모델
 */

/**
 * 신발 기본 모델
 */
export interface Shoe {
  id: number;
  brand: string;
  model: string;
  totalDistance: number; // in meters
  targetDistance?: number | undefined; // optional target distance in meters
  isMain: boolean;
  isEnabled: boolean;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

/**
 * 신발 추가 DTO
 */
export interface AddShoeDto {
  brand: string;
  model: string;
  targetDistance: number;
  isMain: boolean;
}

/**
 * 신발 수정 DTO
 */
export interface PatchShoeDto {
  id: number;
  brand?: string | undefined;
  model?: string | undefined;
  targetDistance?: number | undefined;
  isMain?: boolean | undefined;
  isEnabled?: boolean | undefined;
  isDeleted?: boolean | undefined;
}

/**
 * 신발 목록 요청 파라미터
 */
export interface ShoeListRequest {
  cursor?: number | undefined;
  isEnabled?: boolean | undefined;
  size?: number | undefined;
}

/**
 * 신발 뷰모델
 */
export interface ShoeViewModel {
  id: number;
  brand: string;
  model: string;
  targetDistance?: number | undefined;
  totalDistance: number;
  isMain: boolean;
  isAchieved: boolean;
  displayName: string;
  formattedDistance: string;
  imageSystemName: string;
  progressPercentage: number;
  remainingDistance: number;
}

/**
 * 커서 결과 모델 (재export)
 * 실제 타입 정의는 ~/shared/utils/dto/CursorResult 참조
 */
export type { CursorResult } from '~/shared/utils/dto/CursorResult';

/**
 * 신발 생성 헬퍼 함수
 * Swift Shoe init 메서드 대응
 */
export const createShoe = (
  id: number = 0,
  brand: string,
  model: string,
  totalDistance: number = 0,
  targetDistance: number | undefined = undefined,
  isMain: boolean = false,
  isEnabled: boolean = false
): Shoe => ({
  id,
  brand,
  model,
  totalDistance,
  targetDistance: targetDistance,
  isMain,
  isEnabled,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/**
 * 신발 뷰모델 생성
 * Swift ShoeViewModel init 메서드 대응
 */
export const createShoeViewModel = (shoe: Shoe): ShoeViewModel => {
  const displayName = `${shoe.brand} ${shoe.model}`;
  const formattedDistance = `총 누적 거리 ${(shoe.totalDistance / 1000).toFixed(2)}km`;
  const isAchieved = !shoe.isEnabled;

  // 진행률 계산
  let progressPercentage = 0;
  let remainingDistance = 0;

  if (shoe.targetDistance && shoe.targetDistance > 0) {
    progressPercentage = Math.min((shoe.totalDistance / shoe.targetDistance) * 100, 100);
    remainingDistance = Math.max(shoe.targetDistance - shoe.totalDistance, 0);
  }

  const result: ShoeViewModel = {
    id: shoe.id,
    brand: shoe.brand,
    model: shoe.model,
    targetDistance: shoe.targetDistance,
    totalDistance: shoe.totalDistance,
    isMain: shoe.isMain,
    isAchieved,
    displayName,
    formattedDistance,
    imageSystemName: 'shoeprints.fill',
    progressPercentage: Math.round(progressPercentage * 100) / 100,
    remainingDistance,
  };

  return result;
};

/**
 * 신발 추가 DTO 생성
 * Swift AddShoeDto 대응
 */
export const createAddShoeDto = (
  brand: string,
  model: string,
  targetDistance: number,
  isMain: boolean = false
): AddShoeDto => ({
  brand,
  model,
  targetDistance,
  isMain,
});

/**
 * 신발 수정 DTO 생성
 * Swift PatchShoeDto 대응
 */
export const createPatchShoeDto = (
  id: number,
  updates: Partial<Omit<PatchShoeDto, 'id'>>
): PatchShoeDto => ({
  id,
  ...updates,
});

/**
 * 신발 유효성 검증
 */
export const validateShoe = (shoe: Partial<Shoe>): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!shoe.brand || shoe.brand.trim().length === 0) {
    errors.push('브랜드를 입력해주세요.');
  }

  if (!shoe.model || shoe.model.trim().length === 0) {
    errors.push('모델명을 입력해주세요.');
  }

  if (shoe.targetDistance !== undefined && shoe.targetDistance < 0) {
    errors.push('목표 거리는 0 이상이어야 합니다.');
  }

  if (shoe.totalDistance !== undefined && shoe.totalDistance < 0) {
    errors.push('총 거리는 0 이상이어야 합니다.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 신발 포맷팅 헬퍼 함수들
 */
export const formatShoeDistance = (distanceInMeters: number): string => {
  const km = distanceInMeters / 1000;
  return `${km.toFixed(2)}km`;
};

export const formatShoeProgress = (current: number, target?: number): string => {
  if (!target || target === 0) return '목표 없음';

  const percentage = Math.min((current / target) * 100, 100);
  return `${percentage.toFixed(1)}%`;
};

export const formatRemainingDistance = (current: number, target?: number): string => {
  if (!target || target === 0) return '목표 없음';

  const remaining = Math.max(target - current, 0);
  return remaining > 0 ? `${formatShoeDistance(remaining)} 남음` : '목표 달성!';
};

/**
 * 신발 상태 분석
 */
export const analyzeShoeStatus = (shoe: Shoe): {
  status: 'new' | 'active' | 'worn' | 'retired' | 'achieved';
  statusMessage: string;
  recommendation: string;
} => {
  const kmDistance = shoe.totalDistance / 1000;

  if (!shoe.isEnabled) {
    return {
      status: 'retired',
      statusMessage: '은퇴한 신발',
      recommendation: '추억을 간직하세요.',
    };
  }

  if (shoe.targetDistance && shoe.totalDistance >= shoe.targetDistance) {
    return {
      status: 'achieved',
      statusMessage: '목표 달성!',
      recommendation: '새로운 목표를 설정하거나 새 신발을 고려해보세요.',
    };
  }

  if (kmDistance === 0) {
    return {
      status: 'new',
      statusMessage: '새 신발',
      recommendation: '첫 러닝을 시작해보세요!',
    };
  }

  if (kmDistance < 100) {
    return {
      status: 'active',
      statusMessage: '활동 중',
      recommendation: '꾸준히 러닝을 이어가세요.',
    };
  }

  if (kmDistance < 500) {
    return {
      status: 'worn',
      statusMessage: '많이 신은 신발',
      recommendation: '신발 상태를 주기적으로 확인하세요.',
    };
  }

  return {
    status: 'worn',
    statusMessage: '교체 고려',
    recommendation: '새 신발 구매를 고려해보세요.',
  };
};

/**
 * 신발 목록 필터링
 */
export const filterShoes = (
  shoes: Shoe[],
  filters: {
    isEnabled?: boolean;
    isMain?: boolean;
    brand?: string;
    hasTarget?: boolean;
    isAchieved?: boolean;
  }
): Shoe[] => {
  return shoes.filter(shoe => {
    if (filters.isEnabled !== undefined && shoe.isEnabled !== filters.isEnabled) {
      return false;
    }

    if (filters.isMain !== undefined && shoe.isMain !== filters.isMain) {
      return false;
    }

    if (filters.brand && !shoe.brand.toLowerCase().includes(filters.brand.toLowerCase())) {
      return false;
    }

    if (filters.hasTarget !== undefined) {
      const hasTarget = !!shoe.targetDistance && shoe.targetDistance > 0;
      if (hasTarget !== filters.hasTarget) return false;
    }

    if (filters.isAchieved !== undefined && shoe.targetDistance) {
      const isAchieved = shoe.totalDistance >= shoe.targetDistance;
      if (isAchieved !== filters.isAchieved) return false;
    }

    return true;
  });
};

/**
 * 신발 정렬
 */
export const sortShoes = (
  shoes: Shoe[],
  sortBy: 'brand' | 'model' | 'totalDistance' | 'targetDistance' | 'createdAt' = 'createdAt',
  order: 'asc' | 'desc' = 'desc'
): Shoe[] => {
  return [...shoes].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'brand':
        comparison = a.brand.localeCompare(b.brand);
        break;
      case 'model':
        comparison = a.model.localeCompare(b.model);
        break;
      case 'totalDistance':
        comparison = a.totalDistance - b.totalDistance;
        break;
      case 'targetDistance':
        comparison = (a.targetDistance || 0) - (b.targetDistance || 0);
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });
};

/**
 * 메인 신발 찾기
 */
export const findMainShoe = (shoes: Shoe[]): Shoe | null => {
  return shoes.find(shoe => shoe.isMain && shoe.isEnabled) || null;
};

/**
 * 신발 통계 계산
 */
export const calculateShoeStatistics = (shoes: Shoe[]) => {
  const enabledShoes = shoes.filter(shoe => shoe.isEnabled);
  const totalDistance = shoes.reduce((sum, shoe) => sum + shoe.totalDistance, 0);
  const averageDistance = shoes.length > 0 ? totalDistance / shoes.length : 0;

  const achievedGoals = shoes.filter(shoe =>
    shoe.targetDistance && shoe.totalDistance >= shoe.targetDistance
  ).length;

  const shoesWithGoals = shoes.filter(shoe => shoe.targetDistance && shoe.targetDistance > 0).length;
  const achievementRate = shoesWithGoals > 0 ? (achievedGoals / shoesWithGoals) * 100 : 0;

  return {
    totalShoes: shoes.length,
    activeShoes: enabledShoes.length,
    retiredShoes: shoes.length - enabledShoes.length,
    totalDistance: Math.round(totalDistance),
    averageDistance: Math.round(averageDistance),
    achievedGoals,
    shoesWithGoals,
    achievementRate: Math.round(achievementRate * 100) / 100,
  };
};