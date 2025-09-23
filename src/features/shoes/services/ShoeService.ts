/**
 * Shoe Service
 * Swift ShoeService 비즈니스 로직을 TypeScript로 마이그레이션
 */

import {
  Shoe,
  ShoeViewModel,
  createShoeViewModel,
  validateShoe,
  analyzeShoeStatus,
  calculateShoeStatistics,
  formatShoeDistance,
  formatShoeProgress,
  formatRemainingDistance,
  findMainShoe,
  filterShoes,
  sortShoes,
} from '../models';

export class ShoeService {
  private static instance: ShoeService;

  private constructor() {}

  static getInstance(): ShoeService {
    if (!ShoeService.instance) {
      ShoeService.instance = new ShoeService();
    }
    return ShoeService.instance;
  }

  /**
   * 신발 수명 계산
   * Swift calculateShoeLifespan 메서드 대응
   */
  calculateShoeLifespan(shoe: Shoe): {
    lifespan: 'new' | 'early' | 'middle' | 'late' | 'end';
    lifespanPercentage: number;
    expectedLifespan: number;
    remainingLifespan: number;
    recommendation: string;
  } {
    const kmDistance = shoe.totalDistance / 1000;
    const expectedLifespan = 800; // 일반적인 러닝화 수명 (km)

    const lifespanPercentage = Math.min((kmDistance / expectedLifespan) * 100, 100);

    let lifespan: 'new' | 'early' | 'middle' | 'late' | 'end';
    let recommendation: string;

    if (lifespanPercentage <= 10) {
      lifespan = 'new';
      recommendation = '새 신발입니다. 천천히 적응해가세요.';
    } else if (lifespanPercentage <= 40) {
      lifespan = 'early';
      recommendation = '초기 단계입니다. 편안하게 러닝을 즐기세요.';
    } else if (lifespanPercentage <= 70) {
      lifespan = 'middle';
      recommendation = '중간 단계입니다. 여전히 좋은 상태를 유지하고 있습니다.';
    } else if (lifespanPercentage <= 90) {
      lifespan = 'late';
      recommendation = '후반 단계입니다. 신발 상태를 주의 깊게 관찰하세요.';
    } else {
      lifespan = 'end';
      recommendation = '교체 시기입니다. 새 신발 구매를 고려해보세요.';
    }

    const remainingLifespan = Math.max(expectedLifespan - kmDistance, 0);

    return {
      lifespan,
      lifespanPercentage: Math.round(lifespanPercentage * 100) / 100,
      expectedLifespan,
      remainingLifespan: Math.round(remainingLifespan),
      recommendation,
    };
  }

