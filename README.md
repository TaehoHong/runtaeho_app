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

## 테스트

```bash
# 단위/화면/훅 테스트
npm run test:all
```

## 헤어 색상 에셋 생성

헤어 아이템 썸네일은 색상별 PNG를 사전 생성해서 사용합니다.

```bash
# 헤어 색상 PNG + generated 매핑 파일 생성
npm run assets:generate-hair-colors

# 생성 결과 검증
npm run assets:verify-hair-colors
```

- 원본 경로: `assets/items/Hair/*.png`
- 생성 경로: `assets/items/Hair/<colorId>/<fileName>.png`
- 생성 매핑 파일: `src/shared/constants/generated/hairColorImages.generated.ts`
- 새 헤어 PNG를 추가/교체한 경우 `npm run assets:generate-hair-colors` 실행 후 생성 파일을 함께 커밋합니다.

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



### 상태 확인

```bash
eas update:list --branch production
```

### 앱스토어 심사가 필요한 경우

- 새 라이브러리 추가/삭제
- Expo SDK 업그레이드
- Unity 변경
- `app.config.js` 네이티브 설정 변경
