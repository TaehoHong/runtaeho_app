# 07. watchOS 코드 가이드

## 읽기와 근거 확인

[watchOS 계약](../AGENTS.md)에서 시작한다. 각 행의 소스·원본·테스트가 근거 경로다. `runtaeho_app` Git 저장소에서 관련 경로의 변경을 확인하고 현재 구현과 직접 연결된 소유자로 이어서 읽는다.

## Module Map

| 영역 | 소유 경로·진입점 | 대표 구현/심볼 | 관련 검증 근거 | 연결/책임 |
| --- | --- | --- | --- | --- |
| 앱·SwiftUI 진입 | [RunTaehoWatchApp](../RunTaehoWatch/RunTaehoWatchApp.swift) | [RunTaehoWatchApp](../RunTaehoWatch/RunTaehoWatchApp.swift) | [개발 원본](../README.md) | 앱·화면 구성 진입 |
| 운동 측정·파일 저장·전송 | [RunRecorder](../RunTaehoWatch/RunRecorder.swift) | [RunRecorder](../RunTaehoWatch/RunRecorder.swift) | [기록·전송 계약](../../src/features/watchSync/README.md) | HealthKit/CoreLocation/CoreMotion·현재 세션·체크포인트 파일 저장/복구·전송 |
| 체크포인트 모델·완료 페이로드 | [RunCheckpoint](../RunTaehoWatch/RunCheckpoint.swift) | [RunCheckpoint](../RunTaehoWatch/RunCheckpoint.swift) | [체크포인트 테스트](../Tests/RunCheckpointTests.swift) | 소유자·UUID·측정 원본·활동 시간과 완료 페이로드 검증 |
| 표시·설정 | [WatchDisplaySettings](../RunTaehoWatch/WatchDisplaySettings.swift) | [WatchDisplaySettings](../RunTaehoWatch/WatchDisplaySettings.swift) | [표시 설정 테스트](../Tests/WatchDisplaySettingsTests.swift) | 단위·표시 설정과 측정/전송 값의 분리 |
| 백그라운드 진입 | [WatchAppDelegate](../RunTaehoWatch/WatchAppDelegate.swift) | [WatchAppDelegate](../RunTaehoWatch/WatchAppDelegate.swift) | [실행 경로 원본](../../src/features/watchSync/README.md) | 플랫폼 백그라운드와 전송 수명주기 |
| 빌드·프로필 | [project.pbxproj](../RunTaehoWatch.xcodeproj/project.pbxproj) / [Info.plist](../RunTaehoWatch/Info.plist) / [entitlements](../RunTaehoWatch/RunTaehoWatch.entitlements) | [app-profiles.json](../../scripts/app-profiles.json) | [빌드 프로필 확인](../Tests/verify-built-profile.py) | 지원 설정·식별자·권한·폰 참조 |

## Shared Capability Catalog

| 공유 기능 | 소유 구현/원본 | 사용·경계 |
| --- | --- | --- |
| 폰 중계·서버 확인 | [RNWatchSyncBridge](../../ios/WatchSync/RNWatchSyncBridge.swift) / [syncWatchRecords](../../src/features/watchSync/watchSyncService.ts) / [연동 계약](../../src/features/watchSync/README.md) | 워치 보관·폰 보관·인증 업로드의 각 소유 경계 |
| 프로필·버전 | [공개 프로필](../../scripts/app-profiles.json) / [버전 연계](../../scripts/version.js) / [폰 프로젝트 참조](../../ios/app.xcodeproj/project.pbxproj) | 독립 워치와 폰 참조·프로필/버전 정합 |

## Conventions and Dependency Rules

측정·파일 저장/복구는 `RunRecorder`, 체크포인트 모델은 `RunCheckpoint`, 표시 설정은 `WatchDisplaySettings`의 현재 구조를 따른다. `RunCheckpoint`의 원본 식별자·소유자·측정 값과 `WatchDisplaySettings`의 표시 상태를 구분한다. 폰과 서버로 이어지는 계약은 동기화 원본에서 확인한다. 독립 워치 빌드는 Xcode 프로젝트, 폰 참조 관계는 폰 프로젝트가 소유한다. 현재 Watch 출시는 보류되어 기본 폰 타깃에는 Watch 빌드 의존성과 포함 단계가 없다.

화면 원본은 [공통 디자인 원본](../../../docs/04-design-rules.md)에서 해당 워치 프레임을 선택하고 현재 SwiftUI 화면과 대조한다.

## Verification Map

작업 폴더는 `runtaeho_app/watchos/`이며 Xcode의 Swift compiler·SDK·대상을 사용한다. 실행 명령은 기존 README가 소유한다.

| 대상 | 명령·조건 원본 | 검증 범위 |
| --- | --- | --- |
| 독립 빌드·프로필 | [README — Build and open](../README.md#build-and-open) / [프로필 확인 스크립트](../Tests/verify-built-profile.py) | scheme·SDK·산출물 Info.plist와 공통 프로필 대응 |
| Foundation 호스트 프로그램 | [README — Host regressions](../README.md#host-regressions) | RunCheckpoint·WatchDisplaySettings 타입의 동작 |
| 폰 참조·버전 연계 | [README — Companion integration](../README.md#companion-integration) | 폰 프로젝트 참조·버전 설정 |

## 생성물과 환경 경로

Xcode DerivedData와 빌드 산출물은 해당 도구가 소유한다. 앱·프로젝트·권한 소스는 위 Module Map, 서명·배포와 폰 참조 조건은 원본 README와 폰 배포 가이드를 따른다.
