# 07. 휴대폰 코드 가이드

## 읽기와 근거 확인

이 가이드는 [휴대폰 계약](../AGENTS.md)의 코드 탐색 지도다. 각 행의 소유 경로·대표 구현·테스트가 근거 경로다. 요청과 관련된 경로의 Git 변경을 확인하고 현재 호출자·호출 대상·공유 소유자로 이어서 읽는다.

## Module Map

| 영역 | 소유 경로·진입점 | 대표 구현/심볼 | 관련 검증 근거 | 연결/책임 |
| --- | --- | --- | --- | --- |
| 실행·라우팅·provider | [index.js](../index.js) / [app/](../app) / [providers/](../src/providers) | [app/_layout.tsx](../app/_layout.tsx) / [AuthProvider](../src/providers/AuthProvider.tsx) | [src/__tests__/](../src/__tests__) / [provider 테스트](../src/providers/__tests__) | Headless JS 등록·Expo Router 진입·공통 provider 연결 |
| 인증·계정·약관 | [auth/](../src/features/auth) / [user/](../src/features/user) / [terms/](../src/features/terms) | [useAuthStore / getSessionSnapshot / isSessionCurrent](../src/features/auth/stores/authStore.ts) | [auth 테스트](../src/features/auth/__tests__) | 기존 로그인·세션과 사용자 정보 소유 |
| 폰 측정·기록 | [running/](../src/features/running) | [RunningTrackingCoordinator](../src/features/running/services/RunningTrackingCoordinator.ts) | [running 테스트](../src/features/running/__tests__) | 위치·센서·세그먼트·기록·오프라인 경로 |
| 워치 중계 | [watchSync/](../src/features/watchSync) / [iOS bridge](../ios/WatchSync) / [Android bridge](../android/app/src/main/java/com/hongtaeho/app/watch) | [syncWatchRecords](../src/features/watchSync/watchSyncService.ts) | [watchSync 테스트](../src/features/watchSync/__tests__) | 네이티브 보관과 폰 인증 업로드 연결 |
| Android 폰 업로드 예약 | [폰 watch 네이티브](../android/app/src/main/java/com/hongtaeho/app/watch) | [WatchUploadScheduler](../android/app/src/main/java/com/hongtaeho/app/watch/WatchUploadScheduler.kt) / [WatchSyncTaskService](../android/app/src/main/java/com/hongtaeho/app/watch/WatchSyncTaskService.kt) | [예약 원장 호스트 테스트](../android/app/src/testStandalone/java/com/hongtaeho/app/watch/WatchUploadLedgerTests.java) | JobScheduler 예약·재시도 상태와 Headless JS 실행 |
| 아바타·렌더 | [avatar/](../src/features/avatar) / [unity/](../src/features/unity) | [avatarService](../src/features/avatar/services/avatarService.ts) | [avatar 테스트](../src/features/avatar/__tests__) | 아이템·착장과 Unity 어댑터 |
| 리그 | [league/](../src/features/league) | [leagueService](../src/features/league/services/leagueService.ts) | [league 테스트](../src/features/league/__tests__) | 서버 리그 조회·화면 상태 |
| 포인트 | [point/](../src/features/point) | [pointService](../src/features/point/services/pointService.ts) | [point 테스트](../src/features/point/__tests__) | 포인트 조회·이력 |
| 통계·신발 | [statistics/](../src/features/statistics) / [shoes/](../src/features/shoes) | [statisticsService](../src/features/statistics/services/statisticsService.ts) | [statistics 테스트](../src/features/statistics/__tests__) | 기록 집계·신발 관리; shoes 테스트는 해당 feature 내부 |
| 외부 운동 연동 | [healthImport/](../src/features/healthImport) / [garmin/](../src/features/garmin) / [activity-connection/](../src/features/activity-connection) | [healthImportService](../src/features/healthImport/services/healthImportService.ts) | [healthImport 테스트](../src/features/healthImport/services/__tests__) | 플랫폼 건강·Garmin·연결 UI와 서버 수락 연결 |
| 알림·고객 문의 | [notifications/](../src/features/notifications) / [support/](../src/features/support) | [inquiryService](../src/features/support/inquiryService.ts) | [notifications 테스트](../src/features/notifications/__tests__) | 알림 수신/등록·고객 문의; support 테스트는 해당 feature 내부 |
| 버전·업데이트 | [forceUpdate/](../src/features/forceUpdate) / [updates/](../src/features/updates) | [checkVersionFromServer](../src/features/forceUpdate/services/forceUpdateService.ts) | [updates 테스트](../src/features/updates/hooks/__tests__) | 서버 앱 버전·OTA·실행 흐름 |
| 공유·광고 | [share/](../src/features/share) / [ads/](../src/features/ads) | [shareService](../src/features/share/services/shareService.ts) | [share 테스트](../src/features/share/__tests__) | 렌더·캡처·공유와 광고 표시 |
| 설정·권한 | [settings/](../src/features/settings) / [permissions/](../src/features/permissions) | [settings 진입](../src/features/settings/index.ts) | [기능별 테스트 위치](../src/features) | 사용자 설정·플랫폼 권한과 관련 provider |
| 공통 UI·언어 | [common/](../src/features/common) / [shared components](../src/shared/components) / [styles/](../src/shared/styles) / [i18n/](../src/i18n) | [Text](../src/shared/components/typography/Text.tsx) | [언어 테스트](../src/i18n/__tests__) | 토큰·문자·공통 화면·로케일 |