  /**
   * 신발별 성능 분석
   * Swift analyzeShoePerformance 메서드 대응
   */
  analyzeShoePerformance(shoes: Shoe[]): {
    totalPerformance: number;
    averageUsage: number;
    mostUsedShoe: Shoe | null;
    leastUsedShoe: Shoe | null;
    goalAchievementRate: number;
    recommendations: string[];
  } {
    if (shoes.length === 0) {
      return {
        totalPerformance: 0,
        averageUsage: 0,
        mostUsedShoe: null,
        leastUsedShoe: null,
        goalAchievementRate: 0,
        recommendations: ['신발을 추가해보세요.'],
      };
    }

    const activeShoes = shoes.filter(shoe => shoe.isEnabled);
    const totalDistance = shoes.reduce((sum, shoe) => sum + shoe.totalDistance, 0);
    const averageUsage = totalDistance / shoes.length;

    // 가장 많이/적게 사용한 신발
    const mostUsedShoe = shoes.reduce((max, shoe) =>
      shoe.totalDistance > max.totalDistance ? shoe : max
    );

    const leastUsedShoe = activeShoes.reduce((min, shoe) =>
      shoe.totalDistance < min.totalDistance ? shoe : min
    , activeShoes[0]) || null;

    // 목표 달성률
    const shoesWithGoals = shoes.filter(shoe => shoe.targetDistance && shoe.targetDistance > 0);
    const achievedGoals = shoesWithGoals.filter(shoe =>
      shoe.targetDistance && shoe.totalDistance >= shoe.targetDistance
    ).length;
    const goalAchievementRate = shoesWithGoals.length > 0 ? (achievedGoals / shoesWithGoals.length) * 100 : 0;

    // 전체 성능 점수 (0-100)
    const distanceScore = Math.min((totalDistance / 1000) / 500 * 50, 50); // 최대 50점
    const achievementScore = goalAchievementRate / 2; // 최대 50점
    const totalPerformance = distanceScore + achievementScore;

    // 추천사항
    const recommendations: string[] = [];

    if (activeShoes.length === 0) {
      recommendations.push('활성화된 신발이 없습니다. 신발을 활성화하세요.');
    } else if (activeShoes.length === 1) {
      recommendations.push('여분의 신발을 추가하는 것을 고려해보세요.');
    }

    if (goalAchievementRate < 50) {
      recommendations.push('목표 달성률이 낮습니다. 더 현실적인 목표를 설정해보세요.');
    }

    if (leastUsedShoe && leastUsedShoe.totalDistance === 0) {
      recommendations.push('사용하지 않은 신발이 있습니다. 로테이션을 고려해보세요.');
    }

    const oldShoes = shoes.filter(shoe => shoe.totalDistance > 500000); // 500km 이상
    if (oldShoes.length > 0) {
      recommendations.push('500km 이상 사용한 신발이 있습니다. 교체를 고려해보세요.');
    }

    return {
      totalPerformance: Math.round(totalPerformance),
      averageUsage: Math.round(averageUsage),
      mostUsedShoe,
      leastUsedShoe,
      goalAchievementRate: Math.round(goalAchievementRate * 100) / 100,
      recommendations,
    };
  }

  /**
   * 신발 로테이션 추천
   * Swift recommendShoeRotation 메서드 대응
   */
  recommendShoeRotation(shoes: Shoe[], currentMainShoe?: Shoe): {
    shouldRotate: boolean;
    recommendedShoe: Shoe | null;
    rotationReason: string;
    rotationBenefits: string[];
  } {
    const activeShoes = shoes.filter(shoe => shoe.isEnabled);

    if (activeShoes.length <= 1) {
      return {
        shouldRotate: false,
        recommendedShoe: null,
        rotationReason: '로테이션할 신발이 부족합니다.',
        rotationBenefits: [],
      };
    }

    if (!currentMainShoe) {
      return {
        shouldRotate: true,
        recommendedShoe: activeShoes[0],
        rotationReason: '메인 신발이 설정되지 않았습니다.',
        rotationBenefits: ['신발 수명 연장', '부상 위험 감소'],
      };
    }

    // 로테이션 기준
    const mainShoeKm = currentMainShoe.totalDistance / 1000;
    let shouldRotate = false;
    let rotationReason = '';
    let recommendedShoe: Shoe | null = null;

    // 1. 거리 기반 로테이션 (100km마다)
    if (mainShoeKm > 0 && mainShoeKm % 100 < 5) {
      shouldRotate = true;
      rotationReason = '100km 달성으로 인한 정기 로테이션';
    }

    // 2. 수명 기반 로테이션 (400km 이상)
    if (mainShoeKm >= 400) {
      shouldRotate = true;
      rotationReason = '신발 수명을 고려한 로테이션 권장';
    }

    // 3. 목표 달성 기반 로테이션
    if (currentMainShoe.targetDistance && currentMainShoe.totalDistance >= currentMainShoe.targetDistance) {
      shouldRotate = true;
      rotationReason = '목표 달성으로 인한 로테이션';
    }

    if (shouldRotate) {
      // 가장 적게 사용한 신발 추천
      const otherActiveShoes = activeShoes.filter(shoe => shoe.id !== currentMainShoe.id);
      recommendedShoe = otherActiveShoes.reduce((min, shoe) =>
        shoe.totalDistance < min.totalDistance ? shoe : min
      , otherActiveShoes[0]) || null;
    }

    const rotationBenefits = [
      '신발 수명 연장',
      '부상 위험 감소',
      '다양한 지면 적응',
      '신발 내부 건조 시간 확보',
      '균등한 신발 사용',
    ];

    return {
      shouldRotate,
      recommendedShoe,
      rotationReason,
      rotationBenefits,
    };
  }

