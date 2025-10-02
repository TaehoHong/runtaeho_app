/**
 * API Services Export
 * 모든 API 관련 모듈을 여기서 export
 */

export { apiClient, apiUtils } from './client';
export { API_CONFIG, API_ENDPOINTS } from './config';

// TokenRefreshInterceptor 초기화
// apiClient가 먼저 생성된 후 인터셉터 등록 (순환참조 해결)
import { TokenRefreshInterceptor } from '../../shared/services/TokenRefreshInterceptor';
TokenRefreshInterceptor.getInstance();

// 추가 로깅 인터셉터 (옵션)
import './interceptors';
