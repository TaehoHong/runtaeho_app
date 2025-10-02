import { QueryClient } from '@tanstack/react-query';

/**
 * React Query Client 설정
 * RTK Query에서 마이그레이션
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분 - 데이터가 fresh한 시간
      gcTime: 10 * 60 * 1000, // 10분 - 캐시 유지 시간 (구 cacheTime)
      retry: 1, // 실패 시 1번 재시도
      refetchOnWindowFocus: false, // 윈도우 포커스 시 refetch 비활성화
      refetchOnReconnect: true, // 네트워크 재연결 시 refetch
      refetchOnMount: true, // 컴포넌트 마운트 시 refetch
    },
    mutations: {
      retry: 0, // Mutation은 재시도 안함
    },
  },
});

/**
 * Query Keys 중앙 관리
 * 사용 예시:
 * - useQuery({ queryKey: queryKeys.auth.current })
 * - queryClient.invalidateQueries({ queryKey: queryKeys.user.all })
 */
export const queryKeys = {
  // Auth 관련 Query Keys
  auth: {
    all: ['auth'] as const,
    current: ['auth', 'current'] as const,
    token: ['auth', 'token'] as const,
  },

  // User 관련 Query Keys
  user: {
    all: ['user'] as const,
    detail: (id: number) => ['user', id] as const,
    current: ['user', 'current'] as const,
    data: ['user', 'data'] as const,
  },

  // Running 관련 Query Keys
  running: {
    all: ['running'] as const,
    list: (filters?: {
      cursor?: number;
      size?: number;
      startDate?: Date;
      endDate?: Date;
    }) => ['running', 'list', filters] as const,
    detail: (id: number) => ['running', id] as const,
    infinite: (filters?: {
      startDate?: Date;
      endDate?: Date;
    }) => ['running', 'infinite', filters] as const,
    fullList: (filters?: {
      startDate: Date;
      endDate?: Date;
    }) => ['running', 'fullList', filters] as const,
  },

  // Avatar 관련 Query Keys
  avatar: {
    all: ['avatar'] as const,
    main: ['avatar', 'main'] as const,
    items: ['avatar', 'items'] as const,
    userItems: ['avatar', 'userItems'] as const,
    itemsByType: (typeId: number) => ['avatar', 'items', 'type', typeId] as const,
    itemDetail: (itemId: number) => ['avatar', 'items', itemId] as const,
    itemTypes: ['avatar', 'itemTypes'] as const,
    popular: (limit?: number) => ['avatar', 'items', 'popular', limit] as const,
    new: (limit?: number) => ['avatar', 'items', 'new', limit] as const,
    recommended: (limit?: number) => ['avatar', 'items', 'recommended', limit] as const,
  },

  // Point 관련 Query Keys
  point: {
    all: ['point'] as const,
    balance: ['point', 'balance'] as const,
    history: (filters?: {
      cursor?: number;
      isEarned?: boolean;
      startCreatedTimestamp?: number;
      size?: number;
    }) => ['point', 'history', filters] as const,
    statistics: ['point', 'statistics'] as const,
    recentHistory: (startDate: Date) => ['point', 'history', 'recent', startDate] as const,
  },

  // Shoe 관련 Query Keys
  shoe: {
    all: ['shoe'] as const,
    list: (filters?: {
      cursor?: number;
      isEnabled?: boolean;
      size?: number;
    }) => ['shoe', 'list', filters] as const,
    allShoes: (isEnabled?: boolean) => ['shoe', 'all', isEnabled] as const,
    detail: (id: number) => ['shoe', id] as const,
    main: ['shoe', 'main'] as const,
    statistics: ['shoe', 'statistics'] as const,
  },

  // Statistics 관련 Query Keys
  statistics: {
    all: ['statistics'] as const,
    summary: (filters: {
      period: string;
      startDate?: string;
      endDate?: string;
    }) => ['statistics', 'summary', filters] as const,
    chart: (filters: {
      period: string;
      startDate?: string;
      endDate?: string;
    }) => ['statistics', 'chart', filters] as const,
    monthly: (params?: {
      year?: number;
      limit?: number;
    }) => ['statistics', 'monthly', params] as const,
    weekly: (params?: {
      year?: number;
      month?: number;
      limit?: number;
    }) => ['statistics', 'weekly', params] as const,
    yearly: (limit?: number) => ['statistics', 'yearly', limit] as const,
    records: ['statistics', 'records'] as const,
    trends: (filters: {
      currentPeriod: string;
      startDate?: string;
      endDate?: string;
    }) => ['statistics', 'trends', filters] as const,
    goals: (params: {
      weeklyDistance?: number;
      monthlyDistance?: number;
      yearlyDistance?: number;
      weeklyRuns?: number;
      monthlyRuns?: number;
    }) => ['statistics', 'goals', params] as const,
    comparison: (filters: {
      period: string;
      startDate?: string;
      endDate?: string;
    }) => ['statistics', 'comparison', filters] as const,
    consistency: (filters: {
      period: string;
      startDate?: string;
      endDate?: string;
    }) => ['statistics', 'consistency', filters] as const,
    timePatterns: (filters?: {
      startDate?: string;
      endDate?: string;
    }) => ['statistics', 'timePatterns', filters] as const,
    dashboard: (period: string) => ['statistics', 'dashboard', period] as const,
  },
} as const;

/**
 * Query Key 타입 추론을 위한 유틸리티 타입
 */
export type QueryKeys = typeof queryKeys;
