/**
 * 약관 동의 기능 관련 타입 정의
 */

/**
 * 약관 아이템 (개별 약관)
 * 백엔드 TermResponse와 일치
 */
export interface TermItem {
  id: number;
  link: string;
  type: TermType;
  isRequired: boolean;
}

/**
 * 약관 전체 내용 (서버 응답)
 * 백엔드 TermResponses와 일치
 */
export interface TermsResponse {
  terms: TermItem[];  // 약관 리스트
}

/**
 * 약관 동의 요청 DTO
 */

export interface TermsAgreementRequests {
  requests: TermsAgreementRequest[];
}

export interface TermsAgreementRequest {
  termId: number;
  isAgreed: boolean;
}


/**
 * 약관 동의 상태
 */
export interface AgreementState {
  terms: boolean;      // 서비스 이용약관 동의 (필수)
  privacy: boolean;    // 개인정보 처리방침 동의 (필수)
  location: boolean;   // 위치기반서비스 이용약관 동의 (필수)
}

/**
 * 약관 타입
 * 백엔드 TermType enum과 일치
 */
export enum TermType {
  SERVICE = 'SERVICE',    // 서비스 이용약관
  PRIVATE = 'PRIVATE',    // 개인정보 처리방침
  LOCATION = 'LOCATION',  // 위치기반서비스 이용약관
}
