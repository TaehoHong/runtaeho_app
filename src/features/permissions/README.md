# Permissions Feature

확장성, 가독성, 유지보수성을 위한 **전략 패턴 기반 권한 관리 시스템**

## 특징

### 확장성 (Scalability)
- **Strategy Pattern**: 새로운 권한 추가 시 전략 클래스만 작성하면 됨
- **Factory Pattern**: 권한 타입별 전략 자동 생성
- **선언적 플로우 설정**: 코드 수정 없이 설정 파일만 변경

### 가독성 (Readability)
- **명확한 책임 분리**: Strategy, Manager, Hooks
- **선언적 API**: `executeFlow('login')` 같은 직관적 인터페이스
- **TypeScript 엄격한 타입**: 런타임 에러 방지

### 유지보수성 (Maintainability)
- **단일 책임 원칙**: 각 파일이 하나의 역할만 담당
- **Observer Pattern**: 권한 상태 변경 자동 구독
- **영구 저장**: AsyncStorage로 권한 상태 유지
- **에러 처리**: 모든 레벨에서 에러 핸들링

## 아키텍처

```
permissions/
├── models/              # 타입 정의
│   └── PermissionTypes.ts
├── strategies/          # Strategy Pattern
│   ├── PermissionStrategy.ts          # Interface
│   ├── LocationForegroundStrategy.ts
│   ├── LocationBackgroundStrategy.ts
│   ├── NotificationStrategy.ts
│   └── PermissionStrategyFactory.ts   # Factory
├── services/
│   └── PermissionManager.ts           # Core Manager
├── hooks/               # React Hooks
│   ├── usePermission.ts               # 단일 권한
│   ├── usePermissionFlow.ts           # 플로우 실행
│   └── usePermissionStatus.ts         # 상태 구독
├── config/
│   └── permissionFlows.ts             # 선언적 플로우 설정
└── index.ts             # Public API
```

## 사용법

### 1. 단일 권한 요청 (Imperative API)

```typescript
import { permissionManager, PermissionType } from '~/features/permissions';

// 권한 요청
const result = await permissionManager.requestPermission(
  PermissionType.LOCATION_FOREGROUND
);

if (result.status === PermissionStatus.GRANTED) {
  console.log('Permission granted');
} else {
  console.log('Permission denied');
  await permissionManager.openSettings(PermissionType.LOCATION_FOREGROUND);
}
```

### 2. 권한 플로우 실행 (Declarative API - 권장)

```typescript
import { permissionManager } from '~/features/permissions';

// 로그인 플로우: Foreground Location만 요청
const result = await permissionManager.executeFlow('login');

if (result.success) {
  console.log('All permissions granted');
} else if (result.aborted) {
  console.error('Critical permission denied:', result.failedStep);
} else {
  console.log('Some permissions denied, but continuing');
}
```

### 3. React Hook 사용 (Component)

#### 단일 권한 관리

```typescript
import { usePermission, PermissionType } from '~/features/permissions';

function LocationPermissionButton() {
  const {
    isGranted,
    isDenied,
    isRequesting,
    request,
    openSettings,
  } = usePermission(PermissionType.LOCATION_FOREGROUND);

  if (isGranted) {
    return <Text>✅ Location Enabled</Text>;
  }

  return (
    <View>
      <Button
        onPress={request}
        disabled={isRequesting}
        title={isRequesting ? 'Requesting...' : 'Enable Location'}
      />
      {isDenied && (
        <Button onPress={openSettings} title="Open Settings" />
      )}
    </View>
  );
}
```

#### 플로우 실행

```typescript
import { usePermissionFlow } from '~/features/permissions';

function LoginScreen() {
  const { execute, isExecuting, result, isSuccess } = usePermissionFlow();

  const handleLogin = async () => {
    // 로그인 플로우 실행
    const flowResult = await execute('login');

    if (flowResult.success) {
      // 모든 권한 승인됨
      navigation.navigate('Home');
    } else if (flowResult.aborted) {
      // 필수 권한 거부됨
      Alert.alert('Error', 'Location permission is required');
    }
  };

  return (
    <Button
      onPress={handleLogin}
      disabled={isExecuting}
      title="Login"
    />
  );
}
```

#### 권한 상태 구독

```typescript
import { usePermissionStatus, PermissionType } from '~/features/permissions';

function PermissionStatusScreen() {
  const statuses = usePermissionStatus([
    PermissionType.LOCATION_FOREGROUND,
    PermissionType.LOCATION_BACKGROUND,
    PermissionType.NOTIFICATION,
  ]);

  return (
    <View>
      {Array.from(statuses.entries()).map(([type, result]) => (
        <Text key={type}>
          {type}: {result.status}
        </Text>
      ))}
    </View>
  );
}
```

## 플로우 설정

### 기본 제공 플로우

#### 1. `login` - 로그인 플로우
```typescript
// Foreground Location만 필수
// 거부 시 로그인 중단
{
  id: 'login_flow',
  steps: [
    {
      permission: PermissionType.LOCATION_FOREGROUND,
      onDenied: 'abort',  // 중단
      retryable: true,
    },
  ],
}
```

