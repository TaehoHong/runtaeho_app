/**
 * Avatar Service
 * Swift Avatar 비즈니스 로직을 TypeScript로 마이그레이션
 */

import type {
  Avatar,
  AvatarItem,
  Item,
  // UserItem, // TODO: 향후 사용자 아바타 데이터 처리용
} from '../models';
import {
  validateAvatar,
  groupItemsByType,
  getEquippedItems,
  getEquippedItemByType,
  formatAvatar,
} from '../models';

export class AvatarService {
  private static instance: AvatarService;

  private constructor() {}

  static getInstance(): AvatarService {
    if (!AvatarService.instance) {
      AvatarService.instance = new AvatarService();
    }
    return AvatarService.instance;
  }

  /**
   * 아바타 유효성 검증
   * Swift verifyAvatar 메서드 대응
   */
  verifyAvatar(avatar: Avatar): boolean {
    return validateAvatar(avatar);
  }

  /**
   * 아바타 아이템 착용 가능 여부 확인
   * Swift canEquipItem 메서드 대응
   */
  canEquipItem(avatar: Avatar, item: Item): boolean {
    if (!this.verifyAvatar(avatar)) return false;
    if (!item || item.id <= 0) return false;

    // 이미 같은 타입의 아이템이 착용되어 있는지 확인
    const existingItem = getEquippedItemByType(avatar, item.itemType.name);
    return !existingItem || existingItem.id !== item.id;
  }

  /**
   * 아바타 아이템 조합 유효성 검증
   * Swift validateItemCombination 메서드 대응
   */
  validateItemCombination(items: AvatarItem[]): {
    isValid: boolean;
    conflicts: string[];
    warnings: string[];
  } {
    const conflicts: string[] = [];
    const warnings: string[] = [];
    const typeGroups = groupItemsByType(items);

    // 같은 타입의 아이템이 중복 착용되었는지 확인
    Object.entries(typeGroups).forEach(([typeName, typeItems]) => {
      if (typeItems.length > 1) {
        conflicts.push(`${typeName} 타입의 아이템이 중복 착용되었습니다.`);
      }
    });

    // 스타일 조합 경고 (예: 공식적인 의상과 캐주얼 의상 혼합)
    const formalItems = items.filter(item => 
      item.name.includes('정장') || item.name.includes('드레스')
    );
    const casualItems = items.filter(item => 
      item.name.includes('캐주얼') || item.name.includes('스포츠')
    );

    if (formalItems.length > 0 && casualItems.length > 0) {
      warnings.push('공식적인 의상과 캐주얼 의상이 혼합되어 있습니다.');
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings,
    };
  }

  /**
   * 아바타 스타일 분석
   * Swift analyzeAvatarStyle 메서드 대응
   */
  analyzeAvatarStyle(avatar: Avatar): {
    style: 'Formal' | 'Casual' | 'Sports' | 'Mixed' | 'Basic';
    confidence: number;
    description: string;
  } {
    const equippedItems = getEquippedItems(avatar);
    
    if (equippedItems.length === 0) {
      return {
        style: 'Basic',
        confidence: 1.0,
        description: '기본 스타일입니다.',
      };
    }

    const styleScores = {
      formal: 0,
      casual: 0,
      sports: 0,
    };

    equippedItems.forEach(item => {
      const itemName = item.name.toLowerCase();
      
      if (itemName.includes('정장') || itemName.includes('드레스') || itemName.includes('구두')) {
        styleScores.formal += 1;
      } else if (itemName.includes('캐주얼') || itemName.includes('청바지') || itemName.includes('티셔츠')) {
        styleScores.casual += 1;
      } else if (itemName.includes('스포츠') || itemName.includes('운동') || itemName.includes('스니커즈')) {
        styleScores.sports += 1;
      }
    });

    const totalItems = equippedItems.length;
    const maxScore = Math.max(styleScores.formal, styleScores.casual, styleScores.sports);
    const confidence = maxScore / totalItems;

    let style: 'Formal' | 'Casual' | 'Sports' | 'Mixed' | 'Basic';
    let description: string;

    if (confidence < 0.5) {
      style = 'Mixed';
      description = '다양한 스타일이 혼합된 독특한 조합입니다.';
    } else if (styleScores.formal === maxScore) {
      style = 'Formal';
      description = '공식적이고 세련된 스타일입니다.';
    } else if (styleScores.casual === maxScore) {
      style = 'Casual';
      description = '편안하고 자연스러운 스타일입니다.';
    } else if (styleScores.sports === maxScore) {
      style = 'Sports';
      description = '활동적이고 스포티한 스타일입니다.';
    } else {
      style = 'Basic';
      description = '기본적인 스타일입니다.';
    }

    return { style, confidence, description };
  }