  /**
   * 신발 구매 추천
   * Swift recommendNewShoe 메서드 대응
   */
  recommendNewShoe(shoes: Shoe[], userRunningDistance: number): {
    shouldBuyNew: boolean;
    priority: 'high' | 'medium' | 'low';
    reason: string;
    recommendedSpecs: {
      type: 'daily' | 'racing' | 'trail' | 'recovery';
      features: string[];
      priceRange: string;
    };
  } {
    const activeShoes = shoes.filter(shoe => shoe.isEnabled);
    const monthlyDistance = userRunningDistance; // km per month

    let shouldBuyNew = false;
    let priority: 'high' | 'medium' | 'low' = 'low';
    let reason = '';

    // 1. 신발 개수 기반 판단
    if (activeShoes.length === 0) {
      shouldBuyNew = true;
      priority = 'high';
      reason = '사용 가능한 신발이 없습니다.';
    } else if (activeShoes.length === 1 && monthlyDistance > 50) {
      shouldBuyNew = true;
      priority = 'medium';
      reason = '로테이션을 위한 추가 신발이 필요합니다.';
    }

    // 2. 신발 상태 기반 판단
    const wornOutShoes = activeShoes.filter(shoe => shoe.totalDistance > 600000); // 600km 이상
    if (wornOutShoes.length > 0) {
      shouldBuyNew = true;
      priority = 'high';
      reason = '수명이 다한 신발이 있습니다.';
    }

    // 3. 러닝 빈도 기반 판단
    if (monthlyDistance > 100 && activeShoes.length < 2) {
      shouldBuyNew = true;
      priority = 'medium';
      reason = '높은 러닝 빈도로 인한 추가 신발 필요.';
    }

    // 추천 스펙 결정
    let recommendedSpecs: {
      type: 'daily' | 'racing' | 'trail' | 'recovery';
      features: string[];
      priceRange: string;
    };

    if (activeShoes.length === 0 || activeShoes.every(shoe => shoe.totalDistance > 300000)) {
      recommendedSpecs = {
        type: 'daily',
        features: ['쿠셔닝', '내구성', '통기성', '안정성'],
        priceRange: '10-20만원',
      };
    } else if (monthlyDistance > 150) {
      recommendedSpecs = {
        type: 'racing',
        features: ['경량', '반발력', '속도감', '그립'],
        priceRange: '15-30만원',
      };
    } else if (activeShoes.length === 1) {
      recommendedSpecs = {
        type: 'recovery',
        features: ['최대 쿠셔닝', '편안함', '안정성'],
        priceRange: '12-25만원',
      };
    } else {
      recommendedSpecs = {
        type: 'trail',
        features: ['내구성', '그립', '보호성', '방수'],
        priceRange: '18-35만원',
      };
    }

    return {
      shouldBuyNew,
      priority,
      reason,
      recommendedSpecs,
    };
  }

