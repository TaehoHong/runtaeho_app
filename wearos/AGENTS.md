# RunTaeho Wear OS 프로젝트 계약

공통 원칙은 [작업공간 계약](../../AGENTS.md), 탐색은 [Wear OS 코드 가이드](docs/07-codebase-guide.md), 독립 개발 원본은 [README](README.md)를 따른다.

## 구조와 소유권

- `wearos/`는 독립 Gradle root이며 `app/`이 Kotlin/Java·Android Views 앱을 소유한다.
- 측정·Health Services와 foreground 실행은 `RunService`, 전송 이벤트는 `WatchDataService`, 화면은 `RunActivity` 및 표시·설정 클래스에서 찾는다.
- 저장·전송의 공통 소유자는 [shared/watchsync-android](../shared/watchsync-android/src/main/java/com/runtaeho/watchsync)다. Android 폰과 Wear OS가 같은 소스를 사용한다.
- 서버 전달은 폰의 인증·업로드 경로와 연결하며, 기록 소유자·세션 식별자와 정확한 확인 응답을 현재 계약에 맞춰 처리한다.
- 공개 프로필은 [runtaeho_app/scripts/app-profiles.json](../scripts/app-profiles.json), flavor·서명·공유 sourceSets는 [runtaeho_app/wearos/app/build.gradle](app/build.gradle)이 소유한다.
- 앱 식별자와 설치 서명 정합의 원본은 README의 Signing identity를 따른다.

## 디자인·지원 설정

화면은 [워치 디자인 원본](../../docs/04-design-rules.md)과 현재 Android Views 구현을 따른다. 지원 SDK·권한은 앱 Gradle과 manifest에서 확인한다.

## Declared Verification Commands

작업 폴더는 `runtaeho_app/wearos/`이다. JDK 17·Android SDK와 해당 variant의 서명 자산을 사용한다. 명령·입력 조건은 [코드 가이드의 Verification Map](docs/07-codebase-guide.md#verification-map)에서 원본 안내로 이어진다.
