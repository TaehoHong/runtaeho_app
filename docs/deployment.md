# 배포 가이드

## 앱 프로파일

실행 프로파일은 세 개지만 앱 식별자와 Google OAuth는 **로컬·개발 공용 / 운영** 두 묶음이다.

| 프로파일 | 대상 | 앱 ID | 빌드 | OTA 채널 |
|---|---|---|---|---|
| `local` | iOS 시뮬레이터·Android 에뮬레이터 | `com.runtaeho.runtaeho.dev` | Debug + Metro | 사용 안 함 |
| `development` | 테스터 | `com.runtaeho.runtaeho.dev` | Release, 독립 실행 | `staging` |
| `production` | 운영 사용자 | `com.runtaeho.runtaeho` | Release, 독립 실행 | `production` |

`Release`는 최적화된 빌드 방식이며 운영 서버를 의미하지 않는다.
프로파일의 공개 식별자는 `scripts/app-profiles.json`이 관리한다. Android flavor가 이 파일을
읽고, iOS의 `Local / Development / Production` Scheme은 각각 `Debug / Development / Release`
Configuration을 사용한다. 기존 `app` Scheme도 운영 Release용으로 유지한다.
iOS Bundle ID·Google Client ID·URL scheme은 대응하는 Xcode Build Settings와 함께 맞춘다.

```bash
npm run signing:dev:android   # 최초 1회, 이후 실행 시 기존 키 재사용·SHA-1 확인
npm start                    # local Metro, 별도 터미널에서 유지
npm run ios                  # iOS 시뮬레이터를 켜고 실행
npm run android              # Android 에뮬레이터를 켜고 실행
npm run build:dev:ios         # 개발 IPA 빌드만
npm run build:dev:android     # 개발 APK 빌드만
```

로컬과 개발 Android는 같은 전용 개발 서명키를 사용한다. 키와 비밀번호는 앱 저장소 밖의
`../credentials/android-development.jks`, `../credentials/android-development.properties`에만 둔다.
두 파일은 함께 안전하게 백업하며, 기존 키를 임의로 새로 만들지 않는다. 운영 업로드 키와는 별개다.
다른 개발 컴퓨터에서는 두 파일을 복원해 같은 키를 사용한다. 컴퓨터마다 새 키를 생성하지 않는다.
`cd android && ./gradlew :app:verifyDevelopmentSigning`으로 실제 로컬·테스터 variant의 키가
같은지 검사할 수 있으며, 두 variant의 빌드 전에도 자동 검사한다.
Google Cloud의 개발 Android OAuth에는 이 키의 SHA-1 하나를 등록한다. iOS도 `.dev`용
클라이언트 하나를 로컬·개발이 공유하며 Backend용 Web Client ID는 기존 값을 유지한다.

`scripts/app-profile.cjs`는 로컬·개발에서 기존 `.env.development`, 운영에서 `.env.production`을
읽는다. 개발 Release의 `NODE_ENV=production`과 서버 환경 선택을 구분한다. 현재 두 파일의
API 주소는 같은 공유 서버이며 서버 분리 시 개발 주소만 바꾼다. 스크립트는 환경 파일을 수정하지 않는다.
OTA의 EAS 원격 변수 환경은 기존대로 `staging → preview`, `production → production`을 사용한다.

개발 산출물은 `build/development/`에 저장되며 `--profile development`로 배포한다.
개발 빌드도 기본적으로 커밋 상태를 확인한다. 작업 중인 변경을 포함하려면
`npm run build:dev:android -- --allow-dirty`처럼 명시한다.
Android APK는 Firebase App Distribution, iOS IPA는 fastlane을 통해 TestFlight로 배포한다.
Apple Developer에 `.dev` App ID와 필요한
권한을 등록하고 App Store Connect 개발 앱을 먼저 만들어야 한다. 현재 폰 배포에는 Watch 앱을
포함하지 않는다. 독립 Watch 프로젝트의 앱 ID는 개발 `.dev.watchkitapp`, 운영 `.watchkitapp`이다.
Apple 로그인은 공유 백엔드의
개발 client ID 처리도 별도로 확인한다. iOS Configuration 추가 후 `cd ios && pod install`이 필요하다.

### 이 Mac에서 명령 하나로 빌드·배포

GitHub Actions 없이 이 Mac에서 린트·배포 회귀 테스트 → 사전 검사 → 빌드번호 증가 →
Xcode/Gradle 빌드·서명 → 업로드를 순서대로 실행한다. 개발·운영 서버 주소는 기존 설정을 유지한다.