  /**
   * 신발 목표 설정 도우미
   * Swift suggestShoeGoal 메서드 대응
   */
  suggestShoeGoal(shoe: Shoe, userProfile: {
    weeklyDistance: number;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    runningGoals: string[];
  }): {
    suggestedTarget: number;
    timeframe: string;
    reasoning: string;
    milestones: { distance: number; description: string }[];
  } {
    const currentKm = shoe.totalDistance / 1000;
    const { weeklyDistance, experienceLevel } = userProfile;

    let suggestedTarget: number;
    let timeframe: string;
    let reasoning: string;

    // 경험 수준별 기본 목표 설정
    const baseTarget = {
      beginner: 200,    // 200km
      intermediate: 400, // 400km
      advanced: 600,    // 600km
    }[experienceLevel];

    // 현재 거리를 고려한 목표 조정
    if (currentKm < 50) {
      suggestedTarget = Math.min(baseTarget, 300);
      timeframe = '6-12개월';
      reasoning = '새 신발의 적응 기간을 고려한 단계적 목표';
    } else if (currentKm < 200) {
      suggestedTarget = baseTarget;
      timeframe = '4-8개월';
      reasoning = '현재 진행상황을 바탕으로 한 균형잡힌 목표';
    } else {
      suggestedTarget = Math.max(baseTarget, currentKm + 200);
      timeframe = '3-6개월';
      reasoning = '기존 경험을 활용한 도전적 목표';
    }

    // 주간 거리를 고려한 조정
    const weeksToTarget = suggestedTarget / (weeklyDistance || 10);
    if (weeksToTarget > 52) {
      suggestedTarget = Math.round((weeklyDistance || 10) * 40); // 40주 목표
      timeframe = '8-10개월';
    } else if (weeksToTarget < 12) {
      suggestedTarget = Math.round((weeklyDistance || 10) * 20); // 20주 목표
      timeframe = '4-5개월';
    }

    // 마일스톤 설정
    const milestones: { distance: number; description: string }[] = [];
    const milestoneIntervals = [0.25, 0.5, 0.75, 1.0];

    milestoneIntervals.forEach(ratio => {
      const distance = Math.round(suggestedTarget * ratio);
      let description: string;

      switch (ratio) {
        case 0.25:
          description = '첫 번째 구간 완주! 페이스 조절을 익혀가고 있습니다.';
          break;
        case 0.5:
          description = '중간 지점 도달! 꾸준함의 힘을 보여주고 있습니다.';
          break;
        case 0.75:
          description = '3/4 구간 통과! 목표 달성이 눈앞에 보입니다.';
          break;
        case 1.0:
          description = '목표 달성! 새로운 도전을 준비해보세요.';
          break;
        default:
          description = '마일스톤 달성!';
      }

      milestones.push({ distance, description });
    });

    return {
      suggestedTarget,
      timeframe,
      reasoning,
      milestones,
    };
  }

  /**
   * 신발 관리 팁 제공
   * Swift getShoeCareTips 메서드 대응
   */
  getShoeCareTips(shoe: Shoe): {
    careTips: string[];
    maintenanceSchedule: { task: string; frequency: string }[];
    warningSignsToWatch: string[];
  } {
    const kmDistance = shoe.totalDistance / 1000;
    const shoeAge = kmDistance / 20; // 주당 20km 기준으로 계산한 사용 주수

    const careTips: string[] = [
      '러닝 후에는 신발을 통풍이 잘 되는 곳에서 건조시키세요.',
      '직사광선과 높은 온도를 피해서 보관하세요.',
      '신발 안에 신문지나 실리카겔을 넣어 습기를 제거하세요.',
      '정기적으로 신발끈을 풀어서 내부를 완전히 건조시키세요.',
    ];

    if (shoeAge > 12) {
      careTips.push('오래된 신발입니다. 더욱 세심한 관리가 필요합니다.');
      careTips.push('밑창과 갑피의 분리 징후가 있는지 정기적으로 확인하세요.');
    }

    if (kmDistance > 300) {
      careTips.push('300km 이상 사용한 신발입니다. 쿠셔닝 상태를 주의깊게 관찰하세요.');
    }

    const maintenanceSchedule: { task: string; frequency: string }[] = [
      { task: '신발 청소', frequency: '주 1회' },
      { task: '깔창 교체', frequency: '3개월마다' },
      { task: '신발끈 교체', frequency: '6개월마다' },
      { task: '전체 상태 점검', frequency: '월 1회' },
    ];

    const warningSignsToWatch: string[] = [
      '밑창 마모가 한쪽으로 치우침',
      '쿠셔닝 감소로 인한 충격 증가',
      '갑피 소재의 찢어짐이나 변형',
      '신발 내부 마모나 냄새',
      '러닝 후 발이나 다리의 불편함',
    ];

    return {
      careTips,
      maintenanceSchedule,
      warningSignsToWatch,
    };
  }

