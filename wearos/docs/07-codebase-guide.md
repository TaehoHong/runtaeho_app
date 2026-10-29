# 07. Wear OS 코드 가이드

## 읽기와 근거 확인

[Wear OS 계약](../AGENTS.md)에서 시작한다. 각 행의 소유 소스·대표 구현·검증 자료가 근거 경로다. `runtaeho_app` Git 저장소의 관련 변경을 확인하고 현재 호출자·공유 소유자와 함께 읽는다.

## Module Map

| 영역 | 소유 경로·진입점 | 대표 구현/심볼 | 관련 검증 근거 | 연결/책임 |
| --- | --- | --- | --- | --- |
| 운동·실행 | [RunService](../app/src/main/java/com/runtaeho/wear/RunService.kt) | [RunService](../app/src/main/java/com/runtaeho/wear/RunService.kt) | [실행·측정 원본](../README.md) | Health Services·위치·foreground 실행·세션 |
| 전송 이벤트 | [WatchDataService](../app/src/main/java/com/runtaeho/wear/WatchDataService.kt) | [WatchDataService](../app/src/main/java/com/runtaeho/wear/WatchDataService.kt) | [연동 계약](../../src/features/watchSync/README.md) | 폰 연결·Data Layer·서버 확인 연계 |
| 화면·표시 | [RunActivity](../app/src/main/java/com/runtaeho/wear/RunActivity.kt) / [RunDisplayPreferences](../app/src/main/java/com/runtaeho/wear/RunDisplayPreferences.kt) / [RunMetricDisplay](../app/src/main/java/com/runtaeho/wear/RunMetricDisplay.kt) / [LiveMetricSamples](../app/src/main/java/com/runtaeho/wear/LiveMetricSamples.kt) | [RunDisplayPreferences](../app/src/main/java/com/runtaeho/wear/RunDisplayPreferences.kt) | [표시·설정 호스트 테스트](../app/src/testStandalone/java/com/runtaeho/wear/DisplayRegressionTests.java) | Android Views·저장 설정·지표 표시 |
| 활동 시간·운동 점유 상태 | [ActiveTime](../app/src/main/java/com/runtaeho/wear/ActiveTime.java) / [ExerciseOwnership](../app/src/main/java/com/runtaeho/wear/ExerciseOwnership.java) | [ActiveTime](../app/src/main/java/com/runtaeho/wear/ActiveTime.java) | [기록 호스트 테스트](../app/src/testStandalone/java/com/runtaeho/wear/WatchRegressionTests.java) | 활동 시간 계산·Health Services에서 이 앱/다른 앱의 운동 점유 상태 판별 |
| 공통 저장·전송 | [WatchStore](../../shared/watchsync-android/src/main/java/com/runtaeho/watchsync/WatchStore.kt) / [WatchTransport](../../shared/watchsync-android/src/main/java/com/runtaeho/watchsync/WatchTransport.kt) / [WatchRecords](../../shared/watchsync-android/src/main/java/com/runtaeho/watchsync/WatchRecords.kt) | [WatchStore](../../shared/watchsync-android/src/main/java/com/runtaeho/watchsync/WatchStore.kt) | [호스트 하네스](../run-host-regressions.sh) | Android 폰·워치가 같은 소스 사용 |
| 빌드·프로필 | [settings.gradle](../settings.gradle) / [app/build.gradle](../app/build.gradle) | [app-profiles.json](../../scripts/app-profiles.json) | [빌드·서명 원본](../README.md) | 독립 :app root·variant·공유 sourceSets |

## Shared Capability Catalog

| 공유 기능 | 소유 구현/원본 | 사용·경계 |
| --- | --- | --- |
| Android 기록·저장·전송 | [watchsync-android](../../shared/watchsync-android/src/main/java/com/runtaeho/watchsync) / [Wear sourceSets](../app/build.gradle) / [폰 sourceSets](../../android/app/build.gradle) | 같은 공통 소스를 폰과 워치가 함께 컴파일 |
| 폰 중계 | [폰 네이티브 bridge](../../android/app/src/main/java/com/hongtaeho/app/watch) / [syncWatchRecords](../../src/features/watchSync/watchSyncService.ts) / [전송 계약](../../src/features/watchSync/README.md) | 워치 기록·폰 보관·인증 서버 업로드 |
| 공개 프로필 | [app-profiles.json](../../scripts/app-profiles.json) | 앱 ID·프로필·서명 정합의 공통 입력 |

## Conventions and Dependency Rules

현재 Kotlin/Java·Android Views 구조와 가까운 구현 스타일을 따른다. `RunService`의 측정 상태, 표시 클래스의 화면 값, 공통 저장/전송의 원본 기록을 구분한다. 공유 코드는 `shared/watchsync-android/`에서 소유하고 각 앱은 해당 소스·기존 계약에 연결한다.

독립 Gradle 설정은 `settings.gradle`과 `app/build.gradle`, 폰과의 식별자/서명 관계는 [README의 Signing identity](../README.md)를 따른다. 화면 원본은 [워치 Figma 원본](../../../docs/04-design-rules.md)에서 작업 대상 프레임을 확인한다.

## Verification Map

작업 폴더는 `runtaeho_app/wearos/`이다. JDK 17·Android SDK·선택 variant의 서명 자산을 사용한다.

| 대상 | 명령·조건 원본 | 검증 범위 |
| --- | --- | --- |
| 독립 프로젝트·variant 빌드/린트 | [README — Verification](../README.md#verification) / [앱 Gradle](../app/build.gradle) | 독립 :app·프로필·공유 sourceSets |
| 기록·표시 호스트 프로그램 | [run-host-regressions.sh](../run-host-regressions.sh) / [README의 입력 안내](../README.md#verification) | 컴파일 결과와 명시적 Android/Kotlin/org.json jar 경로 |

호스트 하네스는 기본 `localDebug` 또는 `WATCH_TEST_VARIANT`가 가리키는 컴파일 결과를 참조한다. 입력·준비 명령은 위 원본을 따른다.

## 생성물과 환경 경로

`app/build/`, `build/`, `.gradle/`, `.kotlin/`은 빌드·도구 산출물이다. 실제 프로젝트·소스 연결은 `settings.gradle`과 `sourceSets`를 기준으로 찾는다. 프로필·서명 파일의 위치와 상대 경로는 원본 Gradle과 README를 따른다.
