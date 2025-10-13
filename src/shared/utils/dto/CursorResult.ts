/**
 * 페이지네이션 결과 인터페이스
 * 백엔드 API 스펙에 맞춤
 */
export interface CursorResult<T> {
    contents: T[];
    nextCursor?: number;
    hasNext: boolean;
}
  