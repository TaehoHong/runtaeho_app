# UserStateManager 마이그레이션 완료 가이드

## 설치 필요 패키지

아래 명령어를 실행하여 필요한 패키지들을 설치하세요:

```bash
# Expo 프로젝트에서 실행
expo install react-native-keychain expo-location expo-notifications expo-constants expo-device

# 또는 npm/yarn 사용시
npm install react-native-keychain expo-location expo-notifications expo-constants expo-device
# or
yarn add react-native-keychain expo-location expo-notifications expo-constants expo-device
```

## iOS 설정 (app.json 또는 app.config.js)

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "러닝을 기록하기 위해 위치 정보가 필요합니다.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "백그라운드에서도 러닝을 계속 기록하기 위해 위치 정보가 필요합니다.",
        "NSLocationAlwaysUsageDescription": "백그라운드에서도 러닝을 계속 기록하기 위해 위치 정보가 필요합니다.",
        "UIBackgroundModes": ["location", "fetch", "remote-notification"]
      }
    }
  }
}
```

## Android 설정 (app.json 또는 app.config.js)

```json
{
  "expo": {
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ]
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "러닝을 기록하기 위해 위치 정보가 필요합니다.",
          "isAndroidBackgroundLocationEnabled": true
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ]
  }
}
```

## 주요 변경사항

### 1. Redux 통합 완료
- 모든 상태가 Redux store에서 관리됩니다
- SwiftUI의 @Published와 동일한 반응형 업데이트

### 2. 보안 강화
- `KeychainManager`: react-native-keychain으로 토큰 안전 저장
- iOS: Keychain Services 사용
- Android: Android Keystore 사용
- 생체 인증 지원

### 3. 권한 관리
- `PermissionManager`: expo-location, expo-notifications 사용
- 위치 권한 (전경/백경)
- 알림 권한
- 권한 상태 실시간 확인

### 4. 시스템 정보
- `SystemInfoManager`: 앱/디바이스 정보 통합 관리
- 앱 버전, 빌드 번호
- 디바이스 정보
- 메모리, OS 정보

## 사용 방법

### 로그인
```typescript
import { userStateManager } from '@/shared/services/userStateManager';

// SwiftUI와 동일한 방식
await userStateManager.login(userDataDto, accessToken, refreshToken);
```

### 상태 접근
```typescript
// Redux store에서 직접 접근
import { useSelector } from 'react-redux';

const currentUser = useSelector(state => state.user.currentUser);
const totalPoint = useSelector(state => state.user.totalPoint);

// 또는 UserStateManager를 통해 접근
const user = userStateManager.currentUser;
const points = userStateManager.totalPoint;
```

### 권한 요청
```typescript
import { permissionManager } from '@/shared/services/PermissionManager';

// 모든 권한 요청
const permissions = await permissionManager.requestAllRequiredPermissions();

// 개별 권한 요청
const locationStatus = await permissionManager.requestLocationPermission();
const notificationStatus = await permissionManager.requestNotificationPermission();
```

### 토큰 자동 갱신
```typescript
// 자동으로 처리됨 (포그라운드 진입 시)
// 수동 갱신이 필요한 경우:
await userStateManager.validateAndRefreshTokenIfNeeded();
```

## 테스트 체크리스트

- [ ] 로그인/로그아웃 동작 확인
- [ ] 토큰 자동 갱신 확인
- [ ] 앱 백그라운드/포그라운드 전환 시 상태 유지
- [ ] 위치 권한 요청 및 저장
- [ ] 알림 권한 요청 및 저장
- [ ] Keychain 저장/로드 (토큰 보안)
- [ ] 시스템 정보 정확성

## 추가 권장사항

1. **에러 바운더리 추가**: 권한 거부 시 fallback UI 제공
2. **백그라운드 태스크 설정**: expo-task-manager로 백그라운드 위치 추적
3. **딥링크 설정**: 설정 앱에서 돌아올 때 상태 재확인

## 문제 해결

### iOS Simulator에서 Keychain 오류
- Keychain Sharing capability 확인
- Simulator 재시작

### Android에서 백그라운드 위치 권한
- Android 10+ 에서는 별도 권한 필요
- 설정 > 권한 > 위치 > "항상 허용" 선택 유도

### 토큰 갱신 실패
- 네트워크 연결 확인
- Refresh token 유효성 확인
- 서버 엔드포인트 확인