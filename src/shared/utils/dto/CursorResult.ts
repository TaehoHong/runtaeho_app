/**
 * 페이지네이션 결과 인터페이스
 */
export interface CursorResult<T> {
    content: T[];
    cursor?: number;
    hasNext: boolean;
}
  