  /**
   * 신발 데이터 분석 보고서 생성
   * Swift generateShoeReport 메서드 대응
   */
  generateShoeReport(shoes: Shoe[]): {
    summary: {
      totalShoes: number;
      totalDistance: number;
      averageShoeLife: number;
      mostSuccessfulBrand: string;
    };
    insights: string[];
    achievements: string[];
    nextActions: string[];
  } {
    const statistics = calculateShoeStatistics(shoes);
    const performance = this.analyzeShoePerformance(shoes);

    // 브랜드별 분석
    const brandStats = shoes.reduce((acc, shoe) => {
      if (!acc[shoe.brand]) {
        acc[shoe.brand] = { count: 0, totalDistance: 0 };
      }
      acc[shoe.brand].count++;
      acc[shoe.brand].totalDistance += shoe.totalDistance;
      return acc;
    }, {} as Record<string, { count: number; totalDistance: number }>);

    const mostSuccessfulBrand = Object.entries(brandStats).reduce((a, b) =>
      brandStats[a[0]].totalDistance > brandStats[b[0]].totalDistance ? a : b
    )[0] || 'N/A';

    const averageShoeLife = shoes.length > 0 ? statistics.totalDistance / shoes.length / 1000 : 0;

    // 인사이트 생성
    const insights: string[] = [];

    if (statistics.achievementRate > 80) {
      insights.push('목표 달성률이 우수합니다! 계획적인 러닝을 하고 계십니다.');
    } else if (statistics.achievementRate < 50) {
      insights.push('목표 달성률이 낮습니다. 더 현실적인 목표 설정을 고려해보세요.');
    }

    if (averageShoeLife > 300) {
      insights.push('신발을 오래 사용하는 편입니다. 꾸준한 러닝 습관이 인상적입니다.');
    } else if (averageShoeLife < 100) {
      insights.push('신발 교체 주기가 빠른 편입니다. 더 많은 활용을 고려해보세요.');
    }

    if (statistics.activeShoes === 1) {
      insights.push('신발 로테이션을 위해 추가 신발 구매를 고려해보세요.');
    }

    // 성취 분석
    const achievements: string[] = [];

    if (statistics.totalDistance > 500000) {
      achievements.push('총 누적 거리 500km 돌파!');
    }

    if (statistics.totalShoes >= 5) {
      achievements.push('신발 컬렉터! 5개 이상의 신발을 보유하고 계십니다.');
    }

    if (statistics.achievedGoals > 0) {
      achievements.push(`${statistics.achievedGoals}개의 신발 목표를 달성했습니다!`);
    }

    // 다음 액션 제안
    const nextActions: string[] = [];

    if (performance.recommendations.length > 0) {
      nextActions.push(...performance.recommendations);
    }

    const oldShoes = shoes.filter(shoe => shoe.totalDistance > 500000);
    if (oldShoes.length > 0) {
      nextActions.push('오래된 신발의 교체를 고려해보세요.');
    }

    if (statistics.activeShoes === 0) {
      nextActions.push('활성화할 신발을 선택하세요.');
    }

    return {
      summary: {
        totalShoes: statistics.totalShoes,
        totalDistance: statistics.totalDistance,
        averageShoeLife: Math.round(averageShoeLife),
        mostSuccessfulBrand,
      },
      insights,
      achievements,
      nextActions,
    };
  }
}

// Singleton export
export const shoeService = ShoeService.getInstance();