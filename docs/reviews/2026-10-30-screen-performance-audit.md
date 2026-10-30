# 휴대폰 화면별 성능·안정성 감사

작성일: 2026-10-30 (Asia/Seoul). 휴대폰 기준 커밋 `d4697a0`, 연결 API 확인에 사용한 백엔드 기준 커밋 `c91cc5f`.

재검증: R02는 아래 실제 UI 도달성 재평가에 따라 **확정 P1에서 제외**했다. 사용자가 진행을 승인한 R01/R03/R04/R44의 수정과 가능한 자동 검증을 완료했다. 작업 경계와 결과는 [실행 계획](/Users/hongtaeho/running/.codex/pave/plans/2026-10-30-p1-stability-fixes.md)에서 관리한다. 최초 발견의 설명·줄 번호는 감사 기준 커밋을 기준으로 하며, 현재 동작은 다음 수정 결과를 따른다.

독립 오탐 재검토 완료: 미수정 40개 ID 묶음을 subagent 6개(Sol/high 5개, Terra/high 1개)가 다시 검토했다. **P2 유지 21개 / P3 13개 / 보류 5개 / 전체 철회 1개**로 정정한다. R13b 포인트 공유 오표시, R29b 구매·착장 조회의 중복 결함 주장, R10의 prevData 누락 일반화도 철회했다. R02/R12/R16/R20/R33은 보류하며 R25는 결함 목록에서 제외한다. 세부 조건·반증·격리 진단 및 실기기 미검증의 구분은 [최종 재검토 보고서](/Users/hongtaeho/running/runtaeho_app/docs/reviews/2026-10-30-audit-false-positive-review.md)를 따른다. 이 판정 후 우선 다섯 P2를 수정했으며 나머지 미수정 P2는 16개다. 아래 원인 기록에는 완료 항목을 표시했다.

## P1 수정 결과

| 항목 | 근본 원인과 수정 | 회귀 및 확인 한계 |
| --- | --- | --- |
| R01 | 네트워크 실패 후에만 보존하던 구조를 바꿨다. [OfflineStorageService.withPendingUpload](/Users/hongtaeho/running/runtaeho_app/src/features/running/services/OfflineStorageService.ts:166)가 최종 summary+GPS를 단일 영속 항목으로 **리그 조회·기존 재전송 대기 전** 저장한다. 다음 세그먼트 큐 저장이 끝나야 원본을 제거하며, 현재 세션의 live claim으로 온라인/복구 전송 중복을 막는다. | 실제 storage owner로 저장/ACK 지연, snapshot 저장 실패, handoff 실패+화면 파괴 후 GPS 복구, 기존 replay/league 지연, 이전 generation claim을 검증했다. 실제 기기 프로세스 종료·디스크 내구성은 미실행. |
| R03 | [UserAccountService.hardDelete](/Users/hongtaeho/running/running/src/main/kotlin/com/example/running/domain/user/service/UserAccountService.kt:51)가 같은 트랜잭션에서 사용자 행과 소유 계정을 잠금 조회한 뒤 활성 로그인 수단을 최소 하나 보존한다. 마지막 수단은 HTTP 400/`LAST_ACCOUNT_CANNOT_DISCONNECT`로 거부한다. JVM 잠금·재시도·스키마 변경은 없다. | 마지막 계정/비활성 대안/오래된 두 클라이언트/타인 소유권/HTTP 계약을 검증했다. 실제 RR DB 동시성 회귀는 DML-only로 준비했으나 테스트 DB가 없어 **SKIP**. |
| R04 | [AuthProvider](/Users/hongtaeho/running/runtaeho_app/src/providers/AuthProvider.tsx:26)가 토큰 문자열 교체가 아닌 로그인·약관 접근·사용자/세션·bootstrap/OTA의 의미 있는 변화를 기준으로 이동한다. 화면별 예외나 지연은 추가하지 않았다. | 실제 provider/useAuth/store/JWT로 편집 중 토큰 갱신의 경로 보존과 필수 로그인·약관·로그아웃·준비 전환을 검증했다. 같은 조건의 화면명/사용자 ID 반복 테스트는 제거했다. 네이티브 stack 검증은 미실행. |
| R44 | [avatarQueries](/Users/hongtaeho/running/runtaeho_app/src/features/avatar/services/avatarQueries.ts:198)에서 mutation 호출 순간 세션을 캡처하고 실제 API 요청·성공 cache/store·point/equip 후속 작업에 유지한다. VM도 같은 작업 세션만 반영하고, 이전 작업의 finally가 새 작업을 해제하지 않는다. | 실제 hook/QueryClient/service/API interceptor와 제어된 transport로 이전 사용자·동일 사용자 새 generation, 지연 equip/purchase/point, dispatch 이전 세션 교체를 검증했다. 이미 서버에 도착한 구매를 취소한다고 보장하지 않는다. |

원인 신뢰도는 네 항목 모두 **코드와 회귀 실행으로 확인(proven)**했다. R03의 실제 SQL 동시성 및 기기 동작까지 실행했다는 의미는 아니다. 네 구현 subagent의 결과를 부모가 재검증했고, 독립 QA에서 발견한 R01의 추가 저장 공백도 수정 후 재검토했다.

최종 검증(수정 후):

- `/Users/hongtaeho/running/runtaeho_app`: `npm run test:unit -- --silent` **118 suites / 700 tests PASS**; `npx tsc --noEmit` PASS; `npm run lint` PASS.
- `/Users/hongtaeho/running/running`: `./gradlew test --console=plain` BUILD SUCCESSFUL. XML **238 PASS / 38 SKIP / 실패 0**, 총 44 suites/276 tests. SKIP은 기존 DB 37건과 새 계정 동시성 DB 1건이다.
- 새 테스트는 결함이 있는 원본에서 행동 assertion으로 실패하는 것을 확인했다. 같은 분기 반복·내부 호출 순서·타이밍 관측만 고정하는 테스트는 제외했다. 기존 성공·부분 실패 동작도 함께 통과했다.
- 제품 코드 이외의 durable 변경: [앱 코드 가이드](/Users/hongtaeho/running/runtaeho_app/docs/07-codebase-guide.md), [백엔드 코드 가이드](/Users/hongtaeho/running/running/docs/07-codebase-guide.md)에 저장·세션·서버 invariant 소유자와 회귀 명령을 반영했다. 이 감사 보고서가 증상·원인·수정·검증·잔여 위험의 기록이다.
- 운영 요청·DB schema/DDL·배포·커밋은 수행하지 않았다. 인증·데이터 무결성 경계 변경이므로 **병합 전 사람 검토가 필요**하다. 핵심 검토 대상은 최종 snapshot의 ACK 이행, 서버의 사용자별 삭제 잠금, 아바타 작업 세션의 전 구간 유지다.

## 우선 P2 수정 결과

사용자가 우선순위 다섯 항목 R07/R24/R05/R15/R14의 구현을 승인했다. [실행 계획](/Users/hongtaeho/running/.codex/pave/plans/2026-10-30-priority-p2-stability-fixes.md)에 소유자·검증·잔여 범위를 기록했다. 아래 최초 원인 설명은 이력이며 현재 동작은 이 수정 결과를 따른다.

