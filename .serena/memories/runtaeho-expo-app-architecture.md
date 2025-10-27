# RunTaeho EXPO App - 종합 아키텍처 문서

## 1. 프로젝트 개요

RunTaeho App은 Expo 54 기반의 React Native 크로스 플랫폼 러닝/피트니스 애플리케이션입니다.

### 기술 스택
- **프레임워크**: Expo 54, React Native 0.81.4, React 19.1.0
- **언어**: TypeScript 5.9.2 (Strict Mode)
- **상태 관리**: Zustand 5.0.8 (Redux Toolkit에서 마이그레이션)
- **데이터 페칭**: TanStack Query (React Query) 5.90.2
- **네비게이션**: Expo Router 6.0.6 (File-based routing)
- **HTTP 클라이언트**: Axios 1.12.2
- **인증**: Google Sign-In, Apple Authentication
- **스토리지**: SecureStore (토큰), AsyncStorage (일반 데이터)
- **위치 추적**: expo-location (백그라운드 지원)
- **폰트**: Pretendard, Cafe24PROUP

### 빌드 구성
- **패키지 ID**: com.hongtaeho.app
- **Apple Team ID**: Y9XN2ZQ9G3
- **New Architecture**: Enabled
- **Typed Routes**: Enabled
- **React Compiler**: Experimental (Enabled)

---

## 2. 디렉토리 구조

### 루트 레벨
```
runtaeho_app/
├── app/                    # Expo Router 라우팅 파일
│   ├── index.tsx          # 앱 진입점 (로그인 상태 분기)
│   ├── _layout.tsx        # 루트 레이아웃 (Provider 설정)
│   ├── (tabs)/            # 탭 네비게이션 그룹
│   ├── auth/              # 인증 관련 화면
│   └── user/              # 사용자 관련 화면
├── src/                    # 소스 코드 (Feature-based 구조)
│   ├── features/          # 도메인별 Feature 모듈
│   ├── shared/            # 공통 컴포넌트, 유틸리티
│   ├── stores/            # Zustand 스토어
│   ├── services/          # API 클라이언트, Query 설정
│   ├── providers/         # Context Providers
│   ├── config/            # 앱 설정
│   └── utils/             # 유틸리티 함수
├── assets/                # 정적 리소스 (이미지, 폰트)
├── scripts/               # 빌드/개발 스크립트
└── ios/                   # iOS 네이티브 코드
```

### Path Aliases
```typescript
"@/*": ["./app/*"]     // 라우팅 파일
"~/*": ["./src/*"]     // 소스 코드
```

---

## 3. Feature 모듈 구조 (MVVM 패턴)

각 Feature는 독립적인 모듈로 구성되며 다음 구조를 따릅니다:

```
src/features/{feature}/
├── models/            # 데이터 모델, DTO, 타입 정의
├── viewmodels/        # 비즈니스 로직, ViewModel (React Hook 형태)
├── views/             # UI 컴포넌트
│   └── components/    # Feature 전용 컴포넌트
├── services/          # API 서비스, React Query hooks
├── hooks/             # Feature 전용 Custom Hooks
├── stores/            # Feature 전용 Zustand 스토어 (있는 경우)
├── contexts/          # Feature 전용 Context (있는 경우)
└── index.ts           # Public API Export
```

### 현재 구현된 Features

#### 1) **Auth (인증)**
- **Strategy 패턴**: GoogleAuthStrategy, AppleAuthStrategy
- **토큰 관리**: JWT Access/Refresh Token
- **자동 갱신**: TokenRefreshInterceptor (5분 전 자동 갱신)
- **스토리지**: SecureStore (토큰), AsyncStorage (로그인 상태)
- **Store**: `authStore.ts` (Zustand + persist)

**주요 파일**:
- `strategies/AuthStrategyFactory.ts`: 인증 전략 팩토리
- `services/AuthenticationService.ts`: 인증 서비스
- `services/SilentTokenRefreshService.ts`: 토큰 자동 갱신
- `hooks/useAuth.ts`: 통합 인증 Hook
- `stores/authStore.ts`: 인증 상태 관리

