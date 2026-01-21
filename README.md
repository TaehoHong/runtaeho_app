# RunTaeho App

## 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run start:local

# iOS 실행
npm run ios:local

# Android 실행
npm run android:local
```

## 배포

### 1. 앱 빌드 (앱스토어 심사 필요)

```bash
# Xcode에서 빌드
open ios/RunTaeho.xcworkspace
# Product > Archive > Distribute App > App Store Connect
```

### 2. OTA 업데이트 (심사 불필요)

```bash
# 스테이징 배포
npm run update:staging "메시지"

# 프로덕션 배포
npm run update:prod "메시지"

# 롤백
npm run update:rollback
```

### 점진적 배포

```bash
# 10% 사용자에게 배포
eas update --branch production --rollout-percentage 10 --message "메시지"

# 비율 확대
eas update:edit --rollout-percentage 100
```

### 상태 확인

```bash
eas update:list --branch production
```

### 앱스토어 심사가 필요한 경우

- 새 라이브러리 추가/삭제
- Expo SDK 업그레이드
- Unity 변경
- `app.config.js` 네이티브 설정 변경