  /**
   * 아바타 아이템 추천
   * Swift recommendItems 메서드 대응
   */
  recommendItems(avatar: Avatar, availableItems: Item[], maxRecommendations: number = 5): Item[] {
    const equippedItems = getEquippedItems(avatar);
    const equippedTypeNames = equippedItems.map(item => item.itemType.name);
    const styleAnalysis = this.analyzeAvatarStyle(avatar);

    // 현재 착용하지 않은 타입의 아이템 우선 추천
    // const missingTypeItems = availableItems.filter(item =>
    //   !equippedTypeNames.includes(item.itemType.name)
    // ); // TODO: 향후 미착용 타입 아이템 우선 추천 로직에 사용

    // 현재 스타일과 어울리는 아이템 추천
    const styleMatchItems = availableItems.filter(item => {
      const itemName = item.name.toLowerCase();
      switch (styleAnalysis.style) {
        case 'Formal':
          return itemName.includes('정장') || itemName.includes('드레스') || itemName.includes('구두');
        case 'Casual':
          return itemName.includes('캐주얼') || itemName.includes('청바지') || itemName.includes('티셔츠');
        case 'Sports':
          return itemName.includes('스포츠') || itemName.includes('운동') || itemName.includes('스니커즈');
        default:
          return true;
      }
    });

    // 추천 점수 계산
    const scoredItems = availableItems.map(item => {
      let score = 0;

      // 미착용 타입 가산점
      if (!equippedTypeNames.includes(item.itemType.name)) {
        score += 10;
      }

      // 스타일 매칭 가산점
      if (styleMatchItems.includes(item)) {
        score += 5;
      }

      // 가격 적정성 (낮은 가격 선호)
      score += Math.max(0, 10 - Math.floor(item.point / 1000));

      return { item, score };
    });

    // 점수순으로 정렬하고 상위 항목 반환
    return scoredItems
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRecommendations)
      .map(scored => scored.item);
  }

  /**
   * 아바타 포인트 계산
   * Swift calculateAvatarValue 메서드 대응
   */
  calculateAvatarValue(avatar: Avatar): {
    totalValue: number;
    itemCount: number;
    averageValue: number;
    mostExpensiveItem: AvatarItem | null;
  } {
    const equippedItems = getEquippedItems(avatar);
    
    if (equippedItems.length === 0) {
      return {
        totalValue: 0,
        itemCount: 0,
        averageValue: 0,
        mostExpensiveItem: null,
      };
    }

    const totalValue = equippedItems.reduce((sum, item) => sum + item.point, 0);
    const averageValue = totalValue / equippedItems.length;
    const mostExpensiveItem = equippedItems.reduce((max, item) => 
      item.point > max.point ? item : max
    );

    return {
      totalValue,
      itemCount: equippedItems.length,
      averageValue: Math.round(averageValue),
      mostExpensiveItem,
    };
  }

  /**
   * 아바타 Unity 파일 경로 수집
   * Swift collectUnityPaths 메서드 대응
   */
  collectUnityPaths(avatar: Avatar): {
    filePaths: string[];
    unityFilePaths: string[];
    pathsByType: Record<string, { filePath: string; unityFilePath: string }>;
  } {
    const equippedItems = getEquippedItems(avatar);
    
    const filePaths = equippedItems.map(item => item.filePath);
    const unityFilePaths = equippedItems.map(item => item.unityFilePath);
    
    const pathsByType = equippedItems.reduce((acc, item) => {
      acc[item.itemType.name] = {
        filePath: item.filePath,
        unityFilePath: item.unityFilePath,
      };
      return acc;
    }, {} as Record<string, { filePath: string; unityFilePath: string }>);

    return {
      filePaths,
      unityFilePaths,
      pathsByType,
    };
  }

  /**
   * 아바타 백업 생성
   * Swift createAvatarBackup 메서드 대응
   */
  createAvatarBackup(avatar: Avatar): {
    avatarId: number;
    itemIds: number[];
    timestamp: number;
    formattedData: ReturnType<typeof formatAvatar>;
  } {
    const equippedItems = getEquippedItems(avatar);
    
    return {
      avatarId: avatar.id,
      itemIds: equippedItems.map(item => item.id),
      timestamp: Date.now(),
      formattedData: formatAvatar(avatar),
    };
  }
}

// Singleton export
export const avatarService = AvatarService.getInstance();