## Shared Capability Catalog

| 공유 기능 | 소유 구현/원본 | 사용·경계 |
| --- | --- | --- |
| 인증·토큰·세션 | [authStore](../src/features/auth/stores/authStore.ts) / [SilentTokenRefreshService](../src/features/auth/services/SilentTokenRefreshService.ts) / [TokenRefreshInterceptor](../src/shared/services/TokenRefreshInterceptor.ts) / [tokenStorage](../src/utils/storage/index.ts) / [secureStorage](../src/utils/storage/SecureStorage.ts) | tokenStorage가 토큰 읽기/쓰기 직렬화와 호출자의 세션 검사 연결을, secureStorage가 저수준 키 저장을 담당 |
| API·캐시 | [apiClient](../src/services/api/client.ts) / [queryClient / queryKeys](../src/services/queryClient.ts) / [avatarQueryKeys](../src/features/avatar/services/avatarQueries.ts) | 공통 클라이언트와 기존 공통·기능별 query key 소유자 |
| 재전송 | [OfflineStorageService](../src/features/running/services/OfflineStorageService.ts) / [syncWatchRecords](../src/features/watchSync/watchSyncService.ts) | 폰 오프라인·워치 업로드의 직렬화/소유자 경계 |
| Android 폰 업로드 깨움 | [WatchUploadScheduler](../android/app/src/main/java/com/hongtaeho/app/watch/WatchUploadScheduler.kt) / [WatchUploadLedger](../android/app/src/main/java/com/hongtaeho/app/watch/WatchUploadLedger.kt) / [WatchSyncTaskService](../android/app/src/main/java/com/hongtaeho/app/watch/WatchSyncTaskService.kt) / [background.ts](../src/features/watchSync/background.ts) | 네이티브 예약·시도 수명주기와 기존 JS 중계 연결 |
| Android 공통 전송 | [WatchStore](../shared/watchsync-android/src/main/java/com/runtaeho/watchsync/WatchStore.kt) / [WatchTransport](../shared/watchsync-android/src/main/java/com/runtaeho/watchsync/WatchTransport.kt) | Android 폰·Wear OS 공통 소스 |
| UI·문자·언어 | [colors](../src/shared/styles/colors.ts) / [typography](../src/shared/components/typography) / [i18n](../src/i18n) | 기존 토큰·컴포넌트·문자열 소유자 |
| 오류 보고 | [Sentry 설정](../src/config/sentry.ts) / [ErrorService](../src/shared/services/ErrorService.ts) | 보고되는 데이터와 오류 처리의 실제 범위 확인 |
| 공개 프로필 | [app-profiles.json](../scripts/app-profiles.json) | 폰·두 워치 식별자/환경 연결 |
| Garmin 인증 복귀 | [garminService.connect](../src/features/garmin/services/garminService.ts) / [복귀 계약 테스트](../src/features/garmin/__tests__/garminService.test.ts) | 공개 프로필의 등록 스킴으로 복귀 URL을 만들고 appScheme을 서버에 전달한다. state의 프로필 결합·복귀 URL·세션을 검증한 뒤 인증된 연결 상태를 다시 확인한다. 개발·운영 앱은 같은 서버를 사용하므로 서버 전체의 복귀 스킴을 하나로 고정하지 않는다. |
| 로컬 빌드·배포 | [deploy-store.sh](../scripts/deploy-store.sh) / [sign-ios.py](../scripts/sign-ios.py) / [submit-store.sh](../scripts/submit-store.sh) | iOS 임시 키체인 서명·IPA 검증, Firebase·TestFlight·Play 업로드; 스토어 수동 설정은 오류로 안내 |