| 대상 | 명령 | 도착 지점 |
|---|---|---|
| AOS 개발 | `npm run deploy:dev:android` | Firebase의 지정 테스터 그룹 |
| iOS 개발 | `npm run deploy:dev:ios` | `.dev` 앱의 지정 TestFlight 내부 그룹 |
| 개발 양쪽 | `npm run deploy:dev` | 위 두 경로 |
| AOS 운영 | `npm run deploy:prod:android` | Play 운영 트랙 (기존 `production / completed`) |
| iOS 운영 | `npm run deploy:prod:ios` | App Store Connect 업로드와 심사 제출, 승인 후 수동 출시 |
| 운영 양쪽 | `npm run deploy:prod` | 위 두 경로 |

`-- --version 1.9.0`, `-- --preflight-only`, `-- --resume` 옵션도 전달할 수 있다.
`build:dev:*`, `build:prod:*`는 기존처럼 빌드만 수행한다. 이 명령은 현재 휴대폰 앱을 대상으로
하며, watchOS·Wear OS 독립 앱 배포는 포함하지 않는다. 폰 타깃의 Watch 빌드 의존성과
`Embed Watch Content` 단계도 제거되어 기본 iOS IPA에는 Watch 앱이 들어가지 않는다.

**최초 1회 설정**

1. 배포 전용 Firebase 프로젝트 `run-taeho-distribution`의 Android 앱
   `com.runtaeho.runtaeho.dev`와 `dev-testers` 그룹을 사용한다. Google 로그인·서버의 기존
   `run-taeho` 프로젝트와 분리한다. 테스터는 이 배포 프로젝트의 그룹에 별도로 초대한다.
   App Distribution 자체에는 SDK가 필요 없지만, 현재 푸시 알림은 FCM을 사용하므로 아래 Android 초기화 설정이 별도로 필요하다.
2. 공식 Firebase CLI를 설치(`npm install -g firebase-tools`)하고 `firebase login`한다.
   또는 기존 권한을 부여한 서비스 계정 JSON 경로를 `GOOGLE_APPLICATION_CREDENTIALS`로 지정한다.
3. App Store Connect에 `.dev` 앱과 TestFlight **내부** 그룹을 만들고 테스터를 지정한다.
   Apple Developer의 휴대폰 App ID/권한과 이 Mac의 배포 인증서·프로비저닝도 준비한다.
   휴대폰의 네이티브 엔타이틀먼트에 HealthKit을 선언하므로 App ID와 App Store 배포
   프로파일에도 HealthKit이 포함되어야 한다.
4. 기존 fastlane과 App Store Connect API key JSON을 사용한다. 개발 그룹 배포에는 App Manager
   또는 Admin 권한이 필요하다. Android 운영은 EAS Submit의 Play 제출 자격증명을 사용한다.
5. 아래 템플릿을 복사하고 값·경로를 로컬 파일에 채운다. 토큰·개인 키는 Git에 저장하지 않는다.

```bash
mkdir -p ../credentials
chmod 700 ../credentials
cp scripts/deployment-config.example.sh ../credentials/deployment.sh
chmod 600 ../credentials/deployment.sh
```

모든 배포 명령이 `../credentials/deployment.sh`를 자동으로 읽는다. 이 Mac의 공통 위치는
`/Users/hongtaeho/running/credentials`이며, Android 개발·운영 키, Apple API 키 JSON·p8,
배포 인증서·프로파일과 로컬 배포 설정을 함께 보관한다. 키 내용은 문서·Git에 넣지 않고
파일 권한은 600, 폴더 권한은 700으로 유지한다. 백업·복원 시 같은 위치와 기존 키를 유지한다.
iOS 두 앱은 `ios-production-signing.p12`와 `ios-production-signing.json`의
`certificatePassword`를 공유한다. App Store 프로파일은 운영
`ios-production-phone.mobileprovision`, 개발 `ios-development-phone.mobileprovision`으로 구분한다.
TestFlight용 개발 앱도 App Store 배포 프로파일이 필요하며, `.dev` 앱 ID와 HealthKit·Apple 로그인·푸시
권한이 일치해야 한다. `scripts/sign-ios.py`가 빌드번호 증가 전에 인증서·개인 키·프로파일을 검사한다.
아카이브는 자동 서명 없이 만들고, 임시 키체인에서 서명·내보내기·IPA 검증을 수행한다.
기존 키체인 검색 목록은 성공·실패 시 모두 복원하고 임시 키체인을 삭제한다. Xcode에 필요한
프로파일도 이미 설치된 파일은 보존하고 이번 내보내기에서 추가한 파일만 정리한다.
이 과정은 이전 IPA나 `/private/tmp` 보조 스크립트에 의존하지 않는다.
Firebase App ID는
Google OAuth Client ID와 다르며, 기존 로컬·개발 공용 OAuth와 서명키는 유지한다.

