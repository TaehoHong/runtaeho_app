/**
 * 포인트 내역 모델
 */
export interface PointHistory {
  id: number;
  point: number;
  pointType: string;
  createdTimestamp: number;
}

/**
 * 포인트 필터 enum
 */
export enum PointFilter {
  ALL = 'all',
  EARNED = 'earned',
  SPENT = 'spent',
}

/**
 * 포인트 필터 설정
 */
export const PointFilterConfig = {
  [PointFilter.ALL]: {
    displayName: '전체',
    value: 'all',
  },
  [PointFilter.EARNED]: {
    displayName: '적립',
    value: 'earned',
  },
  [PointFilter.SPENT]: {
    displayName: '사용',
    value: 'spent',
  },
} as const;

/**
 * 포인트 히스토리 요청 파라미터
 */
export interface PointHistoryRequest {
  cursor?: number;
  isEarned?: boolean;
  startCreatedTimestamp?: number;
  size?: number;
}

/**
 * 포인트 히스토리 뷰모델
 */
export interface PointHistoryViewModel {
  id: number;
  isPositive: boolean;
  title: string;
  point: number;
  date: Date;
  formattedPoint: string;
  formattedDate: string;
}

/**
 * 포인트 히스토리 뷰모델 생성
 */
export const createPointHistoryViewModel = (pointHistory: PointHistory): PointHistoryViewModel => {
  const isPositive = pointHistory.point > 0;
  const point = Math.abs(pointHistory.point);
  const date = new Date(pointHistory.createdTimestamp * 1000);

  return {
    id: pointHistory.id,
    isPositive,
    title: pointHistory.pointType,
    point,
    date,
    formattedPoint: `${isPositive ? '+' : '-'}${point}P`,
    formattedDate: formatDate(date),
  };
};

/**
 * 날짜 포맷팅 헬퍼
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}.${month}.${day} ${hours}:${minutes}`;
};

/**
 * 포인트 포맷팅 헬퍼
 */
export const formatPoints = (points: number): string => {
  return `${points.toLocaleString()}P`;
};

/**
 * 포인트 변화량 포맷팅
 */
export const formatPointChange = (points: number): string => {
  const prefix = points >= 0 ? '+' : '';
  return `${prefix}${points.toLocaleString()}P`;
};

/**
 * 포인트 히스토리 필터링
 */
export const filterPointHistories = (
  histories: PointHistoryViewModel[],
  filter: PointFilter
): PointHistoryViewModel[] => {
  switch (filter) {
    case PointFilter.ALL:
      return histories;
    case PointFilter.EARNED:
      return histories.filter(h => h.isPositive);
    case PointFilter.SPENT:
      return histories.filter(h => !h.isPositive);
    default:
      return histories;
  }
};

/**
 * isEarned 파라미터 변환
 */
export const getIsEarnedFromFilter = (filter: PointFilter): boolean | undefined => {
  switch (filter) {
    case PointFilter.EARNED:
      return true;
    case PointFilter.SPENT:
      return false;
    case PointFilter.ALL:
      return undefined;
    default:
      return undefined;
  }
};

/**
 * 포인트 히스토리 유효성 검증
 */
export const validatePointHistory = (history: PointHistory): boolean => {
  if (!history.id || history.id <= 0) return false;
  if (history.point === 0) return false;
  if (!history.pointType || history.pointType.trim().length === 0) return false;
  if (!history.createdTimestamp || history.createdTimestamp <= 0) return false;
  return true;
};

/**
 * 포인트 통계 계산
 */
export const calculatePointStatistics = (histories: PointHistoryViewModel[]) => {
  const earnedHistories = histories.filter(h => h.isPositive);
  const spentHistories = histories.filter(h => !h.isPositive);

  const totalEarned = earnedHistories.reduce((sum, h) => sum + h.point, 0);
  const totalSpent = spentHistories.reduce((sum, h) => sum + h.point, 0);

  // 오늘 적립된 포인트
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEarned = earnedHistories
    .filter(h => h.date >= todayStart)
    .reduce((sum, h) => sum + h.point, 0);

  // 이번 주 적립된 포인트
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyEarned = earnedHistories
    .filter(h => h.date >= weekStart)
    .reduce((sum, h) => sum + h.point, 0);

  return {
    totalEarned,
    totalSpent,
    todayEarned,
    weeklyEarned,
    transactionCount: histories.length,
  };
};

/**
 * 최근 3개월 날짜 계산
 * Swift Calendar.date 대응
 */
export const getThreeMonthsAgo = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
};

/**
 * 포인트 히스토리 정렬
 */
export const sortPointHistories = (
  histories: PointHistoryViewModel[],
  sortBy: 'date' | 'point' = 'date',
  order: 'asc' | 'desc' = 'desc'
): PointHistoryViewModel[] => {
  return [...histories].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = a.date.getTime() - b.date.getTime();
        break;
      case 'point':
        comparison = a.point - b.point;
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });
};