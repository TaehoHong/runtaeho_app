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

로컬과 개발 Android는 같은 전용 개발 서명키를 사용한다. 키와 비밀번호는 Git에서 제외된
`credentials/android-development.jks`, `credentials/android-development.properties`에만 둔다.
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

개발 산출물은 `build/development/`에 저장되며 운영 제출 스크립트로 업로드하지 않는다.
개발 빌드도 기본적으로 커밋 상태를 확인한다. 작업 중인 변경을 포함하려면
`npm run build:dev:android -- --allow-dirty`처럼 명시한다.
Android APK는 Firebase App Distribution, iOS IPA는 `.dev` 앱 등록 후 Xcode Organizer의
App Store Connect 업로드와 TestFlight로 배포한다. Apple Developer에 `.dev` App ID와 필요한
권한을 등록하고 App Store Connect 개발 앱을 먼저 만들어야 한다. 포함된 Watch 앱도 개발에서는
`com.runtaeho.runtaeho.dev.watchkitapp`, 운영에서는 기존 `.watchkitapp`을 사용한다.
Apple 로그인은 공유 백엔드의
개발 client ID 처리도 별도로 확인한다. iOS Configuration 추가 후 `cd ios && pod install`이 필요하다.

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

그래서 **빌드는 이 맥에서, 스토어 업로드는 `eas submit --path`로 자동화**한다.

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
RUNTAEHO_UPLOAD_STORE_FILE=/Users/hongtaeho/running/runtaeho_android_key.jks
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

```bash
npx eas credentials --platform ios
```

App Store Connect API Key를 등록해 두면 `eas submit`이 비대화형으로 업로드한다.
`eas.json`의 `submit.production.ios.ascAppId`는 이 앱의 Apple ID(`6755414468`)로 채워져 있다.

### 2.4 Google Play 서비스 계정 키 등록

```bash
npx eas credentials --platform android
```

Google Play Console에서 만든 서비스 계정 JSON을 등록한다. `eas.json`의
`submit.production.android`는 `production` 트랙에 `completed`로 올린다. 즉 Play 검토를
통과하면 전체 사용자에게 바로 배포된다.

단계적 출시로 바꾸려면 `releaseStatus`를 `"inProgress"`로 두고 `rollout`에 비율을 준다.
내부 테스트만 하려면 `track: "internal"`, `releaseStatus: "draft"`로 되돌린다.

### 2.5 Sentry 빌드 인증

`ios/sentry.properties`, `android/sentry.properties`에는 토큰을 두지 않는다. 빌드 전에
`SENTRY_AUTH_TOKEN`을 셸 환경변수로 주입한다. 과거 Git에 들어간 토큰은 별도로 폐기하고
교체해야 한다. 파일에서 제거해도 Git 이력이나 원격 서비스의 토큰이 폐기되지는 않는다.

## 3. 앱푸시 (OTA)

```bash
npm run deploy:ota -- -m "러닝 상세 화면 문구 수정"
npm run deploy:ota -- -m "스테이징 확인" -b staging
npm run deploy:ota -- -m "iOS만" -p ios
```

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

1. 프리플라이트 — 소스 상태, 필수 환경변수, Sentry 인증, **Unity export 소스 해시**, Android 서명 설정. 업로드할 때만 EAS 로그인 확인
2. 버전 반영 — `--version` 적용, `runtimeVersion` 동기화, 빌드번호/versionCode 증가, 재시도용 소스 상태 기록
3. iOS — `xcodebuild archive` (Unity 프로젝트 포함) → `-exportArchive`로 IPA
4. Android — `./gradlew :app:bundleRelease` → AAB 서명자 검사
5. 업로드 — `eas submit --path`로 각각 제출
6. 산출물은 `build/release/` 아래에 버전·빌드번호가 붙은 이름으로 남는다

업로드 후 남는 수동 단계:

- **iOS**: `eas submit`은 업로드까지만 한다. `--submit-review`를 붙이면 업로드 뒤
  정확한 버전/빌드를 fastlane으로 심사 제출한다. 승인 후 출시는 수동이다.
- **Android**: 현재 `eas.json`은 `production/completed`이다. 실제 공개 시점은 Play 심사와
  관리형 게시 설정에 따른다. 스크립트는 실제 설정을 읽어 표시한다.

### Unity export 검증

Unity Editor는 `ProjectVersion.txt`에 지정된 **6000.0.60f1**을 사용한다. 기존 수동 export
절차와 필요한 네이티브 보정을 유지한다. `expo prebuild --clean`과 EAS Build는 사용하지 않는다.

`Assets/Editor/VersionSync/VersionSyncEditor.cs`가 앱 버전을 읽고, export 전후의
`Assets`, `Packages`, `ProjectSettings` SHA-256을 비교한다. 정상 export 후 출력 폴더에
`.runtaeho-export.json`을 기록한다. export 시작 때 이전 기록을 지워 실패한 결과를 재사용하지 않는다.
배포는 이 기록과 현재 입력을 비교한다. `.DS_Store`만 제외한다.

