/**
 * 의존성 분석 유틸리티
 * 순환 의존성 탐지 및 아키텍처 개선을 위한 도구들
 */

// ==========================================
// 의존성 그래프 타입 정의
// ==========================================

export interface DependencyNode {
  id: string;
  path: string;
  dependencies: string[];
  dependents: string[];
}

export interface CircularDependency {
  cycle: string[];
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

// ==========================================
// 아키텍처 레이어 정의
// ==========================================

export enum ArchitectureLayer {
  PRESENTATION = 'presentation',  // Views, Components
  APPLICATION = 'application',    // ViewModels, Hooks
  DOMAIN = 'domain',              // Models, Business Logic
  INFRASTRUCTURE = 'infrastructure', // Services, APIs
  SHARED = 'shared',              // Utils, Types, Constants
}

export const LAYER_HIERARCHY = {
  [ArchitectureLayer.PRESENTATION]: 0,
  [ArchitectureLayer.APPLICATION]: 1,
  [ArchitectureLayer.DOMAIN]: 2,
  [ArchitectureLayer.INFRASTRUCTURE]: 3,
  [ArchitectureLayer.SHARED]: 4,
};

// ==========================================
// 레이어 분류 함수
// ==========================================

export const classifyModuleLayer = (filePath: string): ArchitectureLayer => {
  if (filePath.includes('/views/') || filePath.includes('/components/') || filePath.includes('/screens/')) {
    return ArchitectureLayer.PRESENTATION;
  }
  if (filePath.includes('/viewmodels/') || filePath.includes('/hooks/')) {
    return ArchitectureLayer.APPLICATION;
  }
  if (filePath.includes('/models/') || filePath.includes('/types/')) {
    return ArchitectureLayer.DOMAIN;
  }
  if (filePath.includes('/services/') || filePath.includes('/api/')) {
    return ArchitectureLayer.INFRASTRUCTURE;
  }
  if (filePath.includes('/shared/') || filePath.includes('/utils/') || filePath.includes('/constants/')) {
    return ArchitectureLayer.SHARED;
  }
  return ArchitectureLayer.SHARED; // 기본값
};

// ==========================================
// 의존성 규칙 검사
// ==========================================

export interface ArchitectureViolation {
  fromModule: string;
  toModule: string;
  fromLayer: ArchitectureLayer;
  toLayer: ArchitectureLayer;
  violation: string;
  suggestion: string;
}

export const validateLayerDependencies = (
  fromPath: string,
  toPath: string
): ArchitectureViolation | null => {
  const fromLayer = classifyModuleLayer(fromPath);
  const toLayer = classifyModuleLayer(toPath);

  const fromHierarchy = LAYER_HIERARCHY[fromLayer];
  const toHierarchy = LAYER_HIERARCHY[toLayer];

  // 하위 레이어가 상위 레이어를 의존하는 것은 위반
  if (fromHierarchy > toHierarchy && toLayer !== ArchitectureLayer.SHARED) {
    return {
      fromModule: fromPath,
      toModule: toPath,
      fromLayer,
      toLayer,
      violation: `Lower layer (${fromLayer}) depends on higher layer (${toLayer})`,
      suggestion: `Consider moving common logic to shared layer or inverting the dependency`,
    };
  }

  // Presentation 레이어가 Infrastructure를 직접 의존하는 것은 위반
  if (fromLayer === ArchitectureLayer.PRESENTATION && toLayer === ArchitectureLayer.INFRASTRUCTURE) {
    return {
      fromModule: fromPath,
      toModule: toPath,
      fromLayer,
      toLayer,
      violation: 'Presentation layer directly depends on Infrastructure layer',
      suggestion: 'Use Application layer (ViewModels/Hooks) as intermediary',
    };
  }

  return null;
};

// ==========================================
// 리팩토링 제안 생성
// ==========================================

export interface RefactoringSuggestion {
  type: 'extract' | 'move' | 'invert' | 'split';
  description: string;
  affectedFiles: string[];
  priority: 'low' | 'medium' | 'high';
  estimatedEffort: 'small' | 'medium' | 'large';
}

export const generateRefactoringSuggestions = (
  violations: ArchitectureViolation[]
): RefactoringSuggestion[] => {
  const suggestions: RefactoringSuggestion[] = [];

  // 유사한 위반사항들을 그룹화
  const violationGroups = violations.reduce((groups, violation) => {
    const key = `${violation.fromLayer}->${violation.toLayer}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(violation);
    return groups;
  }, {} as Record<string, ArchitectureViolation[]>);

  // 각 그룹에 대한 제안 생성
  Object.entries(violationGroups).forEach(([key, groupViolations]) => {
    if (key === 'presentation->infrastructure') {
      suggestions.push({
        type: 'extract',
        description: 'Create Application layer services to mediate between Presentation and Infrastructure',
        affectedFiles: groupViolations.map(v => v.fromModule),
        priority: 'high',
        estimatedEffort: 'medium',
      });
    }

    if (key.includes('infrastructure->presentation')) {
      suggestions.push({
        type: 'invert',
        description: 'Invert dependency by using dependency injection or observer pattern',
        affectedFiles: groupViolations.map(v => v.fromModule),
        priority: 'medium',
        estimatedEffort: 'large',
      });
    }

    if (groupViolations.length > 3) {
      suggestions.push({
        type: 'split',
        description: 'Consider splitting large modules with many dependencies',
        affectedFiles: groupViolations.map(v => v.fromModule),
        priority: 'medium',
        estimatedEffort: 'large',
      });
    }
  });

  return suggestions;
};

// ==========================================
// 아키텍처 건강성 점수 계산
// ==========================================

export interface ArchitectureHealthScore {
  overall: number;
  layerSeparation: number;
  cyclomaticComplexity: number;
  cohesion: number;
  coupling: number;
  suggestions: string[];
}

export const calculateArchitectureHealth = (
  violations: ArchitectureViolation[],
  circularDependencies: CircularDependency[],
  totalModules: number
): ArchitectureHealthScore => {
  const violationPenalty = violations.length * 10;
  const circularPenalty = circularDependencies.reduce((penalty, cycle) => {
    return penalty + (cycle.severity === 'high' ? 30 : cycle.severity === 'medium' ? 20 : 10);
  }, 0);

  const layerSeparation = Math.max(0, 100 - violationPenalty);
  const cyclomaticComplexity = Math.max(0, 100 - circularPenalty);
  const overall = Math.round((layerSeparation + cyclomaticComplexity) / 2);

  const suggestions: string[] = [];

  if (layerSeparation < 70) {
    suggestions.push('레이어 분리 개선 필요 - Presentation/Application/Infrastructure 레이어 간 의존성 정리');
  }

  if (cyclomaticComplexity < 70) {
    suggestions.push('순환 의존성 해결 필요 - 의존성 방향 정리 및 공통 모듈 추출');
  }

  if (totalModules > 100) {
    suggestions.push('모듈 수가 많음 - 관련 기능별로 모듈 그룹화 고려');
  }

  return {
    overall,
    layerSeparation,
    cyclomaticComplexity,
    cohesion: 85, // 기본값 (실제로는 더 정교한 분석 필요)
    coupling: Math.max(0, 100 - violations.length * 5),
    suggestions,
  };
};