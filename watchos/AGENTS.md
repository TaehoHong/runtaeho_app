# RunTaeho watchOS 프로젝트 계약

공통 원칙은 [작업공간 계약](../../AGENTS.md), 탐색은 [watchOS 코드 가이드](docs/07-codebase-guide.md), 독립 개발 원본은 [README](README.md)를 따른다.

## 구조와 소유권

- `RunTaehoWatch/`가 Swift/SwiftUI 앱·HealthKit·CoreLocation·CoreMotion·WatchConnectivity 구현을 소유한다.
- 측정·세션·기록 파일 저장/복구·전송은 `RunRecorder.swift`, 체크포인트 모델·완료 페이로드 검증은 `RunCheckpoint.swift`, 표시 설정은 `WatchDisplaySettings.swift`, 백그라운드 진입은 `WatchAppDelegate.swift`를 기준으로 찾는다.
- 원본 기록의 소유자·세션 식별자와 측정 값은 현재 기록 계약에 맞춰 보존한다. 표시 단위·화면 설정은 업로드 값과 구분한다.
- 폰으로의 전달 계약은 [동기화 원본](../src/features/watchSync/README.md), 서버 로그인·업로드는 폰의 기존 소유 경로로 연결한다.
- 독립 빌드 진입점은 `RunTaehoWatch.xcodeproj`다. 폰 내장 참조는 [폰 프로젝트](../ios/app.xcodeproj/project.pbxproj)가 소유한다.
- 공개 프로필은 [runtaeho_app/scripts/app-profiles.json](../scripts/app-profiles.json), 버전 연계는 [runtaeho_app/scripts/version.js](../scripts/version.js)와 원본 안내를 따른다.

## 디자인·지원 설정

화면은 [워치 디자인 원본](../../docs/04-design-rules.md)과 이 프로젝트의 SwiftUI 구현을 따른다. 지원 OS·앱 식별자·권한은 프로젝트 설정·Info.plist·entitlements를 기준으로 확인한다.

## Declared Verification Commands

작업 폴더는 `runtaeho_app/watchos/`이다. Xcode·해당 SDK와 빌드 대상을 사용한다. 명령과 검증 범위는 [코드 가이드의 Verification Map](docs/07-codebase-guide.md#verification-map)에서 원본 안내로 이어진다.