Android 푸시는 `android/app/build.gradle`의 Google Services 플러그인과 앱 package에 맞는
`google-services.json`을 함께 사용한다. `android/app/google-services.json`의 client 배열에
로컬·개발(`com.runtaeho.runtaeho.dev`)과 운영(`com.runtaeho.runtaeho`)의 실제 등록 항목을 함께 둔다.
Google Services 플러그인이 variant의 applicationId와 일치하는 client를 선택하며,
`app.config.js`도 이 단일 설정 파일을 사용한다.
이 파일은 기존 Git ignore 정책에 따라 로컬에서 관리한다. Firebase 콘솔 또는
`firebase apps:sdkconfig ANDROID <Firebase App ID> --project <project ID> --out <위 경로>`로
두 앱이 등록된 프로젝트의 실제 설정을 받는다. 다른 package의 설정을 복사하거나 식별자를 임의로 바꾸지 않는다.
`android/`에서 `./gradlew :app:processLocalDebugGoogleServices :app:processLocalDebugResources`로
FCM 초기화 리소스가 생성되는지 확인한다. 네이티브 설정 추가는 새 바이너리가 필요하다.
Release의 `process*Resources`는 JS 번들·Sentry 소스맵 업로드 훅까지 실행할 수 있으므로,
업로드가 필요 없는 검증에서는 `SENTRY_DISABLE_AUTO_UPLOAD=true`를 주입한다.
실제 Expo 푸시 발송에는 해당 FCM 프로젝트의 V1 발송 자격증명도 Expo에 연결되어야 한다.

운영 업로드 키의 절대 경로와 비밀번호는 로컬 배포 설정의 `ORG_GRADLE_PROJECT_RUNTAEHO_UPLOAD_*`
환경변수로 주입한다. 기존 `~/.gradle/gradle.properties` 설정도 계속 사용할 수 있다.
새 `deploy:*` 명령은 기존 프로파일 로더로 환경 파일을 읽으므로 기존 Sentry 토큰도 재사용한다.
배포 프로젝트를 옮길 때는 새 대상에 같은 패키지 앱과 그룹을 등록한 뒤
`FIREBASE_PROJECT_ID`, `FIREBASE_ANDROID_APP_ID`, 필요한 그룹 별칭을 바꾼다.
기존 배포 이력과 테스터 그룹은 자동으로 합쳐지지 않는다.