**기존 export에는 기록이 없으므로 첫 배포 전에 iOS와 Android를 다시 export해야 한다.**
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
npm run submit:review:ios -- 1.9.0 2
```

`--resume`은 `build/release/pending.json`에 기록한 소스·커밋·플랫폼이 같을 때만 허용한다.
소스를 수정하거나 커밋했다면 새 배포로 준비한다. 이미 업로드된 빌드는 재업로드하지 말고
필요한 플랫폼의 업로드/심사 명령만 실행한다.

### iOS 심사 자동화 사전 설정

이미 설치된 fastlane을 사용한다. `ASC_API_KEY_PATH`에는 저장소 외부의 fastlane 형식
App Store Connect API key JSON 경로를 지정한다 (`key_id`, `issuer_id`, `key`).
기존 EAS 제출 자격증명과 별도로 fastlane에서 읽을 수 있어야 한다.

```bash
npm run deploy:store -- --version 1.9.0 --submit-review
```

기본적으로 기존 스토어 설명·스크린샷·개인정보/수출 규정 답변을 사용한다.
새 버전의 변경사항은 `ASC_METADATA_PATH`로 fastlane 메타데이터 폴더를 지정해 전달할 수 있다
(예: `ko/release_notes.txt`). 설명·규정 답변을 임의로 만들어 넣지 않는다.
필수 메타데이터나 계약, 권한이 빠졌거나 빌드 처리가 끝나지 않았으면 실패한다.
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
| `version` | 스토어 표시 버전 | 릴리스마다 |
| `runtimeVersion` | 네이티브 호환 경계 | **스토어 배포에서만** |
| iOS `CURRENT_PROJECT_VERSION` | 빌드번호 | 업로드마다 (단조 증가) |
| Android `versionCode` | 빌드번호 | 업로드마다 (단조 증가) |

`runtimeVersion`을 OTA 직전에 올리면 이미 설치된 앱은 업데이트를 못 받는다. 그래서
`deploy-ota.sh`가 이 값을 먼저 검사한다.

Wear OS는 `wearos/`에서 별도로 빌드하며, `wearos/app/build.gradle`의
`versionCode`와 `versionName`을 관리한다. 휴대폰 Android 배포 명령은 Wear OS
산출물을 업로드하지 않는다. 서명키와 단독 빌드 절차는
[Wear OS 안내](../wearos/README.md), Apple Watch 개발 빌드는
[watchOS 안내](../watchos/README.md)를 참조한다.

## 6. 현재 알려진 문제

- **기존 설치 앱의 Android 런타임**: 새 빌드용 AndroidManifest는 `1.8.0`으로 맞췄다.
  기존 스토어 설치 바이너리의 런타임은 별도 확인한다. `1.7.0` 바이너리는 `1.8.0` OTA를 받지 못한다.

  같은 `1.8.0`으로 다시 올려서 해소할 수 있다. Play는 versionName 중복을 허용하고
  versionCode만 이전보다 크면 된다.

  ```bash
  npm run deploy:store -- --platform android
  # sync-runtime → versionCode 증가 → 새 네이티브 빌드 → 업로드
  ```

  재배포 없이 급히 Android로만 OTA를 보내야 한다면 `config.runtimeVersion`을 `1.7.0`으로
  되돌려 `-p android`로 퍼블리시하고, 다시 `1.8.0`으로 올려 `-p ios`로 퍼블리시한다.
  런타임이 갈려 있는 동안은 한 번의 퍼블리시로 양쪽을 덮을 수 없다.
  이 절차는 각 플랫폼의 JS/네이티브 호환성을 확인하고 해당 런타임 변경을 커밋한 후 진행한다.
- **iOS 빌드번호**: `CURRENT_PROJECT_VERSION`이 1이다. App Store Connect에 같은 버전
  트레인으로 이미 올라간 빌드번호보다 커야 하므로, 첫 실행 전에 ASC에서 마지막 빌드번호를
  확인하고 필요하면 `node scripts/version.js bump-build`를 여러 번 돌리거나 pbxproj를 직접 맞춘다.
- **명령 별칭**: `build:prod:*`는 운영 스토어 빌드(`--no-submit`), `build:dev:*`는 테스터용
  Release 빌드다. 로컬 실행은 `ios`, `android`, `build:local:*`을 사용한다. `submit:ios/android`는 `--path`가 필수다. 산출물을 지정하지 않던
  `submit:all` 별칭은 제거했다. 플랫폼별로 정확한 산출물을 지정한다.
- **`aps-environment`**: `ios/app/app.entitlements`가 `development`다. 푸시 알림을 실제로
  쓰기 시작하면 배포 빌드에서 확인이 필요하다.

## 7. 트러블슈팅

| 증상 | 원인 / 조치 |
|---|---|
| `Unity iOS 프로젝트가 없다` | Unity에서 iOS export를 다시 한다 |
| `업로드 키 서명 설정이 없다` | 2.2의 gradle 프로퍼티 4개를 넣는다 |
| `AAB가 debug 키로 서명됐다` | 프로퍼티 이름 오타 또는 `~/.gradle/gradle.properties` 위치 확인 |
| `The sandbox is not in sync with the Podfile.lock` | `npm run deploy:store -- --pods` |
| OTA를 퍼블리시했는데 반영이 안 됨 | `npm run version:status`로 런타임 정합 확인 |
| `eas submit`이 자격증명을 물어봄 | 2.3 / 2.4를 먼저 등록한다 |

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
