# 로컬 UI QA fixture

소셜 계정 없이 실제 네이티브 화면을 검사하기 위한 로컬 전용 진입점이다. 실제 인증·서버 저장·센서 정확도·스토어 빌드 검증을 대신하지 않는다.

```sh
EXPO_PUBLIC_UI_QA=1 npm start -- --localhost
# 부팅한 기기에 기존 npm run android / npm run ios로 설치·실행한다.
```

Metro의 `__DEV__`, 선택된 앱 manifest의 `extra.env=local`, `EXPO_PUBLIC_UI_QA=1`이 모두 필요하다. Metro virtual env에 이전 dotenv 값이 남는 경우가 있어 환경 선택은 `app.config.js`가 만든 manifest를 따른다. 배포 환경에서는 `/qa`가 로그인으로 돌아간다. 기존 앱 API client와 직접 axios 호출은 메모리 fixture adapter로 격리된다. 정의하지 않은 endpoint는 501로 실패하며 실제 서버로 전달하지 않는다. 기존 토큰 갱신 소유자도 QA 토큰을 로컬에서만 갱신한다. fixture 토큰은 정상 API 모드에서 일반 요청·fetch 갱신 모두 거부된다.

개발 클라이언트가 Metro에 연결된 후 `runtaeho-dev://qa?scenario=populated`를 연다. 기존 `completeLogin`을 사용해 합성 사용자로 로그인하며, 사용자·신발·기록·포인트·알림·리그·아바타 API 응답을 로컬에서 제공한다. 시나리오 진입마다 데이터를 초기화하므로 플랫폼끼리 영향을 주지 않는다. 제품 화면의 글자·간격·컴포넌트는 교체하지 않는다.

시나리오 초기 configuration의 서버 언어는 `ko`다. 언어를 바꾼 뒤 시나리오를 다시 초기화하면 한국어로 돌아올 수 있다. OS가 영어인 상태의 한국어 화면만으로 언어 미설정 사용자의 최초 fallback까지 검증했다고 판정하지 않는다.

`EXPO_PUBLIC_UI_QA=1 EXPO_PUBLIC_UI_QA_UPDATES=1 npm start -- --localhost`는 같은 local QA gate 아래에서 업데이트 확인 응답만 2초 지연한 뒤 업데이트 없음으로 완료한다. 기존 로그인 화면의 업데이트 바·useAutoUpdate·AuthProvider를 사용한다. 먼저 populated로 합성 로그인한 뒤 앱을 완전히 종료하고 일반 실행하면 중간 QA 라우트 없이 로그인 화면의 확인 바→러닝 전환을 녹화할 수 있다. 실제 OTA 다운로드·적용·재시작을 검증하는 옵션은 아니다. 종료 후 두 flag를 제거한다.

| scenario | 데이터와 제약 |
| --- | --- |
| populated | 기록·신발·알림·포인트·참여 중 리그 |
| empty | 빈 목록·0포인트·리그 미참여 |
| long | 긴 닉네임·신발명·알림 제목과 큰 잔액 |
| loading | 모든 fixture API에 1.8초 지연 |
| error | 각 비부트스트랩 GET의 첫 응답 503, 다음 요청 성공. React Query 자동 재시도가 오류를 곧 지울 수 있으므로 영상으로 확인 |
| terms | 약관 미동의 토큰. 약관 본문 링크는 about:blank이므로 실제 약관 WebView 검증은 불가 |
| league-result | 미확인 승급 결과 제공 |
| guest | 기존 logout을 거쳐 로그인 화면으로 이동 |

실행 예: Android는 `adb shell am start -a android.intent.action.VIEW -d 'runtaeho-dev://qa?scenario=empty' com.runtaeho.runtaeho.dev`, iOS는 `xcrun simctl openurl <UDID> 'runtaeho-dev://qa?scenario=empty'`.

Mac 잠금 여부만으로 iOS 시뮬레이터 QA를 중단하지 않는다. 데스크톱 CUA 입력과 Simulator API는 별도 경로다. 잠긴 Mac에서도 `simctl` 설치·실행·스크린샷과 Maestro/XCTest의 앱 탐색이 실제로 동작했다. 먼저 해당 명령의 결과를 확인하고, 데스크톱 조작이 실제 필요한 단계에서만 잠금 해제를 요청한다.

