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
| 통계·신발 | [statistics/](../src/features/statistics) / [shoes/](../src/features/shoes) | [statisticsService](../src/features/statistics/services/statisticsService.ts) / [SwipeablePeriodChart](../src/features/statistics/views/components/SwipeablePeriodChart.tsx) | [statistics 테스트](../src/features/statistics/__tests__) / [차트 렌더 회귀](../src/features/statistics/views/components/__tests__/SwipeablePeriodChart.test.tsx) | 차트는 기본 memo로 외부 prop 변경을 전달하고 background fetching 중에는 기존 캐시를 유지한다. 신발 테스트는 해당 feature 내부 |
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
| 인증 화면 전환 | [AuthProvider](../src/providers/AuthProvider.tsx) / [PersistHydration](../src/utils/storage/PersistHydration.ts) / [준비·라우팅 회귀](../src/providers/__tests__/AuthProvider.navigation.test.tsx) | auth/user의 기존 persist 읽기가 성공 또는 실패로 끝난 뒤 bootstrap·로그인 진입을 시작한다. children/루트 Stack은 계속 렌더한다. 복원 실패는 저장 상태를 덮지 않고 로그인 화면으로 수렴하며 새 로그인은 메모리 토큰을 사용할 수 있다. 로그인·약관·사용자/세션 및 bootstrap/OTA 준비를 기준으로 이동하고 같은 세션의 토큰 교체는 화면을 보존한다. 세션에 고정된 replay는 화면 준비와 별도로 진행하며 새 로그인은 useAuth가 이미 복원한 사용자 상태를 사용한다. |
| API·캐시 | [apiClient](../src/services/api/client.ts) / [queryClient / queryKeys](../src/services/queryClient.ts) / [avatarQueryKeys](../src/features/avatar/services/avatarQueries.ts) | 공통 클라이언트와 기존 공통·기능별 query key 소유자 |
| 화면 작업 수명 | [useScreenLifetime](../src/shared/hooks/useScreenLifetime.ts) / [ProfileEditView](../src/features/user/views/ProfileEditView.tsx) / [AddShoeForm](../src/features/shoes/views/components/AddShoeForm.tsx) | 시작 시 캡처한 focus/컴포넌트 수명은 blur·unmount 뒤 되살아나지 않는다. UI 완료·Alert 확인은 이 수명과 authStore 세션을 확인한다. 이미 전송한 서버 변경과 공유 캐시 갱신은 화면 이탈과 분리한다. 문의·신발 폼은 기존 submitting 상태로 제출 payload의 입력·진단 선택을 잠그고 실패 시 초안을 유지하며 편집을 재개한다. |
| 표시 포인트 잔액 갱신 | [pointService](../src/features/point/services/pointService.ts) / [useAuth.refreshUserData](../src/features/auth/hooks/useAuth.ts) / [runningCompletion](../src/features/running/services/runningCompletion.ts) | point/profile 조회 시작·반영과 END 완료가 같은 revision을 공유한다. END 도중 다른 조회·완료가 겹치면 응답 잔액을 바로 적용하지 않고 완료 후 서버를 재조회한다. refresh는 세션·응답 userId도 확인하며 getUserPoint는 순수 조회를 유지한다. import/watch·모달·AppState·구매가 이 owner를 사용한다. 온라인/오프라인 END는 공통 완료 owner로 잔액과 query를 갱신하고, 후속 조회·캐시 실패가 성공한 ACK/cursor를 되돌리지 않는다. 네트워크 재생 lock은 후속 조회 전에 해제한다. |
| 아바타 작업 세션 | [avatarQueries](../src/features/avatar/services/avatarQueries.ts) / [useAvatarViewModel](../src/features/avatar/viewmodels/useAvatarViewModel.ts) / [세션 회귀](../src/features/avatar/__tests__/avatarSessionOwnership.test.tsx) | mutation 호출 시 시작 세션을 캡처하고 구매·포인트 조회·착장 요청과 cache/store 완료 처리에 전달한다. 동일 사용자의 새 로그인도 이전 작업과 분리한다. |
| 재전송 | [OfflineStorageService](../src/features/running/services/OfflineStorageService.ts) / [syncWatchRecords](../src/features/watchSync/watchSyncService.ts) | 폰 오프라인·워치 업로드의 직렬화/소유자 경계. 폰 최종 기록·세그먼트는 네트워크 대기 전 단일 snapshot으로 저장하고, ACK 후 다음 큐 저장이 끝나야 원본을 제거한다. 저장 직렬화와 네트워크 재생은 분리하며 진행 중 소유권은 현재 세션에만 유효하다. |
| 폰 종료 데이터 확정 | [RunningTrackingCoordinator](../src/features/running/services/RunningTrackingCoordinator.ts) / [useGpsTracking](../src/features/running/viewmodels/hooks/useGpsTracking.ts) / [useRunningSegments](../src/features/running/viewmodels/hooks/useRunningSegments.ts) / [useRunningLifecycle](../src/features/running/viewmodels/hooks/useRunningLifecycle.ts) | 종료 시 마지막 source snapshot을 수거한 뒤 동기 segment refs를 최초 종료 시각으로 확정하고 영속화한다. drain 중에는 진행 데이터를 받으며 임계거리 세그먼트 생성은 보류한다. 수거 실패 시 source를 유지해 같은 마지막 데이터를 재시도한다. |
| 앱 복귀 cycle·시각 | [AppStateProvider](../src/providers/AppStateProvider.tsx) / [복귀 회귀](../src/providers/__tests__/AppStateProvider.lifecycle.test.tsx) | background 시각 저장·복귀의 읽기/소비는 짧은 저장 lane에서 직렬화한다. Unity 작업은 현재 cycle만 이어가며 대기 중 최신 active 하나를 유지한다. 이미 발생한 장기 복귀 동기화 요구는 세션에 귀속되어 최신 short cycle도 이어받고, 완료 뒤 해제한다. |
| 폰 걸음·케이던스 집계 | [PedometerService](../src/features/running/services/sensors/PedometerService.ts) / [RunningClock](../src/features/running/models/RunningClock.ts) / [useRunningLifecycle](../src/features/running/viewmodels/hooks/useRunningLifecycle.ts) | 수동·자동 정지와 종료 시 센서 누적도 멈춘다. 재개 시 새 센서 구독의 걸음에 이전 활동 구간 걸음을 합치고, 활동 시간으로 계산한다. 이전 구독 callback은 새 누적에 반영하지 않는다. |
| 리그 결과 조회·소비 | [useLeagueCheck](../src/features/league/hooks/useLeagueCheck.ts) / [leagueCheckStore](../src/stores/league/leagueCheckStore.ts) / [useLeagueResultNavigation](../src/features/league/hooks/useLeagueResultNavigation.ts) | store가 조회 시작 세션·작업 identity와 완료 쓰기를 소유한다. 새 세션은 이전 작업을 대체하고, 두 탭은 공유 hook의 focus·Stopped 조건 아래 현재 결과를 원자적으로 한 번 소비한다. |
| 광고·리그 표시 수명 | [AdBanner](../src/features/ads/AdBanner.tsx) / [LeagueNotJoinedView](../src/features/league/views/components/LeagueNotJoinedView.tsx) | 광고는 동의 준비 후 첫 focused/active/visible 표시에서 생성하고 이후 비표시에는 display:none으로 같은 인스턴스를 유지한다. 동의 준비 해제·unmount는 자원을 해제한다. 리그 미참가 모션은 focused+active 동안만 실행하며 blur/background/unmount에 타이머와 진행 중 모션을 정리한다. |
| 알림 설정·기기 등록 | [NotificationSettingsView](../src/features/notifications/views/NotificationViews.tsx) / [notificationService](../src/features/notifications/services/notificationService.ts) / [pushRegistration](../src/features/notifications/services/pushRegistration.ts) / [NotificationProvider](../src/features/notifications/NotificationProvider.tsx) | 켜기 전 OS 권한만 확인하고 설정 PUT과 캐시 반영을 먼저 완료한다. 등록 실패는 저장 실패와 구분하며 등록 대기는 스위치를 잠그지 않는다. 성공 응답 반영 직전 configuration query를 취소하고 세션을 재확인한다. 토큰 이벤트는 전달된 native token을 Expo 교환에 사용한다. 토큰 준비는 binding PUT/해제 큐 밖에서 수행하고 최신 sync·세션만 쓰기를 시작한다. 이미 전송한 PUT은 logout이 반환 버전으로 해제할 수 있게 보존한다. 재시도 가능한 해제 실패는 AppResetService에 전달하고 이전 인증 정보로 재시도한다. 캡처한 인증이 401/403으로 거부되면 네이티브 정리 후 종료하며 다른 계정으로 갱신하지 않는다. |
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
| 인증 준비·라우팅·아바타 세션 | `npm run test:unit -- --runTestsByPath src/providers/__tests__/AuthProvider.persistence.test.tsx src/providers/__tests__/AuthProvider.navigation.test.tsx src/features/avatar/__tests__/avatarSessionOwnership.test.tsx` | 실제 persist의 두 저장 순서·오류·새 로그인·logout 우선권, provider의 replay 분리·세션 전환과 avatar hook/service/API 경계의 지연 응답 회귀 |
| 앱 복귀·저장 시각 | `npm run test:unit -- --runTestsByPath src/providers/__tests__/AppStateProvider.lifecycle.test.tsx` | 실제 provider의 연속 long/short cycle·지연 Unity, timestamp read/remove/write 경합, 같은 세션의 미완료 resync 승계와 중복 active 병합 |
| 폰 정지·재개 센서 집계 | `npm run test:unit -- --runTestsByPath src/features/running/__tests__/useRunningLifecycle.cadence.test.tsx src/features/running/services/sensors/__tests__/PedometerService.test.ts` | 실제 lifecycle·센서·clock으로 정지 중 걸음 제외, 재개 누적 보존, 최종 저장값 검증 |
| 리그 작업·결과 소비 | `npm run test:unit -- --runTestsByPath src/features/league/__tests__/leagueCheckOwnership.test.tsx src/features/league/__tests__/leagueResultNavigation.test.tsx` | 실제 조회/service/API의 세션 교체 및 두 화면의 focus·러닝 상태·단일 소비 회귀 |
| 광고·리그 표시 수명 | `npm run test:unit -- --runTestsByPath src/features/ads/__tests__/AdBanner.test.tsx src/features/league/views/components/__tests__/LeagueNotJoinedView.test.tsx` | 실제 컴포넌트의 focus/visible/AppState 왕복에서 배너 인스턴스 유지·동의 해제 시 정리, 리그 모션 중단·단일 루프 재개. native 광고·애니메이션은 대역이며 기기 프레임 시간은 별도 검증 |
| 알림 설정 조회·저장 경합 | `npm run test:unit -- --runTestsByPath src/features/notifications/__tests__/NotificationSettingsView.test.tsx` | 실제 화면/service/query의 지연 GET과 후속 PUT payload, 실패 재시도·세션 보호 회귀 |
| 알림 등록 수명·토큰 이벤트 | `npm run test:unit -- --runTestsByPath src/features/notifications/__tests__/pushRegistration.test.ts src/features/notifications/__tests__/NotificationProvider.test.tsx` | OS 권한/등록 분리, Android·iOS native token 전달과 반복 등록 방지, 느린 토큰보다 최신 설정 우선, token 대기 중 logout 및 진행 PUT의 버전 해제 회귀. 네이티브 SDK·HTTP는 제어한 대역 |
| 통계 차트 응답 반영 | `npm run test:unit -- --runTestsByPath src/features/statistics/views/components/__tests__/SwipeablePeriodChart.test.tsx src/features/statistics/views/components/__tests__/PeriodChart.test.tsx` | 실제 memo/차트의 늦은 다음 기간 데이터·스와이프와 빈 기간 필터 변경의 날짜 표시 회귀 |
| 화면 수명·탈퇴 세션 | `npm run test:unit -- --runTestsByPath src/shared/hooks/__tests__/useScreenLifetime.test.ts src/features/user/__tests__/ProfileEditView.lifetime.test.tsx src/features/user/__tests__/SettingsView.test.tsx src/features/shoes/__tests__/AddShoeForm.test.tsx src/features/shoes/__tests__/EditShoeView.lifetime.test.tsx src/features/support/__tests__/InquiryView.lifetime.test.tsx src/features/notifications/__tests__/NotificationViews.test.tsx` | blur/refocus, 실제 신발 부모 modal 재개방, 지연 Alert/화면 이동, 저장 중 닫기와 이전 탈퇴 응답의 새 세션 보호 |
| 지급 후 잔액·공용 큐 | `npm run test:unit -- --runTestsByPath src/features/point/__tests__/rewardedPointSync.test.tsx src/features/avatar/__tests__/avatarSessionOwnership.test.tsx` | 실제 import/watch·모달·구매·전체 profile/END의 잔액 경합, offline 완료 캐시 갱신, partial ACK/cursor 보존, 잔액 대기 중 replay lock 해제 |
| 폰 종료 영속화·복구 | `npm run test:unit -- --runTestsByPath src/features/running/__tests__/useRunningLifecycle.trackingCompletion.test.tsx src/features/running/__tests__/useRunningLifecycle.offlinePersistence.test.tsx src/features/running/__tests__/useOfflineSync.test.tsx src/features/running/__tests__/OfflineStorageService.ownership.test.ts` | 실제 source 인계·최종 tail 수거·최초 종료 시각, snapshot/ACK 전 보존, 저장·drain 실패 재시도, 화면 파괴 후 복구 및 세션 소유권 회귀 |
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