| 항목 | 기존 소유자에서의 수정 | 실제 회귀와 확인 한계 |
| --- | --- | --- |
| R07 | [PedometerService](/Users/hongtaeho/running/runtaeho_app/src/features/running/services/sensors/PedometerService.ts)가 RunningClock의 활동 시간과 구독별 걸음 누적을 소유한다. 수동/자동 정지에서 구독을 제거하고 재개 때 이전 걸음 + 새 구독 걸음을 유지한다. lifecycle 종료 의도 시 센서도 중지한다. | 실제 lifecycle/service로 정지 중 걸음 제외, stale callback, 반복 전환/paused end, GPS 종료 대기 중 걸음 제외를 최종 저장값으로 확인. 원본 RED 후 최종 360걸음/180spm/120초 및 paused end 270걸음/180spm/90초 GREEN. 실센서 미실행. |
| R24 | [알림 설정](/Users/hongtaeho/running/runtaeho_app/src/features/notifications/views/NotificationViews.tsx)은 PUT 성공 응답 반영 직전 정확한 configuration query를 취소하고 세션을 재확인한다. 저장 중 시작한 조회까지 포함한다. | 실제 화면/service/query에서 지연 GET 이후에도 다음 PUT이 이전 선택을 유지. 원본 및 저장 시작 때만 취소하는 대안 모두 payload RED 후 GREEN. 실패 재시도·새 세션 보호 확인. 실등록/서버 mutation 미실행. |
| R05 | [AuthProvider](/Users/hongtaeho/running/runtaeho_app/src/providers/AuthProvider.tsx)는 인증/사용자 복원을 준비 조건으로 사용하고 replay를 별도로 실행한다. 이전 bootstrap의 완료는 현재 준비 상태에 쓰지 않으며 새 로그인은 이미 commit된 사용자 상태를 사용한다. | pending/failed replay여도 인증 복원 후 route 진입, hydrate 대기와 stale/unmount 보호, 중복 사용자 조회/replay 방지 및 기존 R04를 검증. 실제 queue·세션/영속 owner는 변경하지 않았다. native 미실행. |
| R14 | [leagueCheckStore](/Users/hongtaeho/running/runtaeho_app/src/stores/league/leagueCheckStore.ts)가 시작 세션과 작업 identity를 API/완료에 유지하며 superseded 작업은 새 조회에서 교체한다. | 이전 성공/401·동일 사용자 새 generation·reset 대체 작업·middleware 대기를 실제 hook/service/API 경계에서 확인. 계정 상태 전환은 제어된 store, transport는 대역이다. |
| R15 | [공유 결과 hook](/Users/hongtaeho/running/runtaeho_app/src/features/league/hooks/useLeagueResultNavigation.ts)이 현재 focus/Stopped를 검사하고 store에서 원자적으로 가져온 실제 결과를 한 번 소비한다. 두 화면의 개별 결과 소비를 공통 소유자로 옮겼다. | 실제 두 화면에서 숨은 탭·활동 중 결과 보존, focus 복귀/정지 시 한 번 push 확인. 실제 native stack은 미실행. |

부모 통합 검증: `npm run test:unit -- --silent` **122 suites / 726 tests PASS**, `npx tsc --noEmit` PASS, `npm run lint` PASS, 모두 exit 0. 기존 P1을 포함하며, 위 네 구현 영역은 별도 QA 리뷰에서도 통과했다. 새 영구 회귀는 실제 값·화면·payload·세션 경계를 보호하는 26건이며 관련 기존 fixture를 조정했다. 백엔드·배포·운영 데이터는 변경하지 않았다. 앱 코드 가이드에 검증된 소유권과 좁은 검증 명령을 반영했다.

## 범위와 판정 기준

- Expo Router의 화면 라우트 **33개 전체**와 내정보에서 여는 포인트·신발 목록·보관함·수정 모달을 검토했다. 공지사항은 알림함과 같은 구현, health-import는 권한 설정으로 가는 redirect라 해당 화면 담당이 함께 확인했다.
- 화면별 subagent가 entry → view → hook/viewmodel/store → query/service → 직접 연결 API를 추적했다. 주 에이전트가 공통 인증·캐시·시작 흐름과 주요 발견의 원본을 다시 확인했다.
- 사용자 지시에 따라 Luna 배정은 중단했으며, 해당 내정보 분석은 **Terra/high로 독립 재검토한 결과만 반영**했다.
- 최초 감사 단계에서는 앱·서버의 제품 코드를 수정하지 않았다. 이후 승인된 네 P1 수정 결과는 위에 기록했다. watchOS/Wear OS 화면, 운영 서버 요청, 실제 계정 변경, 배포는 수행하지 않았다.
- P1: 기록 복구 불가, 계정 연결/접근 보존, 광범위한 작업 흐름 중단 때문에 먼저 수정할 항목. P2: 조건이 맞으면 발생하는 상태·행동·복구 결함. P3: 영향이 제한적인 불필요한 작업·안내·경계 조건.
- **코드로 확인한 결함**, **격리 하네스로 실행한 결과**, **실기기에서 측정해야 할 성능 후보**를 구분한다. P1/P2도 실제 사용자 발생률을 측정했다는 뜻은 아니다.

## 모델·추론 배정

| 복잡도와 대상 | 모델 / 추론 | 배정 근거 |
| --- | --- | --- |
| 러닝 시작·측정·일시정지·종료 | GPT-6 Astra / high | 센서·시계·백그라운드 저장·오프라인 큐·서버 수락의 연결 |
| 통계, 메인 리그, 아바타, 공유 편집, 로그인, 운동 연동 | GPT-6.1 Sol / high | 여러 쿼리·캐시·네이티브 작업·화면 수명 간 경합 |
| 기록 상세, 내정보, 설정, 권한, 계정 연결, 약관 동의, 포인트, 신발 목록, 리그 결과 두 화면 | GPT-6.1 Terra / high | 상태/세션/쓰기·확인 단계와 오류 복구 검토 |
| 프로필 수정, 신발 추가·수정·보관함, 알림 세 화면, 문의 두 화면, 약관 목록·상세, 시작 화면 | GPT-6.1 Terra / medium | 범위가 한정된 입력·조회·비동기 완료 흐름 |
| 문의 완료, FAQ, 고객센터, 앱 정보·버전·라이선스 | GPT-6.1 Terra / low | 정적 콘텐츠·단순 파라미터·외부 앱 및 경로 연결 |

## 먼저 수정할 항목

### R01 · P1 · 종료 성공 후 경로 업로드 전 영속화 공백

[useRunningLifecycle.ts:319](/Users/hongtaeho/running/runtaeho_app/src/features/running/viewmodels/hooks/useRunningLifecycle.ts:319)에서 종료 응답 성공 후 세그먼트를 비동기로 전송한다. 로컬 재전송 큐에는 **HTTP 실패가 반환된 뒤에만** 저장하며, 같은 함수 363–365행에서 백그라운드 원본은 바로 지운다.

세그먼트 요청이 미완료인 동안 프로세스가 종료되면 요약 기록은 서버에 남지만 GPS/세그먼트를 복원할 원본이 없다. 실패 후 로컬 큐 저장까지 실패하는 경우도 완료 상태를 유지한다. 단순 화면 언마운트만으로 요청이 유실된다고 단정하지 않으며, 핵심 발생 조건은 프로세스 종료 또는 로컬 보존 실패다.

**최소 수정:** 기존 사용자 소유 오프라인 큐에 세그먼트를 먼저 영속화하고, 업로드 성공을 확인한 뒤 제거한다. 원본 정리와 완료 가능 여부도 영속화 결과에 연결한다. **검증:** end 성공/items 미완료 → 서비스 재시작 시 복원; 업로드 실패·로컬 저장 실패에서도 복구 가능 상태 유지. 기존 offlinePersistence 테스트는 주로 end 실패 경로를 검증한다.

### R02 · 조건부 위험 · 계정 연결 OAuth가 시작 계정에 고정되지 않음

[useAccountConnection.ts:94](/Users/hongtaeho/running/runtaeho_app/src/features/user/hooks/useAccountConnection.ts:94)의 Google 및 153–163행의 Apple 흐름은 OAuth 완료 후 시작 세션 검증 없이 연결 API를 호출한다. URL 구성에서 userId는 사용되지 않으며, [서버 연결 controller:30](/Users/hongtaeho/running/running/src/main/kotlin/com/example/running/domain/user/controller/UserAccountController.kt:30)는 요청 토큰 소유자를 연결 대상으로 삼는다.

세션이 교체된 뒤 이전 OAuth 성공 결과가 돌아온다는 순서를 강제로 만들면 잘못된 사용자에 연결되는 코드 경로는 존재한다. 그러나 이것만으로 실사용에서 발생 가능한 P1이라고 확정할 수 없다.

**실제 UI 재검증:** AccountConnectionView의 헤더 뒤로가기는 연결 중 비활성화된다. 로그아웃은 별도 설정 화면에 있고 공개 계정 전환 전용 경로는 없다. 네이티브 인증 코드가 반환되면 같은 continuation에서 즉시 연결 POST를 호출한다. Google sign-out/저장소 정리가 진행 중이면 새 로그인도 waitForLogout으로 대기한다. 따라서 “인증을 기다리다가 일반 뒤로가기→로그아웃→B 로그인”이라는 원래 예시는 현재 UI에서 입증되지 않았다. 앱을 강제 종료하면 이전 JS continuation도 사라지므로 이 예시의 증거가 아니다.

자동 세션 만료로 로그인 화면에 이동하는 경로, 시스템 back/스와이프가 헤더와 독립인 경로는 있다. 다만 네이티브 OAuth가 활성인 채 B 로그인을 끝내고, 그 뒤 원래 OAuth가 성공으로 돌아올 수 있는지는 실기기 검증이 필요하다. **판정: 기존 확정 P1은 철회하고 조건부 세션 소유권 위험으로 보류한다.** 이번 네 건의 수정 범위에 포함하지 않는다.

후속 검증이 필요하다면 Google/Apple별로 OAuth 창 유지 중 refresh 만료를 유도하고, 실제 화면 조작·B 로그인·기존 callback의 순서를 관측한다. 발생 경로가 재현되면 시작 snapshot을 API 요청과 후속 처리까지 유지하는 수정으로 대응한다.

