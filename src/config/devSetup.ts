/**
 * 개발 환경 전용 설정
 * 프로덕션에서는 이 파일 전체를 제거하거나 비활성화
 *
 * IMPORTANT:
 * - 이 파일은 개발 중 디버깅을 위한 임시 설정입니다
 * - 프로덕션 배포 시 Sentry/DataDog 등 모니터링 도구로 대체 예정
 * - app/_layout.tsx에서만 import하여 격리 유지
 */

if (__DEV__) {
  console.log('🔧 [DEV] 개발 환경 설정 로드 중...');

  // 2. API 로깅 인터셉터 등록 (디버깅용)
  // 이 import가 실행되면서 interceptors.ts의 로깅 인터셉터가 자동 등록됨
  require('../services/api/interceptors');
  console.log('✅ [DEV] API 로깅 인터셉터 등록 완료');

  console.log('📝 [DEV] 모든 API 요청/응답이 콘솔에 출력됩니다');
}

/**
 * 프로덕션 환경에서 이 파일을 제거하는 방법:
 *
 * 1. 조건부 import (권장):
 *    if (__DEV__) {
 *      require('./config/devSetup');
 *    }
 *
 * 2. 파일 삭제:
 *    배포 전 이 파일과 app/_layout.tsx의 import 라인 제거
 *
 * 3. 빌드 최적화:
 *    Metro bundler가 __DEV__ 체크로 자동 제거
 */
