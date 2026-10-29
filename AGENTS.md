# RunTaeho 휴대폰 프로젝트 계약

## 적용 경로

이 계약의 폰용 구조·컨벤션은 `app/`, `src/`, `ios/`, `android/`, `scripts/` 및 폰 공통 자산에 적용한다. `watchos/`는 [watchOS 계약](watchos/AGENTS.md), `wearos/`는 [Wear OS 계약](wearos/AGENTS.md)으로 이어진다.

공통 작업 원칙은 [작업공간 계약](../AGENTS.md), 코드 탐색은 [휴대폰 코드 가이드](docs/07-codebase-guide.md)를 따른다.

## 코드 구조와 소유권

- 앱 실행 진입은 `index.js`, 라우팅은 `app/`, 기능별 화면·모델·서비스·훅은 `src/features/`, 공통 UI·토큰은 `src/shared/`가 소유한다.
- 현재 가장 가까운 모듈의 구조와 명명 방식을 따른다. TypeScript 경로·엄격 옵션은 [runtaeho_app/tsconfig.json](tsconfig.json)이 소유한다.
- 인증 상태·세션 스냅샷은 `authStore`, 갱신 조정은 `TokenRefreshInterceptor`, 갱신 요청은 `SilentTokenRefreshService`, 인증 API 호출은 `apiClient`, 토큰 저장은 `src/utils/storage/index.ts`의 `tokenStorage`를 사용한다.
- 서버 상태는 기존 `queryClient`와 공통·기능별 query key 및 queries, 로컬·화면 상태는 해당 소유 store/hook 경로를 따른다.
- JS 오프라인·워치 재전송은 기존 `OfflineStorageService`와 세션 경계를 공유한다. Android 폰의 업로드 예약·깨움은 `WatchUploadScheduler`·`WatchUploadLedger`·`WatchSyncTaskService`가 소유한다.
- Android 폰·Wear OS 공통 저장/전송 소스는 `shared/watchsync-android/`, 공개 환경 식별자는 `scripts/app-profiles.json`이 소유한다.

## 화면과 네이티브 구성

폰 화면은 [디자인 원본](../docs/04-design-rules.md)과 현재 shared 컴포넌트·토큰을 따른다. Unity 어댑터와 네이티브 프로젝트의 빌드·배포 관계는 [배포 가이드](docs/deployment.md)를 기준으로 확인한다. 실제 npm 명령은 `package.json`을 따른다.

## Declared Verification Commands

작업 폴더는 `runtaeho_app/`이다. 명령·준비 조건은 [코드 가이드의 Verification Map](docs/07-codebase-guide.md#verification-map), npm 명령 정의는 [package.json](package.json)을 따른다.
