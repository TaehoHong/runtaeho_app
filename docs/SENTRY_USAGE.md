# Sentry Error Tracking 사용 가이드

## 개요

RunTaeho 앱에서 Sentry를 사용하여 에러를 추적하고 모니터링하는 방법을 설명합니다.

## 자동 에러 추적

다음 에러들은 자동으로 Sentry에 전송됩니다:

### 1. React 컴포넌트 에러
ErrorBoundary가 모든 React 컴포넌트 에러를 자동으로 캐치합니다.

```tsx
// 에러가 발생하면 자동으로 Sentry에 리포팅됨
function MyComponent() {
  throw new Error('Something went wrong!');
}
```

### 2. React Query 에러
Query와 Mutation 실패 시 자동으로 리포팅됩니다.

```tsx
const { data, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  // 에러 발생 시 자동으로 Sentry에 전송됨
});
```

### 3. API 에러
API 호출 실패 시 자동으로 리포팅됩니다 (401, 403, 네트워크 에러 제외).

```tsx
// 500, 404 등의 에러는 자동으로 Sentry에 전송됨
await apiClient.get('/api/v1/user/profile');
```

## 수동 에러 리포팅

필요한 경우 수동으로 에러를 리포팅할 수 있습니다:

### 에러 리포팅

```tsx
import { reportError } from '~/config/sentry';

try {
  // 위험한 작업
  await riskyOperation();
} catch (error) {
  // Sentry에 에러 리포팅 (컨텍스트 포함)
  reportError(error as Error, {
    operation: 'riskyOperation',
    userId: user.id,
    timestamp: Date.now(),
  });

  // 사용자에게 에러 메시지 표시
  Alert.alert('오류', '작업을 완료할 수 없습니다.');
}
```

### 메시지 리포팅

```tsx
import { reportMessage } from '~/config/sentry';

// 정보성 메시지
reportMessage('User completed onboarding', 'info');

// 경고 메시지
reportMessage('Unusual activity detected', 'warning');

// 에러 메시지
reportMessage('Critical system failure', 'error');
```

## 사용자 컨텍스트 설정

로그인/로그아웃 시 자동으로 설정되지만, 필요한 경우 수동으로 설정 가능합니다:

```tsx
import { setUserContext, clearUserContext } from '~/config/sentry';

// 사용자 정보 설정
setUserContext(
  user.id.toString(),
  user.email,
  user.nickName
);

// 로그아웃 시 사용자 정보 제거
clearUserContext();
```

## Breadcrumb 추가

디버깅을 위한 이벤트 추적:

```tsx
import { addBreadcrumb } from '~/config/sentry';

// 사용자 액션 추적
addBreadcrumb('User clicked run button', 'user-action', {
  screen: 'running',
  timestamp: Date.now(),
});

// 네비게이션 추적
addBreadcrumb('Navigated to profile', 'navigation', {
  from: 'running',
  to: 'profile',
});

// 데이터 변경 추적
addBreadcrumb('Updated user profile', 'data', {
  field: 'nickName',
  oldValue: 'OldNick',
  newValue: 'NewNick',
});
```

## 커스텀 태그 및 컨텍스트

추가 메타데이터 설정:

```tsx
import { addTag, addContext } from '~/config/sentry';

// 태그 추가 (필터링에 사용)
addTag('app-version', '1.0.0');
addTag('feature', 'running');

// 컨텍스트 추가 (상세 정보)
addContext('running-session', {
  distance: 5000,
  duration: 1800,
  pace: 6.0,
});
```

## 환경별 설정

### 개발 환경
- 에러가 콘솔에만 출력됨
- Sentry로 전송되지 않음
- `debug: true`로 설정되어 상세 로그 출력

### 프로덕션 환경
- 모든 에러가 Sentry로 전송됨
- 샘플링 비율: 20% (성능 모니터링)
- 민감한 정보 자동 필터링

## 에러 필터링

다음 에러들은 자동으로 필터링됩니다:

1. **네트워크 에러**: 사용자 인터넷 연결 문제
2. **인증 에러 (401)**: 토큰 갱신 중 발생하는 정상적인 에러
3. **권한 에러 (403)**: 의도된 접근 제한
4. **타임아웃 에러**: 네트워크 속도 문제

## Sentry 대시보드 사용

### 에러 확인
1. [Sentry 대시보드](https://sentry.io) 로그인
2. "RunTaeho" 프로젝트 선택
3. "Issues" 탭에서 에러 확인

### 유용한 정보
- **Error Type**: 에러 종류 (react-error-boundary, api-error, react-query)
- **User Context**: 에러를 발생시킨 사용자 정보
- **Breadcrumbs**: 에러 발생 전 사용자 액션
- **Stack Trace**: 에러 발생 위치
- **Tags**: 필터링 및 분류용 태그

## 모범 사례

### ✅ 좋은 예

```tsx
// 명확한 에러 메시지와 컨텍스트
try {
  await saveRunningRecord(record);
} catch (error) {
  reportError(error as Error, {
    operation: 'saveRunningRecord',
    recordId: record.id,
    distance: record.distance,
    duration: record.duration,
  });
}
```

### ❌ 나쁜 예

```tsx
// 컨텍스트 없는 에러 리포팅
try {
  await saveRunningRecord(record);
} catch (error) {
  reportError(error as Error); // 컨텍스트 부족
}
```

## 성능 고려사항

1. **에러 리포팅은 비동기**: UI를 블로킹하지 않음
2. **샘플링 활용**: 모든 에러를 보낼 필요는 없음
3. **민감한 정보 제외**: 토큰, 비밀번호 등은 자동 필터링됨
4. **Breadcrumb 제한**: 너무 많은 breadcrumb는 성능 저하

## 문제 해결

### Sentry에 에러가 전송되지 않는 경우

1. **DSN 확인**: `.env` 파일의 `EXPO_PUBLIC_SENTRY_DSN` 확인
2. **환경 확인**: 개발 환경에서는 전송되지 않음
3. **네트워크 확인**: Sentry 서버 연결 가능한지 확인
4. **필터링 확인**: 에러가 필터링되지 않는지 확인

### 에러가 너무 많이 전송되는 경우

1. **샘플링 조정**: `sentry.ts`의 `tracesSampleRate` 값 낮추기
2. **필터링 추가**: `beforeSend`에서 불필요한 에러 필터링
3. **Breadcrumb 제한**: 너무 많은 breadcrumb 추가하지 않기

## 관련 파일

- `src/config/sentry.ts`: Sentry 초기화 및 유틸리티 함수
- `app/_layout.tsx`: Sentry 초기화 및 ErrorBoundary 설정
- `src/components/ErrorBoundary.tsx`: React 에러 캐치
- `src/services/queryClient.ts`: React Query 에러 핸들링
- `src/services/api/interceptors.ts`: API 에러 핸들링
- `src/features/auth/hooks/useAuth.ts`: 사용자 컨텍스트 설정

## 참고 자료

- [Sentry React Native 공식 문서](https://docs.sentry.io/platforms/react-native/)
- [Sentry 대시보드](https://sentry.io)
- [Error Tracking Best Practices](https://docs.sentry.io/platforms/react-native/usage/)