### R03 · P1 · 마지막 로그인 수단 보존을 서버가 보장하지 않음

[useAccountConnection.ts:58](/Users/hongtaeho/running/runtaeho_app/src/features/user/hooks/useAccountConnection.ts:58)의 계정 수 검사는 로컬 스냅샷이다. [UserAccountService.kt:48](/Users/hongtaeho/running/running/src/main/kotlin/com/example/running/domain/user/service/UserAccountService.kt:48)는 소유권을 확인하지만 마지막 계정 검사나 사용자 단위 동시 삭제 제어 없이 삭제한다.

두 기기가 계정 두 개를 읽고 각기 다른 계정을 해제하면 모두 삭제되어 이후 로그인할 수단을 잃을 수 있다. **최소 수정:** 기존 “최소 한 개 유지” 규칙을 서버 트랜잭션에서 원자적으로 강제한다. 클라이언트 검사는 안내 역할로 유지한다. **검증:** 오래된 화면 상태에서 마지막 계정 삭제 거부; 같은 사용자 두 계정 동시 삭제 후 최소 한 개 보존. DB 동시성 검증이 필요하며 이번에는 실행하지 않았다.

### R04 · P1 · 토큰 갱신이 현재 화면을 러닝 탭으로 교체

[AuthProvider.tsx:139](/Users/hongtaeho/running/runtaeho_app/src/providers/AuthProvider.tsx:139)는 로그인 상태이면 항상 러닝 탭으로 replace하고, 165행 effect 의존성에는 accessToken이 있다. [TokenRefreshInterceptor.ts:94](/Users/hongtaeho/running/runtaeho_app/src/shared/services/TokenRefreshInterceptor.ts:94)는 정상 silent refresh에도 accessToken을 갱신한다.

따라서 기록 상세·편집·설정 등에서 발생한 정상 토큰 갱신도 현재 경로를 교체한다. 입력/선택 흐름을 중단하고 화면 재진입·재조회를 유발한다. **격리 실행:** 실제 AuthProvider 소스를 transpile하고 인증 상태·약관·업데이트 완료를 유지한 채 토큰만 바꾸자 `/(tabs)/running` replace가 호출됐다. 네이티브 네비게이션을 실행한 테스트는 아니다.

**최소 수정:** 로그인/로그아웃·약관 상태 전환에 필요한 라우팅과 같은 세션의 토큰 회전을 구분한다. **검증:** 프로필 편집/상세 화면에서 같은 세션 토큰 교체 시 경로·입력 보존; 실제 로그인·로그아웃·약관 동의 전환은 계속 이동.

### R44 · P1 · 이전 계정의 아바타 응답이 새 계정의 착장·소유 상태를 변경

[useAvatarViewModel.ts:347](/Users/hongtaeho/running/runtaeho_app/src/features/avatar/viewmodels/useAvatarViewModel.ts:347)는 equip 응답 후 시작 세션을 확인하지 않고 전역 착장·색상을 쓴다. [avatarQueries.ts:144](/Users/hongtaeho/running/runtaeho_app/src/features/avatar/services/avatarQueries.ts:144)의 구매 성공은 현재 item 캐시에서 구매한 ID를 owned로 바꾸고 포인트 조회·후속 equip도 계속한다. 캐시 key는 사용자별로 분리되어 있지 않다.

A의 요청을 보류하고 B로 로그인한 뒤 A 응답이 완료되면 B의 새 store/cache가 대상이 된다. **추가 격리 실행:** 실제 VM callback에서 current user/avatar가 2인 상태에 A의 item 11과 색상이 기록됨을 확인했다. 실제 MutationCache/QueryClient에서 mutation 시작→clear→B 캐시 생성→A 응답 완료 순서로 B의 해당 item이 `isOwned:true`가 되는 것도 재현했다. 서버 호출은 mock이며 서버 변경은 하지 않았다.

**최소 수정:** 기존 auth snapshot을 구매/equip mutation 변수와 API config에 전달하고, 모든 성공 cache/store 쓰기와 후속 point/equip 전후에 확인한다. **검증:** A 구매·equip 지연→B 로그인→A 완료에서 B의 착장·색상·포인트·소유 캐시가 유지되고 A 작업의 후속 요청이 발생하지 않아야 한다.

## 상태·조회·화면 수명 결함