`populated` 로그인 뒤 `runtaeho-dev://qa-typography`는 같은 QA gate 아래에서 입력 배율을 검사한다. 제품과 같은 NativeTextInput/TextInput을 사용하며 controlled·uncontrolled·짧은/긴 placeholder·여러 줄·비밀번호·힌트 없는 빈 입력·Pretendard 한글/일본어와 줄 간격·고정 배율·1.3 상한을 제공한다. `Changes`와 `selection`은 controlled 입력의 변경 횟수와 커서 위치다. 저장 없이 중간에 커서를 놓고 Android 1→1.3→2→1 또는 iOS 기본→접근성 크기→기본으로 바꾼다. 글꼴 변경만으로 Changes가 늘지 않고, 해당 위치에서 다음 글자를 입력할 수 있어야 한다. 키보드·초안·현재 화면을 유지하고 글자와 입력칸 높이가 함께 커졌다 작아지는지, 같은 배율의 새 실행과 일치하는지 확인한다. 본문에 줄 추가·삭제도 검사한다. 기본 크기에서 확대한 경우와 큰 크기로 처음 실행한 뒤 축소한 경우를 모두 비교한다. 신발 추가·수정은 제목과 버튼 전체, 키보드가 열린 상태의 입력·버튼 스크롤 접근도 확인한다. iOS 긴 한 줄 안내문은 짧은 Hint와 같은 배율의 새 실행도 비교해 글꼴 갱신 실패와 native 크기 맞춤을 구분한다. 프로필은 fontScale>1.3에서 닫기·저장 행 아래 제목 전체 폭을 확보하고, 최대 두 줄 내 native 크기 맞춤과 시스템 줄바꿈을 사용한다. 기본 크기는 기존 한 행을 유지한다. 이 진입점의 영문 검사 라벨은 제품의 영문 번역 지원을 뜻하지 않는다.

홀수 ID 기록(101 등)은 공공 광장 좌표로 만든 합성 경로, 짝수 ID(102 등)는 경로 없음이다. 실제 GPS 수집·OAuth·Garmin·Health·푸시 수신·원격 이미지·광고 응답·OTA·서버 validation은 별도 검증 대상이다. 시스템 권한과 Unity는 실제 설치된 네이티브 모듈을 사용한다. 테스트 문의 응답은 `LOCAL-UI-QA-0001`이다. 앱 API adapter 외 native SDK의 네트워크 호출까지 차단하는 환경은 아니다.

기록 상세의 큰 글자→기본 복귀에서는 요약 카드가 기본 3열·2열로 돌아오고 칼로리가 오른쪽 화면 밖으로 밀리지 않는지 확인한다. 확대 상태의 한 열과 같은 배율의 새 실행도 비교한다. `StatsGrid`의 카드 너비는 row/column 전환에서 이전 축의 flex basis를 재사용하지 않도록 기본 0+grow, 확대 100%를 사용한다.

Garmin fixture는 `available:false`로 준비 중 화면만 제공하며 외부 인가 흐름은 제공하지 않는다. QA 중 이 필드 누락으로 동일한 비활성 화면이 표시됐고, 종료 후 응답 타입을 명시해 정리했다. 실제 서비스가 준비 중이라는 뜻은 아니다.

종료 전 `scenario=guest` 또는 설정의 로그아웃을 실행해 합성 세션을 지운 뒤 QA Metro를 종료한다. 일반 실행은 flag를 제거한 `npm start`와 앱 완전 종료 후 재실행이다. synthetic token이 남아 있으면 정상 API 요청을 차단하므로 로그아웃 후 재실행한다.

검증: `npm run test:unit -- --runTestsByPath src/qa/fixtures.test.ts`, `npx tsc --noEmit`, 변경 파일 ESLint. 실제 화면 QA 보고서에는 사용한 scenario와 작업 트리 상태를 기록한다.
