/**
 * 개발 환경 전용 설정
 * 프로덕션에서는 이 파일 전체를 제거하거나 비활성화
 *
 * IMPORTANT:
 * - 이 파일은 개발 중 디버깅을 위한 임시 설정입니다
 * - 프로덕션 배포 시 Sentry/DataDog 등 모니터링 도구로 대체 예정
 * - app/_layout.tsx에서만 import하여 격리 유지
 */

import { resetDevEnvironment } from './devResetHelper';

if (__DEV__) {
  console.log('🔧 [DEV] 개발 환경 설정 로드 중...');

  // 1. DEV 환경 완전 초기화 (앱 시작 시 자동 실행)
  // 모든 Zustand Store, AsyncStorage, SecureStore 초기화
  resetDevEnvironment().catch((error) => {
    console.error('❌ [DEV] 환경 초기화 중 오류 발생:', error);
  });

  // 2. API 로깅 인터셉터 등록 (디버깅용)
  // 이 import가 실행되면서 interceptors.ts의 로깅 인터셉터가 자동 등록됨
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../services/api/interceptors');
  console.log('✅ [DEV] API 로깅 인터셉터 등록 완료');

  console.log('📝 [DEV] 모든 API 요청/응답이 콘솔에 출력됩니다');
}