## Conventions and Canonical Examples

| 관심사 | 원본/예제 | 관례의 적용 |
| --- | --- | --- |
| 경로·타입 옵션 | [tsconfig.json](../tsconfig.json) | `~/`·`@/` 별칭과 현재 엄격 옵션 |
| 기능별 API와 queries | [leagueService](../src/features/league/services/leagueService.ts) / [leagueQueries](../src/features/league/services/leagueQueries.ts) | 기존 service/query 역할 분리와 현재 가까운 feature 스타일 |
| 테스트 provider·상태 | [renderWithProviders](../src/test-utils/renderWithProviders.tsx) / [resetState](../src/test-utils/resetState.ts) | 현재 테스트 실행 문맥의 소유자 |
| 네이티브 입력 | [Android Unity bridge 안내](../src/features/unity/bridge/android/README.md) | 폰 네이티브/Unity 구성의 원본 연결 |

## Dependency and Ownership

`app/`의 진입은 기능 화면/provider로, 기능은 기존 service·query·공유 UI·유틸리티로 연결된다. 인증·캐시·저장·전송의 공통 동작은 위 소유 구현을 사용한다. 토큰 저장의 호출 경계는 `tokenStorage`, 캐시 키는 공통 또는 해당 기능의 기존 정의를 따른다. watchOS·Wear OS 작업은 [watchOS 가이드](../watchos/docs/07-codebase-guide.md)와 [Wear OS 가이드](../wearos/docs/07-codebase-guide.md)로 이어진다.

## Verification Map

작업 폴더: `runtaeho_app/`. 명령 정의는 `package.json`, 입력 범위는 해당 테스트/설정 파일을 따른다.

| 분류 | 프로젝트 폴더에서 사용하는 명령/원본 | 조건·소유 범위 |
| --- | --- | --- |
| 준비 | `npm install` | package-lock.json·postinstall |
| 전체 src 단위 테스트 | `npm run test:unit` | [Jest 설정](../jest.config.ts)의 testMatch |
| 인증·소유권 | `npm run test:unit -- --runTestsByPath src/features/auth/__tests__/authStore.test.ts src/features/running/__tests__/OfflineStorageService.ownership.test.ts` | 관련 테스트·Jest 설정 |
| 워치 JS 중계 | `npm run test:unit -- --runTestsByPath src/features/watchSync/__tests__/watchSyncService.test.ts src/features/watchSync/__tests__/background.test.ts` | watchSync 서비스·백그라운드 |
| Android 폰 예약 원장 | [호스트 하네스](../android/app/run-watch-upload-regressions.sh) | Android 폰 localDebug 컴파일 결과와 명시적 runtime jar 입력 |
| 리그·통계 예제 | `npm run test:unit -- --runTestsByPath src/features/league/__tests__/leagueQueries.test.tsx src/features/statistics/__tests__/statisticsQueries.test.tsx` | 소유 feature 테스트 |
| 타입·린트 | `npx tsc --noEmit`; `npm run lint` | [TypeScript 설정](../tsconfig.json) / [ESLint 설정](../eslint.config.js) |
| 배포 도구 | `npm run test:deploy` | scripts/*.test.cjs |
| 폰 네이티브 빌드 | [배포 가이드](deployment.md) | Unity 입력·프로필·서명·빌드 옵션 |

## 생성물과 환경 경로

`node_modules/`, `.expo/`, `coverage/`, `build/`, `dist/`, `ios/Pods/`, Gradle/Kotlin 캐시는 각 도구의 산출물이다. 에셋의 생성 관계는 [에셋 생성 안내](../README.md)와 `tools/`의 소유 스크립트를 따른다. 환경·서명 파일 위치는 [.gitignore](../.gitignore)와 배포 원본을 확인한다.


## Linked Sources

| Source | 소유 주제 | 적용 범위 | 근거 |
| --- | --- | --- | --- |
| [package.json](../package.json) | 실제 npm 명령 | 휴대폰 | scripts |
| [워치 동기화 원본](../src/features/watchSync/README.md) | 공유 기록·전송 계약 | 폰·워치·서버 | Contract / Implementation evidence |
| [단위 테스트 리뷰 원본](unit-test-review-gate.md) | 테스트 리뷰 기준 | 원본 선언 범위 | Summary |