**정책**:
- Access Token 유효기간: 14400ms (4시간)
- Refresh Token 유효기간: 7884000ms (약 91일)
- 토큰 갱신 임계값: 300초 (5분) 전
- 실패 시 자동 로그아웃
- AsyncStorage에 `isLoggedIn`만 persist

#### 2) **Running (러닝)**
- **GPS 추적**: expo-location (백그라운드 모드)
- **실시간 통계**: 거리, 시간, 페이스, 칼로리, 심박수
- **상태 관리**: RunningState (Stopped, Running, Paused, Finished)
- **오프라인 지원**: OfflineStorageService
- **권한 관리**: PermissionManager (위치, 백그라운드)

**주요 파일**:
- `viewmodels/RunningViewModel.ts`: 러닝 비즈니스 로직
- `services/LocationService.ts`: GPS 추적
- `services/BackgroundTaskService.ts`: 백그라운드 작업
- `services/runningService.ts`: API 통신
- `contexts/RunningContext.tsx`: 러닝 상태 공유

**API 엔드포인트**:
- `POST /api/v1/running`: 러닝 시작
- `POST /api/v1/running/{id}/end`: 러닝 종료
- `GET /api/v1/running/search`: 기록 조회
- `PUT /api/v1/running/{id}`: 기록 업데이트

**정책**:
- GPS 업데이트 간격: 실시간 (백그라운드 모드)
- 거리 단위: 미터 (m)
- 시간 단위: 초 (s)
- 페이스 계산: 분/km
- 백그라운드 위치 권한 필수

#### 3) **Avatar (아바타/캐릭터)**
- **커스터마이징**: 헤어, 의상, 갑옷 등
- **아이템 구매**: 포인트 기반
- **Unity 통합**: iOS UnityBridge
- **카테고리**: HAIR, CLOTHING, ARMOR

**주요 파일**:
- `viewmodels/useAvatarViewModel.ts`: 아바타 로직
- `services/avatarService.ts`: API 통신
- `models/Item.ts`: 아이템 모델

**API 엔드포인트**:
- `GET /api/v1/avatar`: 아바타 조회
- `GET /api/v1/item/all`: 아이템 목록
- `POST /api/v1/user-item`: 아이템 구매

#### 4) **Point (포인트)**
- **적립**: 러닝 완료, 일일 보너스
- **사용**: 아이템 구매
- **히스토리**: 커서 기반 페이지네이션

**주요 파일**:
- `services/pointService.ts`: API 통신
- `viewmodels/PointViewModel.ts`: 포인트 로직

**API 엔드포인트**:
- `GET /api/v1/user-point`: 잔액 조회
- `POST /api/v1/user-point`: 포인트 업데이트
- `GET /api/v1/user-point/histories`: 히스토리

**정책**:
- 러닝 포인트 적립: 거리/시간 기반
- 일일 보너스: 연속 출석일 기반
- 아이템 구매 시 차감

#### 5) **Shoes (신발 관리)**
- **신발 등록**: 브랜드, 모델, 거리 추적
- **상태 관리**: isEnabled (활성/비활성)

**주요 파일**:
- `services/shoeService.ts`: API 통신
- `models/Shoe.ts`: 신발 모델

**API 엔드포인트**:
- `GET /api/v1/shoe`: 신발 목록
- `POST /api/v1/shoe`: 신발 추가
- `PATCH /api/v1/shoe/{id}`: 신발 수정

#### 6) **Statistics (통계)**
- **기간별 조회**: 일일, 주간, 월간
- **차트**: PeriodChart 컴포넌트
- **기록 목록**: RunningRecordList

**주요 파일**:
- `viewmodels/StatisticViewModel.ts`: 통계 로직
- `services/statisticsService.ts`: API 통신
- `views/StatisticsView.tsx`: 통계 화면

#### 7) **User (사용자)**
- **프로필 관리**: 사용자 정보 조회/수정
- **계정 연동**: Google, Apple 계정 연동 관리
- **메뉴**: 설정, 로그아웃

**주요 파일**:
- `services/userService.ts`: API 통신
- `models/User.ts`: 사용자 모델
- `hooks/useAccountConnection.ts`: 계정 연동 Hook

