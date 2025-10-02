/**
 * API 초기화 설정
 * services/api/index.ts를 import하여 TokenRefreshInterceptor를 초기화
 */

// services/api/index.ts를 import하면 자동으로:
// 1. apiClient 생성
// 2. TokenRefreshInterceptor.getInstance() 호출
// 3. 인터셉터 등록
import '../services/api';

console.log('✅ [API Setup] API 인터셉터 초기화 완료');
