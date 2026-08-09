# 배포 가이드

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

### 2.5 Sentry (선택)

`ios/sentry.properties`, `android/sentry.properties`에 auth token이 커밋되어 있다. 로컬
빌드는 이걸로 동작하지만, 토큰이 저장소에 노출된 상태이므로 폐기 후 환경변수
(`SENTRY_AUTH_TOKEN`)로 옮기는 편이 낫다.

## 3. 앱푸시 (OTA)

```bash
npm run deploy:ota -- -m "러닝 상세 화면 문구 수정"
npm run deploy:ota -- -m "스테이징 확인" -b staging
npm run deploy:ota -- -m "iOS만" -p ios
```

절차는 이렇게 돈다.

1. 런타임 정합 확인 — 설치된 빌드의 런타임과 퍼블리시 런타임이 다르면 중단한다
2. 커밋되지 않은 변경 확인 (`eas.json`의 `cli.requireCommit: true`)
3. EAS 로그인 확인
4. `eas update --branch <브랜치> --environment <환경> --platform all`

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

1. 프리플라이트 — 브랜치/커밋 상태, EAS 로그인, **Unity 산출물 경로 존재**, Android 서명 설정
2. 버전 반영 — `--version` 적용, `runtimeVersion` 동기화, 빌드번호/versionCode 증가
3. iOS — `xcodebuild archive` (Unity 프로젝트 포함) → `-exportArchive`로 IPA
4. Android — `./gradlew :app:bundleRelease` → AAB 서명자 검사
5. 업로드 — `eas submit --path`로 각각 제출
6. 산출물은 `build/release/` 아래에 버전·빌드번호가 붙은 이름으로 남는다

업로드 후 남는 수동 단계:

- **iOS**: 처리(10~15분) 후 TestFlight에 뜬다. 실제 출시는 App Store Connect에서 버전을
  만들고 심사 제출해야 한다. `eas submit`은 업로드까지만 한다.
- **Android**: internal 트랙 draft로 올라간다. Play Console에서 트랙/롤아웃을 진행한다.

Unity 쪽을 고쳤다면 스크립트를 돌리기 전에 Unity에서 iOS/Android로 다시 export해야 한다.
스크립트는 경로 존재만 확인하지 Unity를 대신 빌드하지 않는다.

## 5. 버전 규칙

`expo prebuild`를 쓰지 않으므로 `app.config.js`의 version/bundleId는 네이티브에 반영되지
않는다. 실제 값은 다섯 곳에 흩어져 있고 `scripts/version.js`가 이걸 한 번에 다룬다.

```bash
npm run version:status                 # 다섯 곳 값과 정합 여부
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

## 6. 현재 알려진 문제

- **Android 런타임 불일치**: Play에 올라간 AAB(versionName `1.8.0`, versionCode `68`)에는
  `EXPO_RUNTIME_VERSION=1.7.0`이 박혀 있다. `package.json`과 iOS는 `1.8.0`이라 지금
  퍼블리시하면 Android는 업데이트를 받지 못한다.

  같은 `1.8.0`으로 다시 올려서 해소할 수 있다. Play는 versionName 중복을 허용하고
  versionCode만 이전보다 크면 된다.

  ```bash
  npm run deploy:store -- --platform android
  # sync-runtime(매니페스트 1.7.0 → 1.8.0) → versionCode 68 → 69 → 빌드 → 업로드
  ```

  재배포 없이 급히 Android로만 OTA를 보내야 한다면 `config.runtimeVersion`을 `1.7.0`으로
  되돌려 `-p android`로 퍼블리시하고, 다시 `1.8.0`으로 올려 `-p ios`로 퍼블리시한다.
  런타임이 갈려 있는 동안은 한 번의 퍼블리시로 양쪽을 덮을 수 없다.
- **iOS 빌드번호**: `CURRENT_PROJECT_VERSION`이 1이다. App Store Connect에 같은 버전
  트레인으로 이미 올라간 빌드번호보다 커야 하므로, 첫 실행 전에 ASC에서 마지막 빌드번호를
  확인하고 필요하면 `node scripts/version.js bump-build`를 여러 번 돌리거나 pbxproj를 직접 맞춘다.
- **`build:prod:*`, `submit:*` npm 스크립트**: EAS Build 전제라 이 저장소에서는 동작하지 않는다.
  스토어 배포는 `deploy:store`를 쓴다.
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