#### 8) **Unity (Unity 통합)**
- **iOS Bridge**: Swift/Objective-C 브릿지
- **캐릭터 렌더링**: 2D 캐릭터 표시
- **통신**: React Native ↔ Unity 메시지 전달

**주요 파일**:
- `bridge/UnityBridge.ts`: TypeScript 브릿지
- `bridge/iOS/RNUnityBridge.swift`: Swift 브릿지
- `components/UnityView.tsx`: Unity View 컴포넌트

---

## 4. 상태 관리 (Zustand)

### Global Stores

#### 1) **appStore** (`src/stores/app/appStore.ts`)
```typescript
interface AppState {
  viewState: ViewState;        // Loading | Loaded
  runningState: RunningState;  // Stopped | Running | Paused | Finished
  
  setViewState: (viewState: ViewState) => void;
  setRunningState: (runningState: RunningState) => void;
  resetAppState: () => void;
}
```

**사용처**:
- 앱 초기화 로딩 상태
- 러닝 상태에 따른 탭바 표시/숨김 제어
- 전역 앱 상태 관리

#### 2) **authStore** (`src/features/auth/stores/authStore.ts`)
```typescript
interface AuthState {
  isLoggedIn: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  
  login: () => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  initializeTokens: () => Promise<void>;
  getAccessTokenSafe: () => Promise<string | null>;
  getRefreshTokenSafe: () => Promise<string | null>;
}
```

**Persist 설정**:
- AsyncStorage에 `isLoggedIn`만 persist
- Access/Refresh Token은 SecureStore에 별도 저장
- 앱 재시작 시 자동 토큰 동기화

#### 3) **userStore** (`src/stores/user/userStore.ts`)
- 사용자 정보 캐싱
- 포인트 잔액 실시간 업데이트

#### 4) **unityStore** (`src/stores/unity/unityStore.ts`)
- Unity 통신 상태
- 캐릭터 데이터

---

## 5. API 통신 구조

### API Client (`src/services/api/client.ts`)
```typescript
const apiClient = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,  // http://localhost:8080/api/v1
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Interceptors

#### 1) **Token Refresh Interceptor**
- **파일**: `src/shared/services/TokenRefreshInterceptor.ts`
- **기능**: 
  - Access Token 만료 5분 전 자동 갱신
  - 갱신 중 요청 대기열 관리
  - 갱신 실패 시 자동 로그아웃
- **임계값**: 300초 (5분)

#### 2) **Request Logging Interceptor**
- **파일**: `src/services/api/interceptors.ts`
- **기능**: 
  - 요청/응답 로깅 (개발 환경만)
  - 요청 시간 측정
  - 에러 로깅

### API Endpoints (`src/services/api/config.ts`)
```typescript
API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/oauth/{provider}',
    LOGOUT: '/logout',
    REFRESH: '/auth/refresh',
  },
  RUNNING: {
    BASE: '/running',
    DETAIL: (id) => `/running/${id}`,
    END: (id) => `/running/${id}/end`,
    SEARCH: '/running/search',
  },
  AVATAR: { /* ... */ },
  POINT: { /* ... */ },
  SHOE: { /* ... */ },
  USER: { /* ... */ },
}
```

### React Query 설정 (`src/services/queryClient.ts`)
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5분
      gcTime: 10 * 60 * 1000,       // 10분
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Query Keys 패턴
각 Feature의 `*Queries.ts` 파일에서 관리:
```typescript
// src/features/running/services/runningQueries.ts
export const runningKeys = {
  all: ['running'] as const,
  lists: () => [...runningKeys.all, 'list'] as const,
  list: (filters: string) => [...runningKeys.lists(), filters] as const,
  details: () => [...runningKeys.all, 'detail'] as const,
  detail: (id: number) => [...runningKeys.details(), id] as const,
};
```

---

## 6. 네비게이션 및 라우팅

### Expo Router (File-based Routing)

#### 라우트 구조
```
app/
├── index.tsx                    # / (진입점)
├── _layout.tsx                  # 루트 레이아웃
├── (tabs)/                      # 탭 그룹
│   ├── _layout.tsx              # 탭 레이아웃
│   ├── running.tsx              # /(tabs)/running
│   ├── statistics.tsx           # /(tabs)/statistics
│   └── profile.tsx              # /(tabs)/profile
├── auth/
│   └── login.tsx                # /auth/login (Modal)
└── user/
    ├── _layout.tsx
    ├── account-connection.tsx   # /user/account-connection
    └── my-info.tsx              # /user/my-info