| ID / 우선순위 | 근거와 발생 조건 | 최소 수정과 필요한 회귀 검증 |
| --- | --- | --- |
| R05 / 수정 완료(당시 P2) 시작 지연 | 수정 전: 유효한 저장 세션·대기 큐가 있을 때 replay 완료까지 navigation-ready가 대기함. 실제 초기화 callback에서 replay 보류/완료에 따른 readiness 확인. 150초는 실측이 아닌 요청별 timeout을 가정한 예시. 주요 근거: [AuthProvider](/Users/hongtaeho/running/runtaeho_app/src/providers/AuthProvider.tsx:65). | 인증/사용자 준비와 세션 replay 분리 및 stale/unmount 보호 회귀 완료. 상세는 위 [P2 수정 결과](#우선-p2-수정-결과) 참조. |
| R06 / P3 폰트 준비 경계 | 폰트 로딩과 route 이동 준비가 분리된 것은 사실. iOS RN의 시스템 폰트 fallback과 이미 시작한 font load의 지속을 확인. 영구 로딩·크래시·P2 기능 장애를 주장하지 않고 서체 준비·시각 일관성으로 한정. 주요 근거: [폰트 등록](/Users/hongtaeho/running/runtaeho_app/app/index.tsx:18), [설치 RN fallback](/Users/hongtaeho/running/runtaeho_app/node_modules/react-native/React/Views/RCTFont.mm:445). | 서체 준비·시각 일관성이 필요한 경로를 확인한 뒤 폰트 소유자를 정리. 시스템 fallback을 기능 장애로 분류하거나 영구 로딩을 전제로 테스트하지 않는다. |
| R07 / 수정 완료(당시 P2) 일시정지 케이던스 | 수정 전: pause의 UI/clock guard가 센서 누적을 멈추지 않음. 실제 PedometerService에서 활동 60초/휴식 60초/활동 60초, 총 360걸음이 cadence 120으로 계산됨. 실제 센서는 미실행. 주요 근거: [pause](/Users/hongtaeho/running/runtaeho_app/src/features/running/viewmodels/hooks/useRunningLifecycle.ts:194), [센서 계산](/Users/hongtaeho/running/runtaeho_app/src/features/running/services/sensors/PedometerService.ts:173). | 활동 시간·구독별 걸음 누적 및 수동/자동 정지·종료 저장값 회귀 완료. 상세는 위 [P2 수정 결과](#우선-p2-수정-결과) 참조. |
| R08 / P2 완료 후 늦은 공유 | 경로 2점 미만으로 server fallback을 기다리는 완료 화면에서 공유→완료→늦은 응답이면 editor가 다시 열림. 실제 handler 실행으로 순서 확인. 교차 계정 가정이 필요 없으며 정상 로컬 경로가 충분하면 비동기 창이 짧음. 주요 근거: [공유 handler](/Users/hongtaeho/running/runtaeho_app/src/features/running/views/running-finished.tsx:134). | 같은 세션에서 경로 fallback 대기→완료→늦은 응답의 화면/작업 수명을 보호. 공유 화면이 뒤늦게 열리지 않는 실제 handler 회귀를 선정한다. |
| R09 / P3 10m 경계 불일치 | 9.5–9.99m의 원거리/반올림 판정 불일치는 확인. 서버는 미종료 기록의 신발 변경을 거부하고 리그 거리는 저장 합계로 재계산한다. 잘못된 거리 가산·서버 기록 손상이 아니라 불필요한 후처리/실패 큐 가능성. 주요 근거: [경계 분기](/Users/hongtaeho/running/runtaeho_app/src/features/running/viewmodels/hooks/useRunningLifecycle.ts:286), [서버 신발 검사](/Users/hongtaeho/running/running/src/main/kotlin/com/example/running/domain/running/service/RunningRecordService.kt:118). | 짧은 기록 판정 기준을 일치시킬 경우 9.6m와 10m의 저장/후처리 경계를 검증. 서버 거리 가산 손상을 전제로 수정하지 않는다. |
| R10 / P2 통계 차트 갱신 누락 | 실제 memo 컴포넌트에서 늦은 nextData 응답 미반영과 과거 빈 기간→다른 기간 필터의 fetching 완료 후 과거 날짜 유지 재현. **prevData는 실제 caller가 comparisonData에도 같은 값을 전달하므로 누락 일반화 철회**. 단순 빈 기간 스와이프만으로 날짜 오류가 재현된다는 설명도 제외. 주요 근거: [memo](/Users/hongtaeho/running/runtaeho_app/src/features/statistics/views/components/SwipeablePeriodChart.tsx:477), [동일 값 전달](/Users/hongtaeho/running/runtaeho_app/src/features/statistics/views/StatisticsView.tsx:170). | 사용 props와 실제 caller 관계를 반영해 memo/cache 갱신을 수정. 늦은 next 응답 및 빈 과거 월→주 필터 변경 후 날짜·차트의 실제 렌더를 검증한다. |
| R11 / P2 + 일부 P3 통계 refresh 소유권 | 인접 캐시 미갱신은 Health sync skip/fail 및 5분 fresh 조건에서 P2. 실제 VM/query로 current만 1000→2000, prev/next 1000 유지 확인. 정상 import는 통계 전체를 invalidate하므로 모든 refresh의 문제는 아님. import 완료 뒤 추가 refresh는 P3 중복 단계이며 실트래픽 비용 미측정. 주요 근거: [refresh owner](/Users/hongtaeho/running/runtaeho_app/src/features/statistics/viewmodels/StatisticViewModel.ts:229), [import 갱신](/Users/hongtaeho/running/runtaeho_app/src/features/healthImport/services/healthImportService.ts:172). | 한 계층이 current/adjacent summary와 list 갱신을 소유. import 성공·skip·실패 별 완료 요청 횟수, 이전 기간 수정 후 비교/스와이프 값 갱신 검증. 실제 네트워크 횟수는 이번에 측정하지 않았다. |
| R12 / 보류 이전 세션의 기록 캐시 재생성 | 늦은 mutation이 clear 뒤 A의 detail cache를 재생성하는 메커니즘은 확인. **실제 PATCH service는 이미 시작 세션을 캡처**하며 저장 modal도 닫기를 막는다. 자동 만료 뒤 늦은 응답 경로는 가능성이 있으나 B 로그인 시점/노출 미입증. 전역 recordId 때문에 B 일반 목록이 A 키를 열지 않고 새 로그인도 다시 clear함. 주요 근거: [callback](/Users/hongtaeho/running/runtaeho_app/src/features/running/services/runningQueries.ts:100), [API snapshot](/Users/hongtaeho/running/runtaeho_app/src/features/running/services/runningService.ts:126), [modal 닫기 guard](/Users/hongtaeho/running/runtaeho_app/src/features/running/views/RunningRecordDetailView.tsx:142). | 현재 확정 수정 대상에서 제외. native 자동 만료·재로그인·늦은 응답 순서와 B의 실제 노출 근거를 먼저 확보한다. 기존 API snapshot 보호를 중복 구현하지 않는다. |
| R13 / a P2 / b 철회 기록 상세 공유 경로 누락 | a: detail만 먼저 도착한 상태에서 공유하면 빈 경로 snapshot으로 editor 진입하며 이후 items 성공이 연결되지 않음. b: earnedPoints 계산은 존재하지만 **현재 StatType/초기 요소/토글에는 points가 없어 UI·export에 포인트를 렌더하지 않음**. “미지급 포인트 공유 오표시”는 오탐. 주요 근거: [경로 snapshot](/Users/hongtaeho/running/runtaeho_app/src/features/running/views/RunningRecordDetailView.tsx:108), [StatType](/Users/hongtaeho/running/runtaeho_app/src/features/share/models/types.ts:70), [실제 렌더 배열](/Users/hongtaeho/running/runtaeho_app/src/features/share/views/components/SharePreviewCanvas.tsx:400). | 경로 조회 준비/실패와 실제 경로 없음 구분. 지연 items 뒤 공유한 editor에 경로가 반영되는 최소 회귀를 선정. 현재 UI에 없는 포인트 표시 수정은 진행하지 않는다. |
| R14 / 수정 완료(당시 P2) 늦은 리그 검사 | 수정 전: 리그 검사 대기 중 일반 프로필/설정으로 이동해 세션 전환 가능. 실제 hook/service/API 경계에서 B 완료 후 A 성공이 B를 덮고, A 401이 SessionSupersededError로 차단돼도 hook catch가 B를 null로 지움. 요청 interceptor 가드가 없다는 주장은 하지 않음. 주요 근거: [성공·실패 쓰기](/Users/hongtaeho/running/runtaeho_app/src/features/league/hooks/useLeagueCheck.ts:48). | 세션/작업 identity, API snapshot, reset 없는 새 세션 검사 회귀 완료. 상세는 위 [P2 수정 결과](#우선-p2-수정-결과) 참조. |
| R15 / 수정 완료(당시 P2) 비활성 탭의 결과 소비 | 수정 전: 실제 두 화면을 마운트한 실행에서 stopped pending 한 건→push 2회, running→League만 push 1회 확인. **league를 한 번 방문해야** 두 소비자가 존재함. “각자의 ref”는 부정확하며 League만 ref, Running은 stopped guard 사용. native 화면 스택은 미실행. 주요 근거: [League 소비](/Users/hongtaeho/running/runtaeho_app/src/features/league/views/LeagueView.tsx:45), [Running 소비](/Users/hongtaeho/running/runtaeho_app/src/features/running/views/RunningView.tsx:103). | 공유 focus/Stopped 검사와 실제 결과의 원자적 소비 회귀 완료. 상세는 위 [P2 수정 결과](#우선-p2-수정-결과) 참조. |
| R16 / 보류 / b P2 제외 리그 결과 경로 복구 | a: 두 handler 호출과 설치 stack reducer의 동일 PUSH 중복은 확인했지만 전환 중 실제 연속 터치가 두 번 전달되는지 미검증. b: confirm 실패 뒤 이탈은 사실이나 서버는 checked 표시만 변경하며 unchecked 재조회로 다시 진입 가능. 보상 손실·영구 재시도 불가 주장은 철회. 실패 시 유지 여부는 P3 UX 선택. 주요 근거: [결과 버튼](/Users/hongtaeho/running/runtaeho_app/src/features/league/views/LeagueResultView.tsx:39), [확인 실패](/Users/hongtaeho/running/runtaeho_app/src/features/league/views/LeagueResultDetailView.tsx:33), [서버 confirm](/Users/hongtaeho/running/running/src/main/kotlin/com/example/running/domain/league/service/LeagueService.kt:189). | 중복 진입은 실기기 연속 탭으로 도달성을 확인한 뒤 판단한다. confirm 실패 후 화면 유지 여부는 UX 선택이며 보상/결과 손상 복구로 구현하지 않는다. |
| R17 / P2 동기화 후 표시 잔액 갱신 누락 | profile과 point modal은 **같은 totalPoint store**를 사용함. 문제는 import/watch가 query만 invalidate하여 이 store를 갱신하지 않는 것. 이후 5분 초과 background 복귀·로그인·폰 기록 완료·구매가 복구하므로 영구 stale은 아님. 주요 근거: [잔액 store](/Users/hongtaeho/running/runtaeho_app/src/features/point/viewmodels/PointViewModel.ts:10), [import](/Users/hongtaeho/running/runtaeho_app/src/features/healthImport/services/healthImportService.ts:187), [복구 owner](/Users/hongtaeho/running/runtaeho_app/src/providers/AppStateProvider.tsx:151). | import/watch 완료의 기존 잔액 갱신 owner를 연결하거나 표시 원본 통일을 검토. 포인트 지급 후 내정보·모달 모두 새 잔액을 표시하는지 검증한다. |
| R18 / P2 프로필·연결 계정 갱신 실패 은폐 | 변경 성공 뒤 재조회만 실패하면 refresh 함수가 resolve하여 오래된 UI가 남음. 실제 callback에서 확인. **서버 변경 성공 안내 자체는 거짓이 아니며**, 재동기화 실패가 화면에 전달되지 않는 문제로 한정. refresh의 기존 세션 보호는 존재. 주요 근거: [refresh catch](/Users/hongtaeho/running/runtaeho_app/src/features/auth/hooks/useAuth.ts:176). | 기존 refresh owner가 재동기화 실패를 호출자에게 전달하고 부분 성공 복구를 제공. 서버 변경 성공 + 후속 GET 실패에서 오래된 표시와 안내를 검증한다. |
| R19 / a P2 / b P3 이전 탈퇴 응답이 새 세션 초기화 | a: DELETE pending 중 취소가 활성이고 같은 Settings에서 logout→B login 가능. timeout 내 A 성공이 오면 현재 logout 호출. UI 경로는 소스, B 상태 전환은 격리 진단. b: 삭제 성공/로컬 정리 실패를 탈퇴 실패로 안내하지만 auth는 정리 전 revoke되어 있으므로 인증 유지 사고는 아님. 주요 근거: [탈퇴 후속 처리](/Users/hongtaeho/running/runtaeho_app/src/features/user/views/SettingsView.tsx:99), [진행 중 취소](/Users/hongtaeho/running/runtaeho_app/src/features/user/views/SettingsView.tsx:285). | 탈퇴 시작 세션의 후속 logout 소유권을 보호. 진행 중 취소→로그아웃→B 로그인→늦은 DELETE 순서와 서버 성공/로컬 정리 실패 안내를 구분해 검증한다. |
| R20 / 보류 권한 작업의 세션 경계 | OS 권한 대기 뒤 새 snapshot으로 sync 시작하는 구조는 존재. 하지만 권한창 유지 중 B 로그인 완료 경로 미입증. PATCH 대기 중 B 전환 대안은 service의 응답·invalidate 후 세션 검사에 차단됨. sync 시작 이후에는 이미 같은 세션을 유지함. 주요 근거: [권한 대기](/Users/hongtaeho/running/runtaeho_app/src/features/user/views/PermissionSettingsView.tsx:102), [기존 검사](/Users/hongtaeho/running/runtaeho_app/src/features/healthImport/services/healthImportService.ts:355). | 권한 native UI를 유지한 채 세션 전환이 실제 가능한지 먼저 확인. 기존 setHealthImportEnabled/sync의 세션 검사를 누락된 것으로 취급하지 않는다. |
| R21 / P3 권한 조회·수정 경합 | 실제 callbacks에서 old refresh가 true 저장 후 false 표시로 덮는 현상과 configuration 오류가 OS 상태까지 false로 표시하는 현상 확인. **서버 설정을 되돌리지는 않고**, 후속 refresh가 정상 표시로 복구할 수 있음. 주요 근거: [조회/기본값](/Users/hongtaeho/running/runtaeho_app/src/features/user/views/PermissionSettingsView.tsx:54). | 서버 조회 오류와 OS 권한 표시를 구분하고 늦은 표시 쓰기를 조정. 서버 설정 손상을 전제로 수정하지 않으며 후속 refresh 복구도 보존한다. |
| R22 / P2 Garmin 해제 상태 역전 | 실제 화면/서비스/query 실행에서 GET→DELETE DISCONNECTING→늦은 GET CONNECTED, 버튼 활성·poll=false 재현. 서버 해제 취소나 import 재개는 아님. DELETE가 즉시 DISCONNECTED일 수 있고 이후 focus/foreground는 UI 복구 가능. 주요 근거: [해제 결과 반영](/Users/hongtaeho/running/runtaeho_app/src/features/activity-connection/views/ActivityConnectionView.tsx:95). | 정확한 query의 진행 조회와 mutation 응답 반영을 조정. DISCONNECTING→늦은 GET에서 버튼·polling 상태를 보호하되 서버 해제 취소로 표현하지 않는다. |
| R23 / P2 알림 새로고침 취소 | 실제 화면 onEndReached가 캐시 목록의 refresh를 취소하고 old+older만 남기는 것 재현. 캐시·다음 페이지·겹치는 refresh가 필요하며 최초 로딩 전체의 문제는 아님. 서버 알림 삭제가 아니라 현재 목록 갱신 누락. 주요 근거: [페이지 요청](/Users/hongtaeho/running/runtaeho_app/src/features/notifications/views/NotificationViews.tsx:53). | 전체 `isFetching`을 고려해 요청 조정. 실제 InfiniteQueryObserver 하네스에서 새 목록 refresh 중 nextPage를 시작하자 최종 결과가 새 항목 없는 old+older가 됨을 확인. |
| R24 / 수정 완료(당시 P2) 알림 설정 저장 역전 | 수정 전: 실제 화면 AppState GET→리그 off 저장→옛 GET→다른 toggle에서 두 번째 실제 PUT payload가 league=true를 재전송. 동일 세션에서 발생하며 saving은 조회를 막지 않음. 사후 push registration도 cache를 복구하지 않음. 주요 근거: [전체 설정 저장](/Users/hongtaeho/running/runtaeho_app/src/features/notifications/views/NotificationViews.tsx:130). | 성공 cache 반영 직전 진행 조회 취소 및 후속 payload/세션 회귀 완료. 상세는 위 [P2 수정 결과](#우선-p2-수정-결과) 참조. |
| R25 / 철회 약관 교차 계정 저장 주장 철회 | snapshot→PATCH 사이 긴 await가 없고 interceptor는 캡처 이후 세션을 검사함. interceptor 캡처 전 B 로그인 완료를 강제 state 변경으로 만드는 것만으로 실제 사용자 결함을 세면 안 됨. 방어 강화 제안과 결함을 구분. 주요 근거: [동기 제출 구간](/Users/hongtaeho/running/runtaeho_app/src/features/terms/hooks/useTermsAgreement.ts:37), [요청 검사](/Users/hongtaeho/running/runtaeho_app/src/services/api/client.ts:87). | 현재 결함·수정 대상으로 세지 않는다. 새 실제 도달성 근거 없이 snapshot 미전달만을 이유로 방어 코드를 추가하지 않는다. |
| R26 / P2 화면 이탈 후 완료 콜백 | add/edit modal은 이탈→재개방 시 이전 완료가 새 창을 닫는 경로. profile은 떠난 뒤 성공 alert 확인이 현재 stack을 back. inquiry는 현재 route replace. 알림 detail은 실제 unmount 뒤 mutationFn이 push하는 것 재현. 알림 성공의 세션 guard는 이미 존재해 같은 세션의 화면 수명 문제로 한정. 주요 근거: [add](/Users/hongtaeho/running/runtaeho_app/src/features/shoes/views/components/AddShoeForm.tsx:66), [profile](/Users/hongtaeho/running/runtaeho_app/src/features/user/views/ProfileEditView.tsx:113), [inquiry](/Users/hongtaeho/running/runtaeho_app/src/features/support/views/InquiryView.tsx:46), [알림](/Users/hongtaeho/running/runtaeho_app/src/features/notifications/views/NotificationViews.tsx:82). | 각 기존 작업 owner에서 화면/모달 인스턴스·요청·세션의 생존을 확인하거나 진행 중 이탈을 일관되게 제어. 화면별 deferred 성공/실패, 닫고 다른 대상 재진입 검증. API 취소만으로 이미 처리된 서버 변경을 취소했다고 안내해서는 안 된다. |

## Unity·공유 및 기타 복구 문제

| ID / 우선순위 | 근거와 영향 | 최소 수정 / 회귀 검증 |
| --- | --- | --- |
| R27 / P3 cold 종료 후 readiness 폴링 | Unity 최초 500ms 시작 전 running→profile, avatar도 시작 전 close하는 좁은 cold 경로에서 viewport/native view가 생기기 전 polling이 남음. 실제 JS 조합에서 unmount 후 260ms/3 polls 확인. native view가 이미 있으면 생성 자체가 시작하고 warm host는 유지되므로 정상 warm 경로에는 일반화 불가. 취소는 fire-and-forget이라 화면 무한 대기는 아님. 주요 근거: [cancel](/Users/hongtaeho/running/runtaeho_app/src/features/avatar/viewmodels/useAvatarViewModel.ts:453), [running gate](/Users/hongtaeho/running/runtaeho_app/src/features/running/views/RunningView.tsx:359), [host gate](/Users/hongtaeho/running/runtaeho_app/src/features/unity/components/GlobalUnityHost.tsx:123). | 좁은 cold 경로에서 불필요한 복원/대기를 기존 Unity owner가 정리하도록 검토. warm host의 정상 완료를 보존하고 종료 뒤 polling 수명을 확인한다. |
| R28 / P2 아바타 미리보기 실패 고정 | 초기 bootstrap 성공 뒤 변경 적용이 실제 실패하면 applied/current hash가 달라지고 같은 선택의 재시도가 없음. 실제 VM/Preview/bootstrap/service로 확인. timeout 뒤 늦게 적용되는 경우까지 항상 잘못 보인다고 주장하지 않음. 주요 근거: [Preview ref](/Users/hongtaeho/running/runtaeho_app/src/features/avatar/views/components/AvatarPreview.tsx:79). | 성공한 적용만 완료로 기록하고 실제 실패의 재시도를 연결. 초기 성공→변경 실패→재시도 성공으로 최신 선택을 검증하며 늦은 성공도 구분한다. |
| R29 / a P3 / b 철회 하단 취소의 중복 Unity 복원 | a: 실제 하단 취소의 같은 복원 native 적용 2회 확인, 비용 미측정. b: 목록 GET 두 단계는 `미보유/미착용→보유/미착용→보유/착용`의 서로 다른 상태이며 착장 실패에도 소유권을 보존해야 함. 요청 두 번만으로 불필요한 중복 결함이라 할 수 없음. 주요 근거: [취소 두 owner](/Users/hongtaeho/running/runtaeho_app/src/features/avatar/viewmodels/useAvatarViewModel.ts:446), [구매 갱신](/Users/hongtaeho/running/runtaeho_app/src/features/avatar/services/avatarQueries.ts:195). | Unity 복원 전송 owner만 정리할 후보. 실제 Preview 통합 취소에서 중복 적용을 확인한다. 구매/equip의 서로 다른 상태 조회를 단순 제거하지 않는다. FPS·비용은 미측정이다. |
| R30 / P2 공유 닫기 중복 | restore pending 중 닫기 재입력이 가능. 실제 Screen/restore owner에서 복원 1회·back 2회, 설치 StackRouter에서도 detail 아래까지 두 번 pop 확인. native touch는 미실행이나 R16과 달리 첫 입력이 즉시 화면을 전환하지 않는 대기 창이 있음. 주요 근거: [전체 close](/Users/hongtaeho/running/runtaeho_app/src/features/share/views/ShareEditorScreen.tsx:88). | 전체 close 작업 coalesce/lock. restore 보류 중 두 번 닫기→back 한 번 검증. |
| R31 / P2 사진 준비와 캡처 경합 | 실제 composed hook에서 photo 변환 pending인데 loading/capturing=false이고 native photo 전송 전 capture를 완료할 수 있음. RN canvas는 투명 overlay라 별도 사진 렌더가 이를 보완하지 않음. geometry 대기와 실제 사진 준비는 별개. 실제 native 캡처는 미실행. 주요 근거: [선택](/Users/hongtaeho/running/runtaeho_app/src/features/share/viewmodels/useShareEditor.ts:105), [변환](/Users/hongtaeho/running/runtaeho_app/src/features/share/viewmodels/useShareUnitySync.ts:150). | 사진 변환 및 실제 Unity 적용 준비를 capture와 연결. geometry 확인만으로 대체하지 않고 변환 pending 중 export가 먼저 진행하지 않는지 검증한다. |
| R32 / P2 마지막 포즈 프레임 유실 | 실제 composed hook에서 8ms 간격 .2→.9 후 UI .9/native .2 확인. slider release·export에는 최종값 전송 경로가 없음. 위치/크기/회전 제스처의 종료 commit은 별개라 반증이 되지 않음. 기기 gesture/frame은 미실행. 주요 근거: [throttle](/Users/hongtaeho/running/runtaeho_app/src/features/share/viewmodels/useShareUnitySync.ts:415), [slider](/Users/hongtaeho/running/runtaeho_app/src/features/share/views/components/PoseSelector.tsx:165). | 마지막 값 flush 또는 gesture-end commit. 8ms 간격 두 값 후 release에서 최종 값 전송 검증. |
| R33 / 보류·측정 후보 공유 캐시 파일 수명·용량 검토 | 최종 결과의 앱 차원 삭제는 없지만 Android cacheDir/ShareExport와 iOS ImageManipulator cache이며 OS 관리 대상. 중간 파일 정리는 존재. 실제 파일 수·bytes·OS 회수 시점 미측정이므로 디스크 누수·용량 장애 확정 표현 제외. 주요 근거: [Android cache](/Users/hongtaeho/running/runtaeho_app/android/app/src/main/java/com/hongtaeho/app/unity/RNUnityBridgeModule.kt:613), [iOS 결과](/Users/hongtaeho/running/runtaeho_app/src/features/share/services/shareService.ts:192). | 실제 반복 native export의 파일 수·bytes·OS 회수를 측정한 뒤 수명 정책 필요성을 판단한다. 측정 전 디스크 누수나 용량 장애를 확정하지 않는다. |
| R34 / a P2 / b P3 오류를 빈 목록으로 표시 | 초기 오류가 빈 목록으로 표시되는 것은 유지. 과거 페이지 오류는 기존 데이터·hasNext가 남고 스크롤 재시도/전체 pull refresh가 있어 복구 불가나 데이터 손실로 확대하지 않음. 페이지 실패 안내 부족은 P3. 주요 근거: [point 오류 미표시](/Users/hongtaeho/running/runtaeho_app/src/features/point/views/PointHistoryView.tsx:76), [refresh 복구](/Users/hongtaeho/running/runtaeho_app/src/features/point/viewmodels/PointViewModel.ts:53). | 초기 빈 성공·초기 오류를 구분하고 재시도 제공. 페이지 오류는 기존 데이터와 refresh 복구를 보존하며 P3 안내 개선으로 분리한다. |
| R35 / a P2 / b P3 신발 작업 결과·동시 처리 | a: 실제 PATCH 전 성공 문구 및 실패 후 유지. b: 보관함 반복 요청/옛 완료의 새 확인창 닫힘은 사실이나 원래 캡처된 ID만 처리함. 새 대상의 삭제를 자동 승인하거나 잘못 삭제하는 주장은 제외. 주요 근거: [보관 문구](/Users/hongtaeho/running/runtaeho_app/src/features/shoes/views/ShoesListView.tsx:438), [복원](/Users/hongtaeho/running/runtaeho_app/src/features/shoes/views/StoredShoesListView.tsx:60). | archive는 성공 후 문구와 실패 안내를 수정할 후보. 보관함은 원래 ID 처리/재시도를 보존하며 중복 요청·확인창 수명만 검토하고 다른 ID 오삭제로 확대하지 않는다. |
| R36 / P3 신발 입력·실패 복구 | 생성 가능한 0 목표를 수정에서 빈 값으로 바꾸는 것은 사실이나 0 재입력으로 복구 가능. null 신규 생성은 UI 근거가 없어 제외. 수정/목록 추가의 실패 안내는 부족하지만 입력·재시도는 유지되며 route 추가에는 이미 오류 안내 있음. 주요 근거: [수정 초기화](/Users/hongtaeho/running/runtaeho_app/src/features/shoes/views/EditShoeView.tsx:38), [entry별 오류](/Users/hongtaeho/running/runtaeho_app/src/features/shoes/views/components/AddShoeForm.tsx:75). | 0 목표의 초기화와 입력 의미를 맞추고 entry별 실패 안내를 검토. 입력과 기존 재시도를 보존하며 0 재입력으로 복구 가능한 범위를 반영한다. |
| R37 / P3 Google 취소 분류 | 설치 SDK 취소 translator→실제 strategy로 cancelled/data:null이 NO_AUTH_CODE가 되는 것 확인. 잘못된 실패 안내이며 실제 로그인 차단·데이터 손실은 아님. 주요 근거: [strategy](/Users/hongtaeho/running/runtaeho_app/src/features/auth/strategies/GoogleAuthStrategy.ts:54). | code 검사 전 cancelled 처리. 취소 시 alert/backend 호출 없음, 성공 응답 code 누락은 오류 유지. 로그인과 계정 연결 공통. |
| R38 / P3 OTA 중복 검사·오류 종류 | a: 최초 검사 완료 뒤 lastCheckedAt null→foreground 재검사 확인. 최초 검사 중 OAuth 버튼은 overlay에 막히므로 그때 OAuth로 중첩한다는 예시는 제외. b: transport/HTTP 오류가 모두 다른 AuthenticationError로 감싸져 분류 정보와 localized 분기를 놓침. 주요 근거: [최초 검사](/Users/hongtaeho/running/runtaeho_app/src/features/updates/hooks/useAutoUpdate.ts:131), [오류 축약](/Users/hongtaeho/running/runtaeho_app/src/features/auth/services/AuthenticationService.ts:66). | 최초 검사 완료 직후 foreground의 재검사 owner를 정리할 후보. 최초 overlay 중 OAuth 동시 실행은 재현으로 쓰지 않는다. 인증 오류 종류와 언어 안내를 보존한다. |
| R39 / P3 리그 숨은 작업·애니메이션 중단 | 순위 상승 시 1100ms parent 정리와 1200+200ms child sequence 불일치 확인. 미참가 탭 방문 후 interval이 blur에도 남음. 최초 미방문 탭·순위 유지/하락에는 일반화하지 않으며 배터리/FPS 피해는 미측정. 주요 근거: [parent timer](/Users/hongtaeho/running/runtaeho_app/src/features/league/views/LeagueView.tsx:83), [interval](/Users/hongtaeho/running/runtaeho_app/src/features/league/views/components/LeagueNotJoinedView.tsx:231). | 완료 callback으로 rank 정리, focus에 interval/animation 연결. parent-child 실구현 timing 및 blur 후 추가 애니메이션 없음 검증. 배터리/프레임 시간 미측정. |
| R40 / P3 알림의 실패 처리 | a: malformed ID retry POST는 서버가 거부, 권한 우회 아님. b: PUT 성공 뒤 등록 실패를 저장 실패로 안내. c: cached 설정이 남아도 background 조회 실패 후 Switch가 사라짐. 각각 실제 화면/query 진단으로 확인, 데이터 삭제나 서버 설정 초기화는 아님. 주요 근거: [retry](/Users/hongtaeho/running/runtaeho_app/src/features/notifications/views/NotificationViews.tsx:94), [부분 성공](/Users/hongtaeho/running/runtaeho_app/src/features/notifications/views/NotificationViews.tsx:134), [cached 오류](/Users/hongtaeho/running/runtaeho_app/src/features/notifications/views/NotificationViews.tsx:145). | invalid id retry 제거/함수 검증, 서버 저장과 등록 오류 분리, 최초 실패와 background 실패 구분. NaN/0/음수 retry 미전송; PUT 성공/등록 reject; 기존 데이터+refetch reject 검증. |
| R41 / P3·일부 조건부 문의 완료·입력 한계 | a: 설치 router의 현재 index REPLACE로 고객센터가 중복되는 것은 확인, 추가 back 정도. b: 입력/DB 254 길이 차이는 사실이나 초과 실패 여부는 배포 schema·DB strict mode·email validator에 의존. TEXT 용량 실패는 확정 주장 제외. 주요 근거: [완료 복귀](/Users/hongtaeho/running/runtaeho_app/src/features/support/views/DoneView.tsx:44), [서버 계약](/Users/hongtaeho/running/running/src/main/kotlin/com/example/running/domain/inquiry/controller/dto/InquiryRequest.kt:10). | 완료 후 원래 고객센터로 복귀하는 스택을 검증. 입력 상한은 배포 schema·strict mode·email validator를 확인한 뒤 계약과 맞춘다. TEXT 용량 실패는 확정하지 않는다. |
| R42 / P3 약관·외부 앱 오류 복구 | HTTP 오류 전용 상태가 없지만 network 오류 안내·닫고 재진입 복구는 존재. HTTP error body 표시는 서버/platform 의존이며 기기 미재현. mailto rejection 미처리는 사실이고 대안 문의 경로는 있음. 기능 장애·복구 불가로 확대하지 않음. 주요 근거: [WebView](/Users/hongtaeho/running/runtaeho_app/src/features/terms/views/TermsDetailView.tsx:60), [mailto](/Users/hongtaeho/running/runtaeho_app/src/features/support/views/CustomerServiceView.tsx:35). | HTTP 실패·mailto rejection 안내 개선 후보. 기존 network 오류 및 닫고 재진입 복구를 보존하며 실제 HTTP 화면은 기기에서 확인한다. |
| R43 / P3·성능 측정 후보 신발 API의 무제한 조회 | size를 무시한 전체 반환은 사실. 실제 보유량·응답 크기·지연은 미측정이므로 P2 사용자 성능 피해는 미입증. 현재 21번째 누락은 아님. 서버 limit만 고치면 선택 consumers의 pagination 누락이 드러나므로 함께 조정해야 함. 주요 근거: [repository](/Users/hongtaeho/running/running/src/main/kotlin/com/example/running/domain/shoe/repository/ShoeRepository.kt:28). | 먼저 실제 보유량·응답 크기·지연 측정. size 계약을 바로잡는다면 서버 상한과 running-finished/detail/list/stored consumers의 후속 페이지를 함께 검증한다. |

## 화면별 커버리지와 요청 지도

공통 API prefix는 `/api/v1`이며 아래에는 생략했다. query의 mount/focus 요청은 라이브러리가 진행 요청을 합칠 수 있으므로 선언이 두 곳 있다는 이유만으로 중복 요청이라 판정하지 않았다.

| 화면/경로 | 직접 흐름과 검토 범위 | 결과 |
| --- | --- | --- |
| 시작 `/` | index 폰트, API setup, AuthProvider, token/profile 복원, offline replay, navigation-ready | R04–R06 |
| 로그인 `/auth/login` | Google/Apple native→OAuth GET→users/me, OTA overlay/retry/cancel | R37–R38; stale login attempt와 동시 탭 방어 확인 |
| 약관 동의 `/auth/terms-agreement` | GET terms→PATCH users/agreement→token refresh→completeLogin, 상세 modal | R25 철회, R42 |
| 러닝 `/running` 탭 | 시작 POST running; 활동/정지는 정기 HTTP 없음; end POST→items POST; 완료 shoe/league/share 연결, 센서·시계·구독 | R01, R07–R09, R43 |
| 통계 `/statistics` 탭 | current/prev/next running/statistics GET; running cursor 목록; Health sync/import; chart/filter/record cards | R10–R11; list windowing은 측정 후보 |
| 리그 `/league` 탭 | current GET, unchecked result GET, ranking/not-joined/carousel, focus refresh | R14–R15, R39 |
| 내정보 `/profile` 탭 | 직접 API 없음; userStore 잔액/프로필, point/shoe modal, 광고 표시/focus | R17; 처음 닫힌 RN Modal은 자식 미마운트 확인 |
| 기록 상세 `/running-record-detail` | detail/items GET, shoes GET, shoe PATCH, 지도·split·share entry | R12–R13, R43 |
| 공유 `/share/editor` | 서버 HTTP 없음; store→Unity/이미지 처리→native export→system share, preview/export canvas | R30–R33 |
| 아바타 `/user/avatar` | items cursor GET→purchase POST→point GET→equip PUT; preview/Unity/grid/picker/modal | R27–R29, R44 |
| 리그 결과 `/league/result` | route JSON validation, 결과 표시→상세 push; 직접 HTTP 없음 | R16; invalid DTO redirect 확인 |
| 리그 결과 상세 `/league/result-detail` | confirm POST, query invalidation, character/ranking, back 제어 | R16; timer cleanup 확인 |
| 포인트 모달 | recent histories GET(size100)→older cursor GET(size30); 필터·중복 제거·잔액 표시 | R17, R34; 커서 분리/ID dedup 확인 |
| 신발 목록 모달 | shoes cursor GET→archive/delete PATCH, main POST; child modal 연결 | R34–R35, R43 |
| 신발 추가 `/shoes/add-shoe` 및 목록 modal | AddShoeForm→POST shoes→invalidate; route/list 성공 callback | R26, R36; submittingRef 중복 탭 방어 확인 |
| 신발 수정 모달 | local form→PATCH shoes/id→부모 refresh/close | R26, R36 |
| 신발 보관함 모달 | 같은 shoes query의 비활성 필터→restore/delete PATCH | R34–R35, R43 |
| 프로필 수정 `/user/profile-edit` | image picker→multipart PATCH users/me→GET users/me→store | R18, R26 |
| 설정 `/user/settings` | language configuration PATCH, logout/reset, DELETE users/me, 광고 consent | R19; language 세션/응답 보호 확인 |
| 연결 계정 `/user/account-connection` | native OAuth→POST users/accounts; DELETE users/accounts/id→user refresh | R03, R18, R37; R02는 실제 UI 도달성 미입증으로 보류 |
| 운동 연동 `/user/activity-connection` | 현재 provider는 Garmin만 등록. GET/DELETE garmin/connection, authorization POST와 브라우저 복귀 검증 | R22; session/generation key 및 OAuth return 검증 확인 |
| 권한 `/user/permission-settings` | configuration GET/PATCH, OS 권한 조회/대화상자→health sync, AppState refresh | R20–R21 |
| 이전 연동 `/user/health-import` | `/user/permission-settings` redirect | 권한 담당이 alias 확인; 별도 중복 실행 로직 없음 |
| 알림함 `/user/notifications` | user/language/type query key, cursor GET notifications, read 표시와 상세 이동 | R23 |
| 공지사항 `/user/notice` | 같은 inbox view에 NOTICE 필터 | R23; 같은 구현 담당이 filter 경로 확인 |
| 알림 상세 `/user/notification` | POST notification/open→inbox invalidate; league result GET→push | R26, R40 |
| 알림 설정 `/user/notification-settings` | configuration GET/PUT, AppState refresh, 등록 시 추가 configuration/timezone/device 요청 | R24, R40 |
| 고객센터 `/user/customer-service` | 문의/FAQ/공지 push와 mailto; 직접 서버 요청 없음 | R42 |
| 일반 문의 `/user/inquiry` | validation→POST inquiries→trackingNo→완료 replace | R26, R41 |
| 오류 문의 `/user/error-inquiry` | POST inquiries(ERROR), 선택 동의 진단 정보; 완료 replace | R26, R41; 진단 기본 off/allowlist 확인 |
| 문의 완료 `/user/inquiry-done` | trackingNo 표시, 고객센터 복귀; HTTP 없음 | R41 |
| FAQ `/user/faq` | 정적 내용, 권한/문의 navigation; HTTP/자체 state 없음 | 확정 결함 없음; 기존 FAQScreen 테스트가 두 이동 검증 |
| 약관 목록 `/user/terms-list` | mount GET terms, 오류/재시도, link/title 전달 | 확정 결함 없음; 전용 테스트 공백 |
| 약관 상세 `/user/terms-detail` | WebView URL/title, loading/error; onboarding modal도 검토 | R42 |
| 앱 정보 `/user/app-info` | version 표시, mailto/clipboard/licenses navigation; HTTP 없음 | Android mailto 가시성 후보는 아래 분리 |
| 앱 버전 `/user/app-version` | Expo/native 버전 표시만 수행; HTTP 없음 | 확정 결함 없음; 내부 push caller는 검색되지 않음 |
| 라이선스 `/user/licenses` | 정적 목록/펼치기/외부 링크; HTTP 없음 | 성능·안정성 결함 없음; 표시 버전 정합성은 범위 밖 참고 |

## 확정 결함과 구분한 항목

1. **“신발 21번째부터 누락”은 현재 서버 기준 확정에서 제외했다.** 앱은 첫 페이지 이후 로딩을 선택 화면에 연결하지 않지만, 현재 서버가 size를 무시하고 전부 반환한다. R43 수정 시 running-finished/detail/list/stored consumers를 함께 맞춰야 한다. `useGetAllShoes` wrapper가 있어도 현재 ShoeController에는 `/shoes/all` GET이 없으므로 이를 그대로 연결하는 수정도 해법으로 확정하지 않는다.
2. 통계/아바타의 ScrollView 안 비스크롤 FlatList는 viewport/windowing·자동 페이지 연쇄 측정 대상이다. 코드 구조는 확인했지만 실제 마운트 카드 수·요청 수·heap/FPS를 측정하지 않아 “전부 렌더/전부 로드”라 단정하지 않는다.
3. GPS 샘플의 여러 이벤트에서 누적 배열을 복사하고 background 저장에서 전체 JSON을 다시 쓰는 비용은 경로 길이에 비례한다. 장시간 러닝의 기기 CPU·GC·배터리·샘플 지연을 측정한 후 바꿔야 한다.
4. [AppInfoView:59](/Users/hongtaeho/running/runtaeho_app/src/features/settings/views/AppInfoView.tsx:59)의 `canOpenURL(mailto)`와 Android manifest의 https-only package queries 조합은 Android 11+ 메일 앱 가시성 재현 후보다. 기기에서 설치/미설치 메일 앱을 검증하기 전 확정 사용자 장애로 세지 않았다.
5. 라이선스 화면의 하드코딩 버전은 lockfile과 일부 다르지만 성능·안정성 우선 수정에 포함하지 않았다. 예: Zustand 화면 5.0.8, lock 5.0.10. 관련 코드는 변경하지 않았다.
6. 아바타의 시스템 back이 header cancel을 우회하는 경로만으로 캐릭터가 영구히 잘못 남는다고 단정하지 않았다. 다음 화면의 자체 sync/recovery가 있기 때문이다.
7. React Query mount+focus 선언만으로 초기 HTTP 두 번을 주장하지 않았다. 대기 요청 dedup을 고려했고, R11/R38의 완료 단계나 R29a의 Unity owner처럼 실제 반복을 확인한 범위만 남겼다. R29b의 구매·착장 조회는 다른 서버 상태를 반영하므로 중복 결함 주장을 철회했다.

## 최초 감사에서 실행한 검증

작업 폴더: `/Users/hongtaeho/running/runtaeho_app`. 로컬 JS/Jest 환경이며 iOS/Android native runtime은 실행하지 않았다.

| 검증 | 관측 결과 | 해석과 한계 |
| --- | --- | --- |
| `npm run test:unit -- --runTestsByPath src/features/league/__tests__/leagueQueries.test.tsx src/features/league/__tests__/useLeagueViewModel.test.tsx src/features/statistics/__tests__/StatisticViewModel.refresh.test.tsx src/features/statistics/__tests__/useRunningRecordList.test.tsx src/features/running/__tests__/RunningRecordDetailView.test.tsx src/features/avatar/__tests__/useAvatarViewModel.test.tsx src/providers/__tests__/AppStateProvider.lifecycle.test.tsx` | 7 suites / 51 tests PASS | 초기 관련 동작 baseline |
| `npm run test:unit -- --silent` | **116 suites / 683 tests PASS**, 13.263초 | 현재 전체 unit baseline. Jest는 프로젝트 script의 `--forceExit`로 종료한다. 새 발견이 검증되었다는 뜻은 아님 |
| `npx tsc --noEmit` | exit 0, 진단 없음 | 현재 타입 검사 PASS |
| 실제 AuthProvider 소스의 격리 effect 실행 | 같은 인증 세션에서 accessToken 변경 후 러닝 replace 발생 | root source 실행, React/nav mocks 사용; R04 |
| 실제 running shoe mutation 성공 callback + 설치 QueryClient | clear 후 `{id:42, owner:'A'}` detail 캐시 재생성 | 응답 완료 이후 작업 경계 재현; R12 |
| 설치 QueryClient의 늦은 GET/쓰기 순서 | DISCONNECTING 뒤 늦은 CONNECTED가 최종 cache | 화면 native 미실행; R22/R24의 경쟁 메커니즘 |
| 설치 InfiniteQueryObserver의 refetch/nextPage 순서 | requests `[refresh,10]`, 최종 rows `[old,older]`; 갱신의 new 누락 | abort signal을 사용하는 지연 query 하네스; R23 |
| 실제 chart comparator 소스 격리 실행 (subagent) | nextData-only 변경 및 fetching 완료 변화에 equality=true | R10 |
| 실제 PedometerService 소스+mock sensor/time (subagent) | 60초 활동/60초 휴식/60초 활동에서 180 대신 120 | R07; 실제 센서/기기 측정 아님 |
| 실제 avatar VM callback 및 MutationCache/QueryClient (subagent 재검토) | B 세션의 착장에 A item/색상 기록, B 캐시 item을 owned로 변경 | R44; source transpile, API/hooks 경계 mock, 서버 변경 없음 |

최초 감사에서 실행하지 않은 검증: 린트, native/release 빌드, 실기기 장시간 러닝/프로세스 종료, 실제 OAuth/권한/공유, release FPS·heap·배터리·실제 API 트래픽 측정, 백엔드 DB 동시성 테스트. 최초 분석에서는 영구 테스트를 추가하지 않았으며, 이후 승인된 수정의 새 회귀와 린트 등 최종 검증은 위 수정 결과에 기록했다.

기존 테스트는 viewmodel·native child·focus를 mock하는 곳이 많다. 다음 구현 검증은 파일 수/커버리지 증가보다 **실제 parent-child 조합, 지연 응답, 세션 교체, 닫고 재진입, refetch와 mutation 경합**을 우선한다.

## 후속 구현 단위 제안

아래는 독립 재검토 및 우선 다섯 P2 수정 후 남은 후보 분류다. 승인된 R01/R03/R04/R44와 R07/R24/R05/R15/R14는 위 결과대로 수정·검증했다.

1. **미수정 계정·화면 수명:** R19a 및 R08/R26/R30. 요청을 시작한 세션/화면/작업의 후속 쓰기와 navigation을 검증한다.
2. **미수정 준비·상태 정합성:** R10/R11/R13a/R17/R18/R22/R23/R28/R31/R32. 실제 호출자와 기존 복구 owner를 포함한 최소 행동 회귀를 선정한다.
3. **기타 P2와 P3:** R34a/R35a의 초기 오류·성공 안내를 구분하고, P3는 사용자 영향과 비용에 따라 순서를 정한다. P2였던 R06/R21/R27/R36/R37/R43은 P3로 하향했다. R43의 성능 피해는 측정이 먼저다.
4. **보류·철회:** R02/R12/R16/R20은 실제 UI/기기 도달성, R33은 캐시 용량 근거를 먼저 확인한다. R25/R13b/R29b 및 R10의 prevData 누락 일반화는 현재 결함·수정 대상에서 제외한다.

최초 감사에서는 가이드/공유 소유자 경로가 대체로 일치해 canonical guide를 바꾸지 않았다. 이후 네 P1 및 우선 다섯 P2 수정에서 확인된 저장·세션·센서·조회/소비 소유권과 회귀 경로는 소유 코드 가이드에 반영했다. R02 등 조건부 가설은 이 보고서에만 남긴다.
