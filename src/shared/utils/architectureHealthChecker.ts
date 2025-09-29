/**
 * 아키텍처 건강성 체크 도구
 * 의존성 분석과 코드 품질 점수 계산
 */

import { container, analyzeDependencies } from '../di';
import {
  ArchitectureLayer,
  classifyModuleLayer,
  validateLayerDependencies,
  generateRefactoringSuggestions,
  calculateArchitectureHealth,
  type ArchitectureViolation,
  type CircularDependency,
  type RefactoringSuggestion,
  type ArchitectureHealthScore,
} from './dependencyAnalyzer';

// ==========================================
// 종합 아키텍처 분석
// ==========================================

export interface ComprehensiveArchitectureReport {
  healthScore: ArchitectureHealthScore;
  violations: ArchitectureViolation[];
  circularDependencies: CircularDependency[];
  refactoringSuggestions: RefactoringSuggestion[];
  dependencyGraph: Record<string, string[]>;
  serviceRegistrations: string[];
  recommendations: string[];
}

export const performComprehensiveArchitectureAnalysis = (): ComprehensiveArchitectureReport => {
  console.log('🔍 종합 아키텍처 분석 시작...');

  // 1. DI 컨테이너 분석
  const diAnalysis = analyzeDependencies();
  const serviceRegistrations = container.getRegisteredServices();

  console.log(`📊 등록된 서비스: ${serviceRegistrations.length}개`);
  console.log(`🔗 의존성 관계: ${Object.keys(diAnalysis.dependencyGraph).length}개`);

  // 2. 레이어 의존성 위반 검사
  const violations: ArchitectureViolation[] = [];
  Object.entries(diAnalysis.dependencyGraph).forEach(([fromService, dependencies]) => {
    dependencies.forEach(toService => {
      // 서비스 이름을 파일 경로로 가정하여 레이어 분류
      const fromPath = `/services/${fromService}`;
      const toPath = `/services/${toService}`;

      const violation = validateLayerDependencies(fromPath, toPath);
      if (violation) {
        violations.push(violation);
      }
    });
  });

  console.log(`⚠️ 아키텍처 위반사항: ${violations.length}개`);

  // 3. 순환 의존성 분석
  const circularDependencies: CircularDependency[] = diAnalysis.cycles.map(cycle => ({
    cycle,
    severity: cycle.length > 4 ? 'high' : cycle.length > 2 ? 'medium' : 'low',
    suggestion: `의존성 순환을 해결하기 위해 ${cycle[0]}와 ${cycle[cycle.length - 1]} 사이의 의존성을 추상화하거나 공통 모듈로 추출하세요.`,
  }));

  console.log(`🔄 순환 의존성: ${circularDependencies.length}개`);

  // 4. 리팩토링 제안 생성
  const refactoringSuggestions = generateRefactoringSuggestions(violations);

  console.log(`💡 리팩토링 제안: ${refactoringSuggestions.length}개`);

  // 5. 건강성 점수 계산
  const healthScore = calculateArchitectureHealth(
    violations,
    circularDependencies,
    serviceRegistrations.length
  );

  console.log(`📈 전체 건강성 점수: ${healthScore.overall}/100`);

  // 6. 종합 권장사항
  const recommendations = generateRecommendations(
    healthScore,
    violations,
    circularDependencies,
    refactoringSuggestions
  );

  const report: ComprehensiveArchitectureReport = {
    healthScore,
    violations,
    circularDependencies,
    refactoringSuggestions,
    dependencyGraph: diAnalysis.dependencyGraph,
    serviceRegistrations,
    recommendations,
  };

  console.log('✅ 종합 아키텍처 분석 완료');
  return report;
};

// ==========================================
// 권장사항 생성
// ==========================================