```

#### 탭 네비게이션 설정
**파일**: `app/(tabs)/_layout.tsx`

```typescript
<Tabs
  initialRouteName="running"
  screenOptions={{
    tabBarStyle: {
      opacity: shouldShowTabBar ? 1 : 0,  // 러닝 중 숨김
      pointerEvents: shouldShowTabBar ? 'auto' : 'none',
    },
    tabBarActiveTintColor: '#45DA31',     // PRIMARY.600
    tabBarInactiveTintColor: '#B4B4B4',   // GREY.400
  }}
>
  <Tabs.Screen name="profile" />
  <Tabs.Screen name="running" />
  <Tabs.Screen name="statistics" />
</Tabs>
```

**정책**:
- 러닝 중(`RunningState !== Stopped`) 탭바 숨김
- 초기 화면: running 탭
- 로그인 화면: Modal Presentation

#### 네비게이션 플로우
1. **앱 시작** → `app/index.tsx`
2. **로그인 체크** → AuthProvider
3. **로그인 O** → `/(tabs)/running`
4. **로그인 X** → `/auth/login`

---

## 7. 공통 코드 및 유틸리티

### 1) **Shared Components** (`src/shared/components/`)

#### UI Components
- **Icon**: expo-image 기반 고성능 아이콘 컴포넌트
- **Text**: 커스텀 텍스트 컴포넌트 (폰트 지원)
- **TextInput**: 커스텀 입력 컴포넌트
- **LoadingView**: 로딩 화면

#### Common Components
- **ErrorBoundary**: 에러 경계 처리
- **LazyComponents**: 지연 로딩 컴포넌트

### 2) **Shared Styles** (`src/shared/styles/`)

#### 컬러 시스템 (`colors.ts`)
**Figma 디자인 시스템 기반**:
```typescript
PRIMARY = {
  900: '#008B0F',
  500: '#59EC3A',  // Main Color
  50: '#EEFEE9',
}

GREY = {
  900: '#202020',
  500: '#9D9D9D',
  WHITE: '#FFFFFF',
}

RED = {
  DEFAULT: '#f03532',
  500: '#FF4032',
}

BLUE = {
  SECONDARY: '#66EAF1',
  DEFAULT: '#3283ff',
}
```

### 3) **Shared Hooks** (`src/shared/hooks/`)
- `useOptimizedCallbacks`: 성능 최적화 콜백
- `usePerformanceMonitor`: 성능 모니터링

### 4) **Storage Utilities** (`src/utils/storage/`)

#### SecureStorage
- **용도**: JWT 토큰, 민감 정보
- **구현**: expo-secure-store
- **메서드**: `saveTokens`, `loadTokens`, `clearTokens`

#### BiometricStorage
- **용도**: 생체 인증 기반 스토리지
- **지원**: Face ID, Touch ID

### 5) **Shared Services** (`src/shared/services/`)
- **ErrorService**: 전역 에러 처리
- **PermissionManager**: 권한 관리
- **TokenRefreshInterceptor**: 토큰 자동 갱신

---

## 8. 개발 환경 설정

### 환경 변수 (`.env`)
```
API_BASE_URL=http://localhost:8080/api/v1
GOOGLE_IOS_CLIENT_ID=...
GOOGLE_SERVER_CLIENT_ID=...
```

### App Config (`app.config.js`)
```javascript
{
  name: "app",
  slug: "app",
  version: "1.0.0",
  newArchEnabled: true,
  ios: {
    bundleIdentifier: "com.hongtaeho.app",
    usesAppleSignIn: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "...",
      NSLocationAlwaysAndWhenInUseUsageDescription: "...",
      UIBackgroundModes: ["location"]
    }
  }
}
```

### TypeScript 설정 (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "paths": {
      "@/*": ["./app/*"],
      "~/*": ["./src/*"]
    }
  }
}
```