Play 심사 전에는 광고 ID 선언도 확인한다. 현재 AdMob SDK와 병합된 운영 매니페스트에
`com.google.android.gms.permission.AD_ID`가 포함되므로 광고 ID 사용을 선언한다.
SDK의 사용 목적은 [Google 공식 데이터 공개 안내](https://developers.google.com/admob/android/privacy/play-data-disclosure)의
광고·분석·사기 예방에 맞춘다. 광고 ID 권한 누락 오류를 무시하는 옵션은 사용하지 않는다.

Unity는 기존 export 산출물과 현재 소스가 일치해야 한다. 이 명령은 export를 다시 만들지 않고
검증하며, 오래된 경우 업로드 전에 중단한다. Unity export 갱신과 Xcode 플랫폼 설치는 먼저 완료한다.
Unity receipt는 패키지가 빌드용 임시 파일을 만들기 전에 입력을 캡처하고 정리 후 검증한다.
`Assets/AddressableAssetsData/` 아래의 `addressables_content_state.bin`과 해당 `.meta`는
플랫폼별 생성 결과이므로 입력 해시에서 제외한다. 실제 Addressables 설정·에셋은 계속 검사한다.
macOS의 `Android`/`android`처럼 같은 실제 export 디렉터리인 경우도 허용하며, 다른 디렉터리나
실제 소스 변경은 거부한다. Unity Editor 코드는 `Assets/Editor/VersionSync/VersionSyncEditor.cs`에 있다.
Unity Xcode 프로젝트에는 `Development` 구성이 없어 이 구성으로 앱을 아카이브할 때 Unity는
`Release`로 빌드된다. 앱의 Development 설정은 해당 Release 산출물 경로도 검색해야 한다.
링크·포함 단계는 Unity 프로젝트의 실제 제품 참조와 명시적인 타깃 의존성을 사용한다.
폰의 Development 폴더에 있는 일반 파일로 참조하면 컴파일 또는 포함 단계가 실패한다.
이 연결은 배포 회귀 테스트와 실제 Xcode 아카이브로 검증한다.
광고 SDK 설정 단계는 `TARGET_BUILD_DIR/INFOPLIST_PATH`를 입력과 수정 대상으로 사용한다.
아카이브에서는 일반 빌드 제품 폴더와 앱 설치 폴더가 다르므로 이 의존성을 선언해야 한다.
`ios/Podfile`의 `post_integrate`가 `pod install` 후에도 해당 설정을 유지한다.
현재 운영 광고는 `app.json`의 `ads.enabled: false`로 비활성화되어 있다. 이 상태에서는
`user_tracking_usage_description`을 넣지 않는다. 이 값은 SDK 빌드 단계에서 실제 IPA의
`NSUserTrackingUsageDescription`으로 주입되어 추적하지 않는 개인정보 신고와 충돌한다.
광고·추적을 활성화할 때 실제 데이터 사용과 동의 흐름, App Store 개인정보 신고를 함께 검토한다.
추후 Watch를 다시 포함하면 폰의 처리된 Info.plist가 Watch 메타데이터에 의존한다.
이 경우 Watch 포함 단계를 그 plist를 읽는 광고 설정 단계보다 앞에 둔다.
반대 순서는 Xcode 아카이브 의존성 순환을 만든다.
실제 스토어 검토·약관·개인정보·수출 규정 답변은 이 명령으로 우회하지 않는다.
스토어 앱 등록·신고 항목·약관 때문에 중단되면 원래 서버 오류와 처리할 콘솔을 표시한다.
스크립트가 이 답변을 자동 변경하지 않으며, 콘솔에서 해결한 뒤 같은 업로드/심사 명령을 재시도한다.

개발 iOS는 앱과 그룹을 사전 조회하고 기존 내부 그룹만 허용한다. 업로드 후 Apple 빌드 처리와
그룹 배포 완료까지 기다린다. 운영 심사 제출도 지정한 버전·빌드 처리 완료를 최대 30분 기다린다.
개발 앱을 운영 심사로 제출하는 요청과 개발 APK를 운영 AAB 경로로 보내는 요청은 거부한다.

배포는 `build/deploy.lock`으로 한 번에 하나만 실행한다. 정상 종료·실패 시 잠금을 해제한다.
강제 종료로 잠금이 남았다면 실행 중인 배포가 없는지 확인한 후 `rmdir build/deploy.lock`으로 제거한다.
업로드 실패 시 버전을 다시 올리지 않고 산출물만 재전송할 수 있다.

```bash
npm run submit:dev:android -- --path /absolute/path/app.apk
npm run submit:dev:ios -- --path /absolute/path/app.ipa
```

Firebase 인증·설정과 Apple 앱·그룹 접근 실패는 빌드번호 증가 전에 중단한다.
서버의 업로드 처리 중 실패했다면 먼저 콘솔에서 접수 여부를 확인한다. 이미 접수된 동일 IPA를
다시 업로드하지 않는다. 운영 iOS의 업로드가 끝났다면 `submit:review:ios`로 심사 제출만 재시도한다.

참고: [Firebase CLI 배포](https://firebase.google.com/docs/app-distribution/android/distribute-cli),
[TestFlight 자동화](https://docs.fastlane.tools/actions/pilot/),
[EAS Submit](https://docs.expo.dev/deploy/submit-to-app-stores/).

### 워치 앱 프로파일

워치도 휴대폰의 공개 프로필과 같은 앱 ID·표시 이름을 사용한다.

| 프로필 | watchOS 스킴 / 구성 | Wear OS 빌드 예시 |
|---|---|---|
| `local` | `WatchLocal` / Debug | `:app:assembleLocalDebug` |
| `development` | `WatchDevelopment` / Development | `:app:assembleDevelopmentRelease` |
| `production` | `WatchProduction` / Release | `:app:bundleProductionRelease` |

Wear OS의 `local`·`development`는 휴대폰과 동일한 개발 서명 설정 파일을 읽는다.
운영에서는 휴대폰과 같은 서명 설정을 사용하며, Play 배포 시에는 설치된 양쪽 앱의
앱 서명 인증서가 일치해야 한다. 업로드 인증서만으로 설치 인증서의 일치를 판단하지 않는다.
개발 앱과 운영 앱은 앱 ID가 달라 기록·설정 저장공간이 분리된다.
`local`과 `development`는 같은 개발 앱을 교체 설치하므로 저장공간도 공유한다.

워치는 서버 URL이나 로그인 토큰을 별도로 보관하지 않고 같은 환경의 휴대폰으로
기록을 전달한다. 현재 휴대폰의 개발·운영 API가 같은 공유 서버를 사용하므로,
앱 프로필 분리는 서버 데이터 분리를 의미하지 않는다.
독립 빌드와 실제 산출물 검증은 [watchOS](../watchos/README.md),
[Wear OS](../wearos/README.md) 안내를 참조한다.

## 0. 왜 로컬 빌드인가

원격 빌드(EAS Build)는 이 저장소에서 동작하지 않는다. Unity 산출물이 저장소에 없고
이 맥의 절대경로로 물려 있기 때문이다.

```
ios/app.xcworkspace/contents.xcworkspacedata
  location = "absolute:/Users/hongtaeho/running/unity/RunTaehoUnity/Builds/iOS/Unity-iPhone.xcodeproj"

android/settings.gradle
  project(':unityLibrary').projectDir =
    new File('/Users/hongtaeho/running/unity/RunTaehoUnity/Builds/Android/unityLibrary')
```

`UnityFramework.framework`는 pbxproj에서 `BUILT_PRODUCTS_DIR` 참조라 워크스페이스에 붙은
위 Unity 프로젝트를 같이 빌드해야만 생긴다. 산출물은 iOS 1.2G / Android 12G라 저장소에
커밋할 수도 없다. 실제로 EAS Build를 시도한 4건은 전부 `no such module 'UnityFramework'`로
실패했다.

그래서 **빌드는 이 맥에서**, iOS 업로드는 API key 기반 `fastlane pilot`, Android 운영 업로드는
`eas submit --path`로 자동화한다.
개발 앱 업로드는 위의 Firebase / fastlane 경로를 사용한다.

## 1. 두 가지 배포 경로

| | 앱푸시 (OTA) | 스토어 배포 |
|---|---|---|
| 나가는 것 | JS 번들, 에셋 | 네이티브 바이너리 전체 |
| 쓰는 때 | 화면/로직/문구 수정 | 네이티브 코드·의존성·권한·아이콘·Unity 변경, 버전 릴리스 |
| 명령 | `npm run deploy:ota -- -m "메시지"` | `npm run deploy:store -- --version 1.9.0` |
| 소요 | 1~2분 | iOS 아카이브 + Android 번들, 수십 분 |
| 반영 | 앱 재실행 시 | 스토어 심사 후 |
| 되돌리기 | `npx eas update:rollback --branch production` | 새 빌드 업로드 |

네이티브가 바뀌었는데 OTA로 내보내면 앱이 깨진다. 판단이 애매하면 스토어 배포로 간다.

## 2. 1회 사전 준비

### 2.1 EAS 로그인

```bash
npx eas login
npx eas whoami
```

### 2.2 Android 업로드 키 서명

`android/app/build.gradle`의 release는 gradle 프로퍼티가 있을 때만 업로드 키로 서명한다.
비밀번호는 저장소에 두지 않고 `~/.gradle/gradle.properties`에 넣는다.

```properties
RUNTAEHO_UPLOAD_STORE_FILE=/Users/hongtaeho/running/credentials/runtaeho_android_key.jks
RUNTAEHO_UPLOAD_STORE_PASSWORD=<키스토어 비밀번호>
RUNTAEHO_UPLOAD_KEY_ALIAS=<별칭>
RUNTAEHO_UPLOAD_KEY_PASSWORD=<키 비밀번호>
```

Play에 올라간 기존 AAB는 `CN=TAEHO HONG, O=RT262` 인증서로 서명돼 있다. 같은 키스토어여야
업데이트로 인정된다. CI에서 쓸 때는 `ORG_GRADLE_PROJECT_RUNTAEHO_UPLOAD_STORE_FILE` 형태의
환경변수로도 주입할 수 있다.

설정이 없으면 release 빌드는 debug 키로 떨어진다. `deploy-store.sh`는 이 경우 빌드 전에
중단하고, 혹시 통과하더라도 AAB 서명자를 검사해 debug 키면 업로드하지 않는다.

### 2.3 App Store Connect API Key 등록

`../credentials/deployment.sh`의 `ASC_API_KEY_PATH`를 fastlane 형식 API key JSON으로 지정한다.
개발·운영 iOS 모두 이 키로 `fastlane pilot`을 실행한다. 운영은 업로드만 하고, 개발은 지정한
TestFlight 내부 그룹 배포까지 기다린다. 운영 심사는 `submit-review.sh`가 정확한 버전·빌드를
선택한다. 별도의 EAS Apple 자격증명 등록이나 브라우저 로그인은 필요하지 않다.
App Store Connect의 앱·내부 그룹 최초 등록과 계정 약관 처리는 콘솔에서 먼저 완료해야 한다.

### 2.4 Google Play 서비스 계정 키 등록

```bash
npx eas credentials --platform android
```

Google Play Console에서 만든 서비스 계정 JSON을 등록한다. `eas.json`의
`submit.production.android`는 `production` 트랙에 `completed`로 올린다. 관리형 게시가
꺼져 있으면 심사 승인 후 자동 공개된다. 심사만 제출하고 공개를 수동으로 하려는 릴리스는
업로드 전에 Play Console의 관리형 게시를 켜고, 승인 후 직접 게시한다.
한 번만 공개를 보류하는 경우 해당 릴리스를 직접 게시한 뒤 관리형 게시를 꺼서 기존 자동 공개
방식으로 복원한다. 승인된 변경사항이 남아 있는 동안에는 관리형 게시를 끄지 않는다.

단계적 출시로 바꾸려면 `releaseStatus`를 `"inProgress"`로 두고 `rollout`에 비율을 준다.
내부 테스트만 하려면 `track: "internal"`, `releaseStatus: "draft"`로 되돌린다.

### 2.5 Sentry 빌드 인증

`ios/sentry.properties`, `android/sentry.properties`에는 토큰을 두지 않는다. 빌드 전에
`SENTRY_AUTH_TOKEN`을 셸 환경변수로 주입한다. 과거 Git에 들어간 토큰은 별도로 폐기하고
교체해야 한다. 파일에서 제거해도 Git 이력이나 원격 서비스의 토큰이 폐기되지는 않는다.

## 3. 앱푸시 (OTA)

```bash
npm run deploy:ota -- -m "러닝 상세 화면 문구 수정" -p android
npm run deploy:ota -- -m "러닝 상세 화면 문구 수정" -p ios
npm run deploy:ota -- -m "스테이징 확인" -b staging -p android
```

현재 구성에서 `-p all`은 웹 정적 내보내기도 실행하며, 네이티브 전용 광고 모듈에서
실패한다. 모바일 양쪽을 발행할 때는 `-p android`와 `-p ios`를 각각 실행한다.

절차는 이렇게 돈다.

1. 선택한 플랫폼의 로컬 네이티브 런타임과 OTA 런타임 정합 확인
2. 커밋되지 않은 변경 확인
3. `eas env:exec`로 원격 환경변수를 읽고 필수 설정 검증 (로컬 `.env`/셸 값으로 누락을 보충하지 않음)
4. `eas update --branch <브랜치> --environment <환경> --platform <플랫폼>`

`update:prod`, `update:staging`, `release:ota`도 이 경로를 사용한다. OTA 명령은 앱 버전을
자동 변경하지 않는다. `--dry-run`은 네트워크 없이 로컬 검사와 실행 계획만 표시한다.
런타임 검사는 로컬 소스 기준이므로 실제 설치된 스토어 바이너리의 값도 확인해야 한다.
네이티브/Unity 코드를 변경한 경우, 값이 같다는 이유만으로 OTA로 배포하지 않는다.

브랜치는 `production` → 환경 `production`, `staging` → 환경 `preview`로 매핑된다.

## 4. 스토어 배포

```bash
# 버전 올려서 양쪽 다
npm run deploy:store -- --version 1.9.0

# 한쪽만
npm run deploy:store -- --platform ios

# 빌드만 하고 업로드는 나중에
npm run deploy:store -- --platform android --no-submit
```

절차는 이렇게 돈다.

1. 프리플라이트 — 소스 상태, 필수 환경변수, Sentry 인증, **Unity export 소스 해시**, Android 서명 설정, iOS 프로파일·배포 개인 키. iOS는 API key와 앱/그룹 접근, Android 운영은 EAS 로그인을 확인
2. 버전 반영 — `--version` 적용, `runtimeVersion` 동기화, 빌드번호/versionCode 증가, 재시도용 소스 상태 기록
3. iOS — 서명 없는 `xcodebuild archive` (Unity 프로젝트 포함) → `sign-ios.py`의 임시 키체인 서명·`-exportArchive`·IPA 검증
4. Android — `./gradlew :app:bundleProductionRelease` → AAB 서명자 검사
5. 업로드 — iOS는 `fastlane pilot`, Android 운영은 `eas submit`, Android 개발은 Firebase CLI로 제출
6. 산출물은 `build/release/` 아래에 버전·빌드번호가 붙은 이름으로 남는다

업로드 후 남는 수동 단계:

- **iOS**: 운영 `pilot`은 업로드까지만 한다. `--submit-review`를 붙이면 업로드 뒤
  정확한 버전/빌드를 fastlane으로 심사 제출한다. 승인 후 출시는 수동이다.
- **Android**: 현재 `eas.json`은 `production/completed`이다. 실제 공개 시점은 Play 심사와
  관리형 게시 설정에 따른다. 스크립트는 실제 설정을 읽어 표시한다.

### Unity export 검증

Unity Editor는 `ProjectVersion.txt`에 지정된 **6000.0.60f1**을 사용한다. 기존 수동 export
절차와 필요한 네이티브 보정을 유지한다. `expo prebuild --clean`과 EAS Build는 사용하지 않는다.

`Assets/Editor/VersionSync/VersionSyncEditor.cs`가 앱 버전을 읽고, export 전후의
`Assets`, `Packages`, `ProjectSettings` SHA-256을 비교한다. 정상 export 후 출력 폴더에
`.runtaeho-export.json`을 기록한다. export 시작 때 이전 기록을 지워 실패한 결과를 재사용하지 않는다.
배포는 이 기록과 현재 입력을 비교한다. `.DS_Store`와 위에서 설명한 Addressables 생성 상태 파일은 제외한다.

**기록이 없거나 현재 소스와 다를 때만 해당 플랫폼을 다시 export한다.**
Android는 Gradle 프로젝트 export를 사용한다. 기록을 수동으로 만들거나 복사하지 않는다.
이 검증은 소스/export의 대응 확인이며, export 후 수동으로 수정한 네이티브 파일의 정합성이나
실기기 동작까지 보장하지 않는다. Unity 프로젝트는 앱 Git 저장소 밖에 있으므로 함께 보관해야 한다.

### 실패 후 재시도

```bash
# 빌드 중 실패: 최초 실행과 같은 플랫폼, 버전 증가 없이 재시도
npm run deploy:store -- --platform ios --resume

# 업로드 실패: 성공한 산출물만 다시 전송 (빌드/버전 변경 없음)
npm run submit:ios -- --path /absolute/path/app.ipa
npm run submit:android -- --path /absolute/path/app.aab

# 업로드는 성공했고 심사 제출만 다시 해야 할 때
npm run submit:review:ios -- 1.9.0 4
```

`--resume`은 `build/release/pending.json`에 기록한 소스·커밋·플랫폼이 같을 때만 허용한다.
소스를 수정하거나 커밋했다면 새 배포로 준비한다. 이미 업로드된 빌드는 재업로드하지 말고
필요한 플랫폼의 업로드/심사 명령만 실행한다.

### iOS 심사 자동화 사전 설정

이미 설치된 fastlane을 사용한다. `ASC_API_KEY_PATH`에는 저장소 외부의 fastlane 형식
App Store Connect API key JSON 경로를 지정한다 (`key_id`, `issuer_id`, `key`).
iOS 업로드와 심사 제출이 같은 API key JSON을 공유한다.

```bash
npm run deploy:store -- --version 1.9.0 --submit-review
```

기본적으로 기존 스토어 설명·스크린샷·개인정보/수출 규정 답변을 사용한다.
새 버전의 변경사항은 `ASC_METADATA_PATH`로 fastlane 메타데이터 폴더를 지정해 전달할 수 있다
(예: `ko/release_notes.txt`). 설명·규정 답변을 임의로 만들어 넣지 않는다.
필수 메타데이터나 계약, 권한이 빠졌거나 빌드 처리가 30분 안에 끝나지 않으면 실패한다.
해결 후 `submit:review:ios`만 재실행한다. 심사 승인 자체는 자동화할 수 없다.

## 5. 버전 규칙

`expo prebuild`를 쓰지 않으므로 `app.config.js`의 version/bundleId는 네이티브에 반영되지
않는다. `scripts/version.js`가 휴대폰의 네이티브 설정과
`watchos/RunTaehoWatch.xcodeproj`의 버전을 함께 다룬다. iPhone 앱에 포함되는
Apple Watch 앱의 표시 버전과 빌드번호는 iPhone과 일치시킨다.

```bash
npm run version:status                 # 휴대폰·Apple Watch 버전과 런타임 정합 여부
npm run version:sync-runtime           # runtimeVersion을 현재 앱 버전에 맞춤
npm run version:bump-build             # iOS 빌드번호 / Android versionCode 증가
npm run version:bump-build -- android  # 한쪽만 (all | ios | android)
```

| 값 | 의미 | 언제 올리나 |
|---|---|---|
| `version` | 스토어 표시 버전 | **새 스토어 릴리스마다 minor 증가·patch는 0** (`1.8.x → 1.9.0`) |
| `runtimeVersion` | 네이티브 호환 경계 | **스토어 배포에서 새 `version`과 동일하게 동기화**, OTA에서는 유지 |
| iOS `CURRENT_PROJECT_VERSION` | 빌드번호 | 업로드마다 (단조 증가) |
| Android `versionCode` | 빌드번호 | 업로드마다 (단조 증가) |

스토어 릴리스는 `npm run deploy:prod -- --version 1.9.0`처럼 새 minor 버전을 명시한다.
`version:minor`만으로 네이티브 설정은 동기화되지 않으므로, 스토어 빌드는 `scripts/version.js`를 호출하는
배포 명령으로 네이티브 버전과 런타임까지 함께 맞춘다. 같은 릴리스의 실패 재시도는 minor를
다시 올리지 않고 위의 `--resume` 또는 산출물 재전송 절차를 따른다.

minor 증가는 이 프로젝트의 릴리스 규칙이다. EAS Update의 호환 조건은 설치된 네이티브
빌드와 OTA의 플랫폼·`runtimeVersion`이 일치하는 것이다. OTA 직전에 런타임을 올리면
기존 설치 앱이 받지 못하므로 `deploy-ota.sh`가 먼저 검사한다.
참고: [Expo 런타임 버전](https://docs.expo.dev/eas-update/runtime-versions/).

Wear OS는 `wearos/`에서 별도로 빌드하며, `wearos/app/build.gradle`의
`versionCode`와 `versionName`을 관리한다. 휴대폰 Android 배포 명령은 Wear OS
산출물을 업로드하지 않는다. 서명키와 단독 빌드 절차는
[Wear OS 안내](../wearos/README.md), Apple Watch 개발 빌드는
[watchOS 안내](../watchos/README.md)를 참조한다.

## 6. 현재 알려진 문제

- **기존 설치 앱의 런타임**: 로컬 설정을 바꿔도 이미 설치된 바이너리의 런타임은 바뀌지 않는다.
  예를 들어 `1.8.0` 런타임의 앱은 `1.9.0` OTA를 받지 못한다. 배포 대상 바이너리의 실제 값을
  확인하며, 네이티브 변경을 OTA로 보내기 위해 런타임을 임의로 되돌리지 않는다.
- **iOS 빌드번호**: App Store Connect에 같은 버전
  트레인으로 이미 올라간 빌드번호보다 커야 하므로, 실행 전에 ASC에서 마지막 빌드번호를
  확인하고 필요하면 `node scripts/version.js bump-build`를 여러 번 돌리거나 pbxproj를 직접 맞춘다.
- **명령 별칭**: `build:prod:*`는 운영 스토어 빌드(`--no-submit`), `build:dev:*`는 테스터용
  Release 빌드다. 로컬 실행은 `ios`, `android`, `build:local:*`을 사용한다. `submit:ios/android`는 `--path`가 필수다. 산출물을 지정하지 않던
  `submit:all` 별칭은 제거했다. 플랫폼별로 정확한 산출물을 지정한다.
- **`aps-environment`**: 소스는 `development`이며, `scripts/sign-ios.py`가 App Store 프로파일의
  `production` 권한으로 내보낸다. 소스 문자열만으로 배포 푸시 환경을 판단하지 않고 최종 IPA의
  서명 권한과 embedded profile이 일치하는지 확인한다.

## 7. 트러블슈팅

| 증상 | 원인 / 조치 |
|---|---|
| 푸시 켜기에서 설정 PUT이 보이지 않음 | OS 권한 요청과 토큰 발급을 구분한다. 설정 저장은 토큰 발급·기기 등록을 기다리지 않아야 한다. Android는 Google Services 설정 및 생성 리소스를 확인한다. |
| 토큰 발급·기기 등록이 반복되거나 logout이 토큰을 기다림 | token listener에서 받은 native token을 재사용하고, 네이티브/Expo 토큰 준비를 binding PUT·해제의 직렬화 큐에 넣지 않는다. 회귀 테스트는 코드 가이드의 알림 등록 수명 항목을 따른다. |
| `Unity iOS 프로젝트가 없다` | Unity에서 iOS export를 다시 한다 |
| `업로드 키 서명 설정이 없다` | 2.2의 gradle 프로퍼티 4개를 넣는다 |
| `AAB가 debug 키로 서명됐다` | 프로퍼티 이름 오타 또는 `~/.gradle/gradle.properties` 위치 확인 |
| `The sandbox is not in sync with the Podfile.lock` | `npm run deploy:store -- --pods` |
| OTA를 퍼블리시했는데 반영이 안 됨 | `npm run version:status`로 런타임 정합 확인 |
| iOS 서명 파일 누락·만료·앱 ID 불일치 | 공통 credentials의 해당 앱 프로파일·배포 p12를 확인한다 |
| iOS 앱·내부 그룹 또는 심사 서버 오류 | 표시된 Apple 원본 오류와 App Store Connect 항목을 처리한 뒤 재시도한다 |
| Android `eas submit`이 자격증명을 물어봄 | 2.4의 Play 제출 자격증명을 등록한다 |

## 환경과 검증

백엔드는 현재 개발/운영이 공유 서버를 사용한다. 지금 서버를 분리할 필요는 없다.
운영 빌드는 `.env.production`, 개발 빌드는 `.env.development`와 셸 환경, OTA는 EAS 환경을 읽으므로 아래 필수 공개 값을
양쪽에 맞춘다. 파일/원격 설정을 자동 수정하지는 않는다.

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_S3_BUCKET_URL`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID`

앱 모드는 스토어/production OTA가 `production`, staging OTA가 `development`로 지정된다.
API/S3는 배포 가능한 HTTPS 주소여야 한다. 현재 비어 있는 EAS preview 환경은 값을
등록하기 전까지 staging OTA가 중단된다.
Release 앱의 API 요청/응답 콘솔 로깅은 환경변수와 무관하게 비활성화한다. 개발 중에도
요청 헤더·본문·쿼리·URL 식별자·응답 본문은 기록하지 않는다. API 오류는 상태와 메서드만
Sentry에 전달하고, 원본 오류는 호출자에게 유지한다.

```bash
npm run test:deploy
npm run test:unit -- --runTestsByPath src/services/api/__tests__/config.test.ts src/services/api/__tests__/interceptors.test.ts
npm run deploy:ota -- -p ios -m "검증" --dry-run
npm run deploy:store -- --preflight-only --no-submit
```

배포 테스트는 임시 저장소에서 버전 불변성, 재시도 제한, Unity 입력 변경, 환경 누락,
서명 실패, 심사 대상 지정, 셸 인용을 검증한다. EAS/스토어 제출은 대역으로 대체하므로
실제 계정 권한, 심사 메타데이터, Unity export 후 앱 빌드/실기기 검증은 별도로 필요하다.