const generateRecommendations = (
  healthScore: ArchitectureHealthScore,
  violations: ArchitectureViolation[],
  circularDependencies: CircularDependency[],
  suggestions: RefactoringSuggestion[]
): string[] => {
  const recommendations: string[] = [];

  // 전체 점수에 따른 권장사항
  if (healthScore.overall < 60) {
    recommendations.push('🚨 전체 아키텍처 품질이 낮습니다. 즉시 개선이 필요합니다.');
  } else if (healthScore.overall < 80) {
    recommendations.push('⚠️ 아키텍처 개선이 권장됩니다.');
  } else {
    recommendations.push('✅ 양호한 아키텍처 품질을 유지하고 있습니다.');
  }

  // 레이어 분리에 따른 권장사항
  if (healthScore.layerSeparation < 70) {
    recommendations.push('🏗️ 레이어 분리 개선: Presentation -> Application -> Infrastructure 순서로 의존성을 정리하세요.');
  }

  // 순환 의존성에 따른 권장사항
  if (circularDependencies.length > 0) {
    const highSeverityCycles = circularDependencies.filter(cycle => cycle.severity === 'high');
    if (highSeverityCycles.length > 0) {
      recommendations.push('🔄 고위험 순환 의존성이 발견되었습니다. 우선적으로 해결하세요.');
    }
    recommendations.push('🔧 의존성 주입 패턴을 사용하여 순환 의존성을 해결하세요.');
  }

  // 결합도에 따른 권장사항
  if (healthScore.coupling < 70) {
    recommendations.push('🔗 결합도가 높습니다. 인터페이스와 추상화를 통해 느슨한 결합을 구현하세요.');
  }

  // 구체적인 리팩토링 제안이 있는 경우
  const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
  if (highPrioritySuggestions.length > 0) {
    recommendations.push(`⚡ ${highPrioritySuggestions.length}개의 고우선순위 리팩토링 작업을 수행하세요.`);
  }

  // 서비스 수에 따른 권장사항
  if (healthScore.overall > 85) {
    recommendations.push('🎯 현재 구조를 유지하면서 점진적 개선을 진행하세요.');
  }

  return recommendations;
};

// ==========================================
// 리포트 포맷팅 및 출력
// ==========================================

export const printArchitectureReport = (report: ComprehensiveArchitectureReport): void => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 아키텍처 건강성 리포트');
  console.log('='.repeat(60));

  console.log(`\n🏥 건강성 점수:`);
  console.log(`   전체: ${report.healthScore.overall}/100`);
  console.log(`   레이어 분리: ${report.healthScore.layerSeparation}/100`);
  console.log(`   복잡도: ${report.healthScore.cyclomaticComplexity}/100`);
  console.log(`   응집도: ${report.healthScore.cohesion}/100`);
  console.log(`   결합도: ${report.healthScore.coupling}/100`);

  console.log(`\n📈 등록된 서비스: ${report.serviceRegistrations.length}개`);
  console.log(`⚠️ 아키텍처 위반: ${report.violations.length}개`);
  console.log(`🔄 순환 의존성: ${report.circularDependencies.length}개`);
  console.log(`💡 리팩토링 제안: ${report.refactoringSuggestions.length}개`);

  if (report.recommendations.length > 0) {
    console.log(`\n📋 권장사항:`);
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  if (report.violations.length > 0) {
    console.log(`\n⚠️ 상위 아키텍처 위반사항:`);
    report.violations.slice(0, 5).forEach((violation, index) => {
      console.log(`   ${index + 1}. ${violation.violation}`);
      console.log(`      제안: ${violation.suggestion}`);
    });
  }

  if (report.refactoringSuggestions.length > 0) {
    console.log(`\n💡 상위 리팩토링 제안:`);
    report.refactoringSuggestions.slice(0, 3).forEach((suggestion, index) => {
      console.log(`   ${index + 1}. [${suggestion.priority.toUpperCase()}] ${suggestion.description}`);
      console.log(`      예상 노력: ${suggestion.estimatedEffort}`);
    });
  }

  console.log('\n' + '='.repeat(60));
};

// ==========================================
// 건강성 등급 계산
// ==========================================

export const getHealthGrade = (score: number): string => {
  if (score >= 90) return 'A+ (우수)';
  if (score >= 80) return 'A (양호)';
  if (score >= 70) return 'B (보통)';
  if (score >= 60) return 'C (개선 필요)';
  if (score >= 50) return 'D (문제 있음)';
  return 'F (심각한 문제)';
};

// ==========================================
// 자동 개선 제안
// ==========================================

export const suggestAutomaticFixes = (report: ComprehensiveArchitectureReport): string[] => {
  const autoFixes: string[] = [];

  // DI 컨테이너 기반 개선
  if (report.circularDependencies.length > 0) {
    autoFixes.push('DI 컨테이너의 인터페이스 기반 등록으로 순환 의존성 해결');
  }

  // 레이어 위반 기반 개선
  const presentationInfraViolations = report.violations.filter(
    v => v.fromLayer === ArchitectureLayer.PRESENTATION && v.toLayer === ArchitectureLayer.INFRASTRUCTURE
  );

  if (presentationInfraViolations.length > 0) {
    autoFixes.push('Application 레이어 Hook/ViewModel 생성으로 Presentation-Infrastructure 직접 의존성 제거');
  }

  return autoFixes;
};