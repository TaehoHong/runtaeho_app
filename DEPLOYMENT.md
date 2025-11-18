# RunTaeho App - 배포 가이드

## 📋 목차
1. [환경 구성](#환경-구성)
2. [개발 환경 배포](#개발-환경-배포)
3. [운영 환경 배포](#운영-환경-배포)
4. [트러블슈팅](#트러블슈팅)

---

## 환경 구성

### 1. 환경별 설정 파일

프로젝트는 3가지 환경으로 구성됩니다:

- **Local (로컬 개발)**: `.env.local`
- **Development (개발 서버)**: `.env.dev`
- **Production (운영)**: `.env.prod`

### 2. 환경 변수 설정

각 환경에 맞는 `.env` 파일을 생성하고 설정합니다:

```bash
# .env.example 파일을 복사하여 시작
cp .env.example .env.local
cp .env.example .env.dev
cp .env.example .env.prod
```

#### 필수 환경 변수

```env
# Backend API URL (환경별로 변경 필요)
EXPO_PUBLIC_API_BASE_URL=https://dev-api.runtaeho.com/api/v1

# Environment
EXPO_PUBLIC_ENV=development

# Google OAuth (Google Cloud Console에서 발급)
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

---

## 개발 환경 배포

### 사전 준비

#### 1. EAS CLI 설치
```bash
npm install -g eas-cli
```

#### 2. Expo 계정 로그인
```bash
eas login
```

#### 3. 프로젝트 초기화 (최초 1회)
```bash
eas init
```

#### 4. 환경 변수 설정
`.env.dev` 파일을 수정하여 개발 서버 정보 입력:

```env
# Backend API (개발 서버 주소)
EXPO_PUBLIC_API_BASE_URL=https://dev-api.runtaeho.com/api/v1

# Google OAuth (개발 환경용 Client ID)
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_DEV_IOS_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID=YOUR_DEV_SERVER_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_DEV_ANDROID_CLIENT_ID.apps.googleusercontent.com
```

### 빌드 실행

#### iOS 개발 빌드
```bash
npm run build:dev:ios
```

또는

```bash
cp .env.dev .env && eas build --profile preview --platform ios
```

#### Android 개발 빌드
```bash
npm run build:dev:android
```

또는

```bash
cp .env.dev .env && eas build --profile preview --platform android
```

### 빌드 상태 확인

```bash
eas build:list
```

### 빌드 다운로드 및 설치

1. **iOS**: TestFlight를 통한 배포
   - EAS에서 빌드 완료 후 자동으로 TestFlight에 업로드
   - TestFlight 앱에서 설치

2. **Android**: APK 직접 다운로드
   - EAS 대시보드에서 APK 다운로드
   - 디바이스에 설치

---

## 운영 환경 배포

### 사전 준비

#### 1. Apple App Store 준비 (iOS)
- Apple Developer Program 가입
- App Store Connect에서 앱 등록
- Bundle ID: `com.hongtaeho.app`
- Provisioning Profile 및 Certificate 설정

#### 2. Google Play Console 준비 (Android)
- Google Play Console 계정 생성
- 앱 등록
- Package Name: `com.hongtaeho.app`
- Service Account Key 발급 (API Access)

#### 3. 환경 변수 설정
`.env.prod` 파일을 수정하여 운영 서버 정보 입력:

```env
# Backend API (운영 서버 주소)
EXPO_PUBLIC_API_BASE_URL=https://api.runtaeho.com/api/v1

# Google OAuth (운영 환경용 Client ID)
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_PROD_IOS_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID=YOUR_PROD_SERVER_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_PROD_ANDROID_CLIENT_ID.apps.googleusercontent.com

# Debug/Logging 비활성화
EXPO_PUBLIC_ENABLE_DEBUG=false
EXPO_PUBLIC_ENABLE_LOGGING=false
```

### 빌드 실행

#### iOS 운영 빌드
```bash
npm run build:prod:ios
```

#### Android 운영 빌드
```bash
npm run build:prod:android
```

### 스토어 제출

#### iOS (App Store)
```bash
npm run submit:ios
```

또는

```bash
eas submit --platform ios
```

**필요 정보**:
- Apple ID
- App Store Connect App ID
- Apple Team ID: `Y9XN2ZQ9G3`

#### Android (Google Play)
```bash
npm run submit:android
```

또는

```bash
eas submit --platform android
```

**필요 정보**:
- Google Service Account Key JSON 파일
- Track 선택 (internal/alpha/beta/production)

---

## 로컬 개발 환경

### 개발 서버 실행

#### 로컬 환경으로 실행
```bash
npm run start:local
# 또는
npm start  # 기본값은 로컬 환경
```

#### 개발 서버 환경으로 실행
```bash
npm run start:dev
```

#### iOS 시뮬레이터
```bash
npm run ios:local     # 로컬 환경
npm run ios:dev       # 개발 서버 환경
```

#### Android 에뮬레이터
```bash
npm run android:local # 로컬 환경
npm run android:dev   # 개발 서버 환경
```

---

## 배포 체크리스트

### 개발 환경 배포 전

- [ ] `.env.dev` 파일에 개발 서버 주소 설정
- [ ] Google OAuth 개발 환경용 Client ID 설정
- [ ] Apple Sign In 개발 환경 설정 (필요시)
- [ ] 백엔드 개발 서버 정상 동작 확인
- [ ] `eas.json`의 `preview` 프로필 확인

### 운영 환경 배포 전

- [ ] `.env.prod` 파일에 운영 서버 주소 설정
- [ ] Google OAuth 운영 환경용 Client ID 설정
- [ ] Apple Sign In 운영 환경 설정
- [ ] 백엔드 운영 서버 정상 동작 확인
- [ ] Debug/Logging 비활성화 확인
- [ ] 버전 번호 업데이트 (`app.config.js`)
- [ ] App Store Connect / Google Play Console 앱 등록
- [ ] Provisioning Profile 및 Certificate 설정 (iOS)
- [ ] Service Account Key 설정 (Android)
- [ ] `eas.json`의 `production` 프로필 확인

---

## Google OAuth 설정

### 환경별 OAuth 앱 생성

각 환경마다 별도의 Google OAuth 앱을 생성하는 것을 권장합니다:

1. **Google Cloud Console** 접속 (https://console.cloud.google.com)
2. **프로젝트 생성** (환경별로 생성 권장)
   - 예: `RunTaeho-Dev`, `RunTaeho-Prod`
3. **OAuth 동의 화면 구성**
   - 앱 이름, 이메일, 로고 등 설정
4. **OAuth 2.0 클라이언트 ID 생성**
   - **iOS**: iOS 애플리케이션
     - Bundle ID 입력 (개발: `com.hongtaeho.app.development`, 운영: `com.hongtaeho.app`)
   - **Android**: Android 애플리케이션
     - Package Name 입력
     - SHA-1 인증서 지문 등록
   - **Web**: 웹 애플리케이션 (서버용)

### Bundle Identifier / Package Name

환경별로 다른 Bundle ID/Package Name을 사용합니다:

- **Local/Development**: `com.hongtaeho.app.development`
- **Production**: `com.hongtaeho.app`

이는 `app.config.js`에서 자동으로 설정됩니다.

---

## Apple Sign In 설정

### 1. Apple Developer 설정
- Apple Developer Console에서 Sign In with Apple 활성화
- Bundle ID에 Sign In with Apple Capability 추가
- Service IDs 생성 (환경별)

### 2. 환경별 설정
- 개발: `com.hongtaeho.app.development`
- 운영: `com.hongtaeho.app`

---

## 트러블슈팅

### 빌드 실패

#### 1. 환경 변수가 로드되지 않음
```bash
# .env 파일 확인
cat .env

# 캐시 클리어 후 재시도
npm run start -- --clear
```

#### 2. EAS Build 실패
```bash
# EAS 로그 확인
eas build:list
eas build:view [BUILD_ID]

# 로컬에서 설정 확인
npx expo config --type public
```

#### 3. Google OAuth 오류
- Google Cloud Console에서 Client ID 확인
- Bundle ID / Package Name 일치 여부 확인
- OAuth 동의 화면 승인 상태 확인

#### 4. Apple Sign In 오류
- Bundle ID가 Apple Developer에 등록되어 있는지 확인
- Sign In with Apple Capability가 활성화되어 있는지 확인
- Provisioning Profile 재생성

### 런타임 오류

#### 1. API 연결 실패
```bash
# 환경 변수 확인
console.log(process.env.EXPO_PUBLIC_API_BASE_URL);

# 백엔드 서버 상태 확인
curl https://dev-api.runtaeho.com/api/v1/health
```

#### 2. 로그 확인
```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

---

## 환경별 URL 관리

### Backend API URLs

| 환경 | URL | 비고 |
|------|-----|------|
| Local | `http://localhost:8080/api/v1` | 로컬 개발 |
| Development | `https://dev-api.runtaeho.com/api/v1` | 개발 서버 (예시) |
| Production | `https://api.runtaeho.com/api/v1` | 운영 서버 (예시) |

**참고**: 실제 배포 시 위 URL을 실제 서버 주소로 변경해야 합니다.

---

## 추가 참고 자료

- [Expo EAS Build 공식 문서](https://docs.expo.dev/build/introduction/)
- [Expo EAS Submit 공식 문서](https://docs.expo.dev/submit/introduction/)
- [Google OAuth 설정 가이드](https://docs.expo.dev/guides/google-authentication/)
- [Apple Sign In 설정 가이드](https://docs.expo.dev/guides/apple-authentication/)

---

## 버전 관리

### 버전 업데이트

`app.config.js`에서 버전 수정:

```javascript
version: "1.0.1"  // 메이저.마이너.패치
```

### 빌드 번호

EAS는 자동으로 빌드 번호를 관리합니다 (`appVersionSource: "remote"`).

---

## 보안 주의사항

⚠️ **절대 버전 관리 시스템에 포함하지 말 것**:
- `.env.local`, `.env.dev`, `.env.prod`
- Google Service Account Key JSON
- Apple Certificates (.p8, .p12, .mobileprovision)
- Keystore 파일 (.keystore, .jks)

✅ **버전 관리 시스템에 포함할 것**:
- `.env.example` (템플릿)
- `eas.json` (빌드 설정)
- `app.config.js` (앱 설정)
- `DEPLOYMENT.md` (이 문서)

---

## 지원

배포 관련 문의사항이 있으시면 팀에 문의해주세요.