#### 2. `running_start` - 러닝 시작 플로우
```typescript
// Foreground (필수) + Background (권장) + Notification (선택)
{
  id: 'running_start_flow',
  steps: [
    {
      permission: PermissionType.LOCATION_FOREGROUND,
      onDenied: 'abort',  // 거부 시 중단
      retryable: true,
    },
    {
      permission: PermissionType.LOCATION_BACKGROUND,
      onDenied: 'continue',  // 거부해도 계속
      retryable: true,
    },
    {
      permission: PermissionType.NOTIFICATION,
      onDenied: 'continue',
      retryable: false,
    },
  ],
}
```

#### 3. `full` - 전체 권한 플로우
```typescript
// 모든 권한 요청 (설정 화면에서 사용)
// 모두 선택 사항으로 처리
```

### 커스텀 플로우 추가

`src/features/permissions/config/permissionFlows.ts`에서 새로운 플로우 정의:

```typescript
export const MY_CUSTOM_FLOW: PermissionFlow = {
  id: 'my_custom_flow',
  name: '커스텀 플로우',
  description: '특정 기능을 위한 권한 플로우',
  steps: [
    {
      permission: PermissionType.LOCATION_FOREGROUND,
      onDenied: 'abort',
      retryable: true,
    },
    {
      permission: PermissionType.NOTIFICATION,
      onDenied: 'skip',  // 건너뛰기
      retryable: false,
    },
  ],
};

// PERMISSION_FLOWS에 등록
export const PERMISSION_FLOWS: Record<string, PermissionFlow> = {
  login: LOGIN_PERMISSION_FLOW,
  running_start: RUNNING_START_PERMISSION_FLOW,
  full: FULL_PERMISSION_FLOW,
  my_custom: MY_CUSTOM_FLOW,  // 추가
};
```

## 새로운 권한 추가하기

### 1. 권한 타입 정의

`src/features/permissions/models/PermissionTypes.ts`:

```typescript
export enum PermissionType {
  // 기존 권한들...
  CAMERA = 'CAMERA',  // 새로운 권한
}
```

### 2. Strategy 클래스 작성

`src/features/permissions/strategies/CameraStrategy.ts`:

```typescript
import { Platform } from 'react-native';
import * as Camera from 'expo-camera';
import { PermissionType, PermissionResult } from '../models/PermissionTypes';
import { BasePermissionStrategy } from './PermissionStrategy';

export class CameraStrategy extends BasePermissionStrategy {
  readonly type = PermissionType.CAMERA;

  isSupported(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  async checkPermission(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Camera.getCameraPermissionsAsync();
    return this.convertStatus(status, canAskAgain);
  }

  async requestPermission(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
    return this.convertStatus(status, canAskAgain);
  }
}
```

### 3. Factory에 등록

`src/features/permissions/strategies/PermissionStrategyFactory.ts`:

```typescript
import { CameraStrategy } from './CameraStrategy';

const strategyMap = new Map<PermissionType, () => IPermissionStrategy>([
  // 기존 전략들...
  [PermissionType.CAMERA, () => new CameraStrategy()],  // 추가
]);
```

### 4. 설정 추가 (선택)

`src/features/permissions/config/permissionFlows.ts`:

```typescript
export const PERMISSION_CONFIGS: Record<PermissionType, PermissionConfig> = {
  // 기존 설정들...
  [PermissionType.CAMERA]: {
    type: PermissionType.CAMERA,
    title: '카메라 권한',
    description: '프로필 사진 촬영',
    rationale: '프로필 사진을 촬영하기 위해 카메라 권한이 필요합니다.',
    isRequired: false,
    platform: 'both',
  },
};
```

끝! 이제 `PermissionType.CAMERA`를 바로 사용할 수 있습니다.

## 고급 기능

### 권한 상태 구독 (Observer Pattern)

```typescript
import { permissionManager } from '~/features/permissions';

// 권한 상태 변경 구독
const unsubscribe = permissionManager.subscribe((statuses) => {
  console.log('Permission changed:', statuses);
});

// 구독 해제
unsubscribe();
```

### 권한 상태 영구 저장

권한 상태는 자동으로 AsyncStorage에 저장됩니다.
앱 재시작 시 자동으로 복원됩니다.

```typescript
// 저장된 상태 초기화 (테스트/디버그용)
await permissionManager.clearPersistedStatuses();
```

### Rationale 표시

사용자가 이전에 권한을 거부한 경우, 권한 요청 전에 설명을 보여줄지 확인:

```typescript
const strategy = PermissionStrategyFactory.getStrategy(
  PermissionType.LOCATION_BACKGROUND
);

const shouldShow = await strategy.shouldShowRationale();

if (shouldShow) {
  // Rationale UI 표시 (Modal 등)
  Alert.alert(
    '백그라운드 위치 권한',
    '화면이 꺼진 상태에서도 러닝을 계속 기록하기 위해 필요합니다.'
  );
}

// 권한 요청
const result = await strategy.requestPermission();
```