### 개발 도구
- **devSetup.ts**: API 로깅 인터셉터
- **devResetHelper.ts**: 개발 중 상태 리셋

---

## 9. Provider 계층 구조

**파일**: `app/_layout.tsx`

```
<QueryClientProvider>
  <AuthProvider>
    <AppStateProvider>
      <Stack>
        {/* Routes */}
      </Stack>
    </AppStateProvider>
  </AuthProvider>
</QueryClientProvider>
```

### Provider 역할

#### 1) **QueryClientProvider**
- React Query 설정
- 캐시 관리
- 자동 refetch 제어

#### 2) **AuthProvider**
- 인증 상태 초기화
- 토큰 동기화 (SecureStore ↔ Zustand)
- 자동 로그인 체크
- 네비게이션 제어 (로그인/로그아웃 시)

#### 3) **AppStateProvider**
- 앱 상태 모니터링
- Foreground/Background 전환 감지

---

## 10. 권한 관리

### PermissionManager (`src/features/running/services/PermissionManager.ts`)

#### 지원 권한
- **위치 (필수)**: Foreground + Background
- **알림**: 러닝 알림
- **헬스킷**: iOS 헬스 데이터 (선택)

#### 정책
- 앱 시작 시 자동 권한 요청 (`app/_layout.tsx`)
- 위치 권한 거부 시 러닝 기능 제한
- 백그라운드 위치 권한 필수 (러닝 추적)

---

## 11. 폰트 시스템

### 지원 폰트
- **Pretendard**: Thin ~ Black (9 weight)
- **Cafe24PROUP**: 디스플레이 폰트

### 로딩
**파일**: `app/index.tsx`
```typescript
const [fontsLoaded] = Font.useFonts({
  'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.ttf'),
  'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.ttf'),
  // ...
});
```

---

## 12. 주요 정책 요약

### 인증
- JWT 기반 Access/Refresh Token
- Access Token: 4시간
- Refresh Token: 91일
- 자동 갱신: 5분 전
- 실패 시 자동 로그아웃

### 러닝
- GPS 업데이트: 실시간
- 백그라운드 위치 추적 필수
- 오프라인 지원
- 거리 단위: 미터
- 시간 단위: 초

### 포인트
- 러닝 완료 시 자동 적립
- 일일 보너스 지원
- 아이템 구매 시 차감

### 네비게이션
- 로그인 시: 러닝 탭으로 이동
- 러닝 중: 탭바 숨김
- 로그인 화면: Modal

---

## 13. 성능 최적화

### React Query
- staleTime: 5분
- gcTime: 10분
- refetchOnWindowFocus: false

### 이미지
- expo-image 사용 (고성능)
- 메모리-디스크 캐싱
- LazyLoading 지원

### 컴포넌트
- React Compiler (Experimental)
- useOptimizedCallbacks
- ErrorBoundary

---

## 14. 테스트 및 디버깅

### 개발 환경 전용
- **API 로깅**: Request/Response 상세 로그
- **상태 리셋**: devResetHelper
- **React Query Devtools**: 쿼리 상태 모니터링

### 로깅 규칙
```typescript
console.log('🚀 [REQUEST]')
console.log('📥 [RESPONSE]')
console.log('❌ [ERROR]')
console.log('✅ [SUCCESS]')
console.log('🔐 [AUTH]')
```

---

## 15. 향후 개선 사항

### 계획된 기능
1. Unity 통합 강화 (Android 지원)
2. 헬스킷/Google Fit 통합
3. 소셜 기능 (친구, 랭킹)
4. 푸시 알림 시스템
5. 오프라인 모드 개선
6. 국제화 (i18n)

### 기술 부채
- Redux Toolkit 완전 제거 (일부 레거시 코드)
- Unity Bridge Android 지원
- 테스트 커버리지 확대
- 접근성 (a11y) 개선

---

**문서 작성일**: 2025-01-24  
**버전**: 1.0.0  
**작성자**: Claude Code Analysis
