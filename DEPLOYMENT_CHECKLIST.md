# 개발 환경 배포 체크리스트

## ✅ 완료된 작업

### 1. 환경 설정 파일 생성
- [x] `.env.local` - 로컬 개발 환경
- [x] `.env.dev` - 개발 서버 환경
- [x] `.env.prod` - 운영 환경
- [x] `.env.example` - 템플릿 파일

### 2. 앱 설정 업데이트
- [x] `app.config.js` - 환경별 Bundle ID 자동 설정
- [x] 환경별 앱 이름 표시 (예: "RunTaeho (development)")
- [x] `EXPO_PUBLIC_*` 접두사로 환경 변수 통일
- [x] Google OAuth URL Scheme 환경 변수 연동

### 3. EAS Build 설정
- [x] `eas.json` 생성
- [x] Development 프로필 (내부 테스트용)
- [x] Preview 프로필 (개발 환경 배포)
- [x] Production 프로필 (운영 환경 배포)

### 4. API 설정 개선
- [x] `src/services/api/config.ts` - 환경 변수 동적 로드
- [x] 환경별 로깅 설정 (개발: ON, 운영: OFF)
- [x] API Base URL 자동 감지 및 fallback

### 5. Build Scripts 추가
- [x] `npm run start:local/dev/prod` - 환경별 개발 서버
- [x] `npm run ios:local/dev` - 환경별 iOS 빌드
- [x] `npm run android:local/dev` - 환경별 Android 빌드
- [x] `npm run build:dev:ios/android` - 개발 환경 EAS 빌드
- [x] `npm run build:prod:ios/android` - 운영 환경 EAS 빌드
- [x] `npm run submit:ios/android` - 스토어 제출

### 6. 보안 설정
- [x] `.gitignore` 업데이트 - 환경 파일 제외
- [x] Google Service Account Key 제외
- [x] `.eas/` 폴더 제외
- [x] 민감한 인증서 파일 제외

### 7. 문서화
- [x] `DEPLOYMENT.md` - 상세 배포 가이드
- [x] `DEPLOYMENT_CHECKLIST.md` - 이 체크리스트
- [x] 환경별 설정 방법 문서화
- [x] 트러블슈팅 가이드

---

## 🚀 개발 환경 배포 시작하기

### 1단계: 환경 변수 설정 (⚠️ 중요)

```bash
# .env.dev 파일 수정
nano .env.dev
```

**반드시 변경해야 할 항목:**

```env
# 1. Backend API URL (개발 서버 주소로 변경)
EXPO_PUBLIC_API_BASE_URL=https://dev-api.runtaeho.com/api/v1

# 2. Google OAuth Client IDs (Google Cloud Console에서 발급)
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_DEV_IOS_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID=YOUR_DEV_SERVER_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_DEV_ANDROID_CLIENT_ID.apps.googleusercontent.com
```

### 2단계: EAS CLI 설치 및 로그인

```bash
# EAS CLI 설치
npm install -g eas-cli

# Expo 계정 로그인
eas login

# 프로젝트 초기화 (최초 1회)
eas init
```

### 3단계: 개발 빌드 실행

#### iOS 빌드
```bash
npm run build:dev:ios
```

#### Android 빌드
```bash
npm run build:dev:android
```

### 4단계: 빌드 확인 및 다운로드

```bash
# 빌드 목록 확인
eas build:list

# 빌드 상태 확인
eas build:view [BUILD_ID]
```

---

## 📝 TODO: 추가 작업 필요 사항

### 1. 백엔드 서버 설정
- [ ] 개발 서버 배포 및 URL 확인
- [ ] 개발 서버 CORS 설정 (모바일 앱 허용)
- [ ] 개발 서버 Health Check 엔드포인트 확인
- [ ] 개발 서버 JWT 토큰 설정 확인

### 2. Google OAuth 설정
- [ ] Google Cloud Console에서 개발 환경용 프로젝트 생성
- [ ] iOS OAuth Client ID 발급
  - Bundle ID: `com.hongtaeho.app.development`
- [ ] Android OAuth Client ID 발급
  - Package Name: `com.hongtaeho.app.development`
  - SHA-1 인증서 지문 등록 필요
- [ ] Web OAuth Client ID 발급 (서버용)
- [ ] `.env.dev`에 발급받은 Client ID 입력

### 3. Apple Sign In 설정 (선택사항)
- [ ] Apple Developer에서 개발 환경 Service ID 생성
- [ ] Bundle ID `com.hongtaeho.app.development`에 Sign In Capability 추가
- [ ] Redirect URL 설정

### 4. Android Keystore 생성
```bash
# 개발용 Keystore 생성
keytool -genkeypair -v -storetype PKCS12 -keystore runtaeho-dev.keystore \
  -alias runtaeho-dev -keyalg RSA -keysize 2048 -validity 10000

# SHA-1 확인 (Google OAuth에 등록 필요)
keytool -list -v -keystore runtaeho-dev.keystore -alias runtaeho-dev
```

---

## 🧪 테스트 방법

### 로컬에서 개발 서버 환경 테스트
```bash
# 개발 서버 환경으로 실행
npm run start:dev

# iOS 시뮬레이터에서 테스트
npm run ios:dev

# Android 에뮬레이터에서 테스트
npm run android:dev
```

### 환경 변수 확인
```bash
# Expo 설정 확인
npx expo config --type public

# 환경 변수 로드 확인
cat .env
```

---

## ⚠️ 주의사항

### 1. Bundle Identifier / Package Name
환경별로 다른 식별자를 사용합니다:
- **Local/Development**: `com.hongtaeho.app.development`
- **Production**: `com.hongtaeho.app`

이는 동일 기기에 개발/운영 앱을 동시에 설치할 수 있게 합니다.

### 2. Google OAuth 설정
각 환경마다 **별도의 Google OAuth 앱**을 등록해야 합니다.
Bundle ID/Package Name이 다르기 때문에 Client ID도 달라야 합니다.

### 3. 환경 변수 누락 방지
`.env.dev` 파일의 모든 TODO 항목을 실제 값으로 변경했는지 확인하세요.

### 4. Backend 서버 상태 확인
빌드 전에 개발 서버가 정상 동작하는지 확인:
```bash
curl https://dev-api.runtaeho.com/api/v1/health
```

---

## 🔍 트러블슈팅

### 문제: "EXPO_PUBLIC_API_BASE_URL not set" 경고
**해결**: `.env.dev` 파일이 올바르게 설정되었는지 확인

### 문제: Google Sign In 실패
**해결**:
1. Client ID가 올바른지 확인
2. Bundle ID가 Google Cloud Console에 등록된 것과 일치하는지 확인
3. OAuth 동의 화면이 승인되었는지 확인

### 문제: EAS Build 실패
**해결**:
1. `npx expo config --type public` 실행하여 설정 검증
2. EAS 빌드 로그 확인: `eas build:view [BUILD_ID]`
3. `eas.json`의 프로필 설정 확인

---

## 📚 참고 문서

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 상세 배포 가이드
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Google OAuth Setup](https://docs.expo.dev/guides/google-authentication/)

---

## 🎉 배포 완료 후 확인

- [ ] 앱이 정상적으로 설치됨
- [ ] 로그인 화면 표시됨
- [ ] Google Sign In 동작함
- [ ] Apple Sign In 동작함 (iOS)
- [ ] 백엔드 API 통신 정상
- [ ] GPS 위치 권한 요청 동작
- [ ] 러닝 기록 기능 정상

---

**작성일**: 2025-10-28
**다음 업데이트**: 운영 환경 배포 시