## 에러 처리

### 권한 요청 실패

```typescript
try {
  const result = await permissionManager.requestPermission(
    PermissionType.LOCATION_FOREGROUND
  );

  if (result.status !== PermissionStatus.GRANTED) {
    // 권한 거부 처리
    if (!result.canAskAgain) {
      // 설정 화면으로 안내
      Alert.alert(
        'Permission Required',
        'Please enable location in settings',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => permissionManager.openSettings(PermissionType.LOCATION_FOREGROUND)
          },
        ]
      );
    }
  }
} catch (error) {
  console.error('Permission request failed:', error);
}
```

### 플로우 실행 실패

```typescript
const flowResult = await permissionManager.executeFlow('running_start');

if (!flowResult.success) {
  if (flowResult.aborted) {
    // 필수 권한 거부로 중단됨
    console.error('Critical permission denied:', flowResult.failedStep);
  } else {
    // 일부 권한만 거부됨 (계속 진행 가능)
    const deniedPermissions = flowResult.completedSteps.filter(
      (step) => step.status !== PermissionStatus.GRANTED
    );
    console.log('Some permissions denied:', deniedPermissions);
  }
}
```

## 테스트

### 권한 상태 초기화

```typescript
// 모든 권한 상태 초기화 (테스트 전)
await permissionManager.clearPersistedStatuses();
```

### Mock Strategy 사용

```typescript
// 테스트용 Mock Strategy
class MockLocationStrategy implements IPermissionStrategy {
  readonly type = PermissionType.LOCATION_FOREGROUND;

  isSupported() { return true; }

  async checkPermission() {
    return {
      type: this.type,
      status: PermissionStatus.GRANTED,
      canAskAgain: false,
      timestamp: Date.now(),
    };
  }

  async requestPermission() {
    return this.checkPermission();
  }

  async openSettings() {}
  async shouldShowRationale() { return false; }
}

// Factory 캐시 초기화 후 테스트
PermissionStrategyFactory.clearCache();
```

## 마이그레이션 가이드

### 기존 코드에서 마이그레이션

#### Before (기존 코드)

```typescript
// AuthProvider.tsx
const [Location, Notifications] = await Promise.all([
  import('expo-location'),
  import('expo-notifications')
]);

const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
```

#### After (새로운 시스템)

```typescript
// AuthProvider.tsx
const { permissionManager } = await import('~/features/permissions');

const result = await permissionManager.executeFlow('login');

if (result.success) {
  console.log('All permissions granted');
}
```

## 패턴별 사용 사례

### Strategy Pattern
- 각 권한별 요청 로직 캡슐화
- 플랫폼별 분기 처리 자동화
- 테스트 시 Mock 전략 주입 가능

### Factory Pattern
- 권한 타입에 맞는 전략 자동 생성
- Singleton으로 인스턴스 재사용
- 타입 안전성 보장

### Observer Pattern
- 권한 상태 변경 시 UI 자동 업데이트
- 여러 컴포넌트에서 동시 구독 가능
- 메모리 누수 방지 (unsubscribe 함수)

### Chain of Responsibility
- 순차적 권한 요청 플로우
- 실패 시 다음 단계로 진행 또는 중단
- 선언적 설정으로 플로우 정의

## 주의사항

### iOS Background Location
- iOS에서 Background 권한은 Foreground 권한이 먼저 승인되어야 요청 가능
- Info.plist에 NSLocationAlwaysAndWhenInUseUsageDescription 필수
- UIBackgroundModes에 location 추가 필요

### Android Background Location
- Android 10+ (API 29)부터 Background 권한 별도 요청 필요
- Android <10은 Foreground 권한과 동일
- ACCESS_BACKGROUND_LOCATION manifest 추가 필요

### Permission Rationale
- Android에서는 사용자가 권한을 거부한 후 다시 요청 시 rationale 표시 권장
- iOS에서는 첫 요청 전에 rationale 표시 권장 (특히 Background)

## 성능 최적화

### 권한 상태 캐싱
- PermissionManager가 내부적으로 상태 캐싱
- 불필요한 API 호출 방지
- AsyncStorage로 영구 저장

### Lazy Loading
- Dynamic import로 필요할 때만 로드
- 앱 초기 번들 사이즈 감소

### React Hooks Optimization
- useCallback, useMemo로 리렌더링 최적화
- Observer Pattern으로 필요한 컴포넌트만 업데이트

## 라이선스

MIT

## 기여

새로운 권한 Strategy 추가 시:
1. Strategy 클래스 작성
2. Factory에 등록
3. Config에 메타데이터 추가
4. README에 사용 예제 추가

## 변경 이력

### v1.0.0 (2025-01-18)
- Initial release
- Strategy Pattern 기반 권한 관리
- 선언적 플로우 설정
- React Hooks 제공
- Location (Foreground/Background), Notification 지원
