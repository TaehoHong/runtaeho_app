# 상태·렌더·호출 및 비동기 경계 타이밍 감사

작성일: 2026-10-30 (Asia/Seoul). 최초 감사는 앱 HEAD `77512214dead56d54ef43df63df92752d0095c1b` 및 직전 R10/R26/R17/R19a 미커밋 수정을 포함한 소스의 읽기 전용 검토였다. 이후 사용자 승인으로 T01–T05를 수정했으며 결과는 아래에 기록한다. T06/T07과 R31은 구현에서 제외했다.

6개 subagent가 독립 경계를 검토했고 부모가 호출자·가드·복구 경로를 대조했다. 기존 R22/R23/R30/R32 등을 새 결함으로 중복 집계하지 않았으며 R31 사용자 보류를 유지한다. 아래 T01–T06 상세는 진단 당시 실제 소스의 제어된 실행에서 확인한 6개 묶음이고, T03은 기존 R17의 추가 경로다. T07은 소스상 native 복구 후보이며 기기 검증 전 확정 범위를 넓히지 않는다.

## 후속 구현·검증 결과

T01–T05는 각 담당 subagent가 기존 소유자에서 수정하고 별도 subagent가 독립 검토했다. 기존 수정은 보존했으며 타이머·강제 remount·재시도 증설로 문제를 숨기지 않았다.

| 항목 | 현재 상태·근본 수정 | 검증 근거 |
| --- | --- | --- |
| T01 | 수정·독립 QA 통과. 마지막 GPS source를 수거한 뒤 동기 segment refs를 최초 종료 시각으로 확정·저장한다. 수거 실패 시 source를 보존한다. | 실제 coordinator/GPS/segments/lifecycle/storage 조합의 [trackingCompletion](../../src/features/running/__tests__/useRunningLifecycle.trackingCompletion.test.tsx) 4건 RED→GREEN; 기존 종료·pause 회귀 포함 작성자 55건, 독립 QA 46건 PASS |
| T02 | 수정·독립 QA 통과. 두 store의 기존 자동 persist 읽기가 성공/오류로 끝난 뒤 bootstrap·로그인 쓰기를 시작한다. children/Stack은 유지한다. 오류 시 저장을 덮지 않고 로그인으로 수렴하며 새 OAuth의 메모리 토큰은 사용한다. 늦은 hydration은 logout 권한을 되살리지 않는다. | 실제 persist의 [persistence](../../src/providers/__tests__/AuthProvider.persistence.test.tsx) 8건과 기존 인증·라우팅 포함 5 suites/31건 PASS. 초기 disk true→false, 조기 route, logout 부활의 RED→GREEN |
| T03 | 수정·독립 QA 통과. point/profile 조회 시작·반영과 END 완료가 공통 revision을 사용한다. 경합한 END는 완료 후 서버 잔액을 재조회한다. 온라인/오프라인 공통 완료 처리와 후속 조회는 ACK·replay lock과 분리한다. | 실제 API adapter/query/store/큐의 [rewardedPointSync](../../src/features/point/__tests__/rewardedPointSync.test.tsx)에 6개 회귀 추가. 세 진단 1200→1300 및 END/GET 역전·조회 실패 ACK 보존 검증. 독립 QA 8 suites/107건 PASS |
| T04 | 수정·독립 QA 통과. timestamp 저장 연산을 직렬화하고 현재 cycle만 후속 작업을 수행한다. 최신 active 하나를 유지하며 미완료 장기 동기화 요구는 같은 세션의 최신 short cycle도 이어받는다. | [AppStateProvider.lifecycle](../../src/providers/__tests__/AppStateProvider.lifecycle.test.tsx) 12건 PASS. 독립 QA에서 long→short 취소 회귀를 추가 발견해 잔액 100 유지 RED→200 GREEN으로 보완. 저장 지연·오류·세션 변경·중복 active도 독립 확인 |
| T05 | 수정·독립 QA 통과. 기존 submitting 상태로 문의·신발 payload 입력과 진단 선택을 잠근다. 실패 시 초안을 유지하고 편집·재시도할 수 있다. 닫기·수명·캐시는 유지한다. | [Inquiry](../../src/features/support/__tests__/InquiryView.lifetime.test.tsx), [AddShoe](../../src/features/shoes/__tests__/AddShoeForm.test.tsx), [EditShoe](../../src/features/shoes/__tests__/EditShoeView.lifetime.test.tsx) 3 suites/16건 PASS; pending 입력 거부·실패 후 재편집·재시도 행동 확인 |
| T06/T07/R31 | 사용자 제외/보류 유지 | 이번 구현에서 해당 통계 시간 memo·native attach·Unity 캡처 계약을 변경하지 않음 |

통합 검증(`runtaeho_app/`): `npm run test:unit -- --silent` **129 suites/788 tests PASS**, exit 0, 18.167초. 기존 `RunningView.unityRecovery.test.tsx`의 Jest teardown 후 RN Timeout ReferenceError 진단은 여전히 출력되므로 열린 핸들/기기 안정성 검증으로 확대하지 않는다. 타입 통합에서 발견한 Zustand helper의 unknown 추론은 store별 generic과 정확한 테스트 tuple 타입으로 수정했으며 실행 동작은 유지했다. 수정 후 인증 31건과 부모의 `npx tsc --noEmit`, `npm run lint` 재실행은 모두 PASS다. 문서 링크·diff 검증도 통과했다.

후속 커밋 지시에서는 병행 알림 등록/Firebase 작업을 분리하고, 앞선 R10/R26/R17/R19a 및 T01–T05의 50개 파일만 선별했다. 같은 파일의 알림 상세 수명/코드 가이드 변경도 별도 설정·등록 변경과 분리했다. 실제 index의 임시 사본에서 전체 unit **129 suites/778 tests PASS**(27.542초), `npx tsc --noEmit`, `npm run lint`, staged diff 검증이 통과했다. 10개 테스트 차이는 별도 알림 작업을 제외한 결과다. 테스트 파일의 EOF 빈 줄 하나만 정리했으며 제품 동작 추가 변경은 없다.

검증 한계: 실기기 GPS/AppState·키보드·native 저장소/OAuth·Unity·실서버·프로세스 종료는 미실행이다. 수정된 인증·저장·공유 잔액 경계는 merge 전 사람 리뷰가 필요하다. 현재 소유권과 재사용할 검증 명령은 [휴대폰 코드 가이드](../07-codebase-guide.md)에 반영했다.

## 최초 감사의 검토 축

| 경계 | 결과 |
| --- | --- |
| store persist 복원 ↔ 인증 bootstrap | T02: 서로 다른 저장소의 완료 순서를 기다리지 않음 |
| 렌더·memo·derived state ↔ 외부 시간 | T06: 달력 경계가 memo 무효화 조건에 없음; 기존 R10 prop 비교 수정은 유지 |
| 같은 상태의 여러 writer | T03: 잔액 refresh끼리의 최신성 가드 밖에 user DTO/종료 응답 writer가 존재 |
| effect·focus·컴포넌트 수명 | 새 useScreenLifetime의 blur/refocus 무효화는 유효; 같은 화면 초안 변경은 T05 |
| 입력 snapshot ↔ 요청 완료 | T05: 제출 후 수정한 새 입력을 이전 요청 성공이 닫음 |
| GPS source 전환 ↔ 종료·세그먼트 확정 | T01: background handoff 전에 종료 snapshot을 확정 |
| 직렬 큐·영속화 ↔ 완료 후 조회 갱신 | T03: raw offline replay는 mutation 완료 처리 우회; 공용 replay lock 자체와 R01 영속화는 유지 |
| AppState 이벤트 ↔ 비동기 완료·저장 key 수명 | T04: 이전 foreground가 새 background timestamp를 지움 |
| API 조회/취소·쓰기·페이지 요청 순서 | 기존 R22/R23 유지. R24 설정 성공 직전 exact query 취소는 유효 |
| 네이티브 attach·ready·화면 복귀 | T07 조건부 iOS cold attach 후보; Android owner/token 재시도 가드 확인 |
| 연속 호출·반복 탭·operation claim | start/end coalesce, avatar savingRef, AddShoe ref 가드 확인. commit 전 두 native 탭 전달은 별도 근거 없이 결함으로 세지 않음 |
| 타이머·RAF·애니메이션·trailing 호출 | 기존 R32/R39와 테스트 teardown 진단을 구분. 일반 runtime 결함으로 확대하지 않음 |

## T01 · P2 · background 경로 인계 전에 종료해 세그먼트 누락

- 실제 순서: background 러닝의 거리·위치가 저장됨 → active 복귀가 `takeBackgroundTrackingState()` 대기 → 진행 화면의 Stop을 누름 → lifecycle이 먼저 `finalizeCurrentSegment()` → GPS hook이 Stopped/현재 세그먼트를 초기화 → coordinator stop이 generation을 바꿔 이전 handoff 완료를 거부 → stop 자체는 background 최종 거리·위치를 반환한다.
- 문제: lifecycle은 stop 결과의 distance만 사용하고 기존 `segmentItemsRef`를 저장한다. Stopped인 GPS hook은 최종 background snapshot으로 세그먼트를 만들지 않는다. ACK 뒤 background 정리가 진행되면 원래 위치로 세그먼트를 다시 만들 기회도 사라진다.
- 제어 실행: 실제 `useGpsTracking` + `useRunningSegments` + `RunningTrackingCoordinator`, 외부 Location/Background promise만 제어. handoff 중 종료는 **최종 거리 100m·반환 위치 1개·세그먼트 0개/0m**, handoff 완료 후 종료 control은 **100m·위치 1개·세그먼트 1개/100m**. 위치 1개는 synthetic adapter 데이터다.
- 실제 UI: [RunningActiveView의 Stop](/Users/hongtaeho/running/runtaeho_app/src/features/running/views/running-active.tsx:35)은 handoff 상태를 확인하지 않으며 `isEnding`만 확인한다. pause를 먼저 해야 하는 전제가 아니다.
- 근거: [finalize 후 stop](/Users/hongtaeho/running/runtaeho_app/src/features/running/viewmodels/hooks/useRunningLifecycle.ts:250), [GPS Stopped/초기화](/Users/hongtaeho/running/runtaeho_app/src/features/running/viewmodels/hooks/useGpsTracking.ts:175), [generation 교체](/Users/hongtaeho/running/runtaeho_app/src/features/running/services/RunningTrackingCoordinator.ts:285), [background 최종 값 수거](/Users/hongtaeho/running/runtaeho_app/src/features/running/services/RunningTrackingCoordinator.ts:301).
- 기존 R01과의 관계: 영속화 자체는 최종 전달 snapshot을 보존한다. 이번 누락은 그 snapshot을 만들기 전의 다른 경계다. 기기 GPS·저장 지연·실제 touch·업로드·프로세스 종료는 미실행이다.

## T02 · P2 · persist 복원보다 빠른 bootstrap이 로그인·replay를 누락

- 실제 순서: auth/user의 AsyncStorage 복원이 아직 대기 중 → SecureStore 토큰 조회·검증 완료 → 초기 `isLoggedIn=false`를 읽어 `/users/me`와 replay를 건너뜀 → `canReplay=false`로 준비 완료 → 뒤늦게 persist가 true/사용자 정보를 복원해 러닝 화면으로 이동한다. sessionGeneration은 바뀌지 않아 bootstrap을 다시 하지 않는다.
- 결과: 로그인 화면에 잠깐 갔다가 러닝 화면에 들어갈 수 있으나 사용자 재조회와 폰 pending replay가 실행되지 않는다. pending 기록 자체는 남아 있다.
- 별도 실제 Zustand persist 실행에서 `initializeTokens`의 set이 초기 false를 저장하고, 늦은 초기 hydration은 true를 메모리에만 합쳤다. **memoryLoggedIn=true / diskLoggedIn=false**를 확인해 다음 실행의 로그인 비트 손실 경로도 확인했다.
- 제어 실행: 실제 AuthProvider/useAuth/auth·user store/설치된 Zustand persist/React. 외부 AsyncStorage/SecureStore·network/replay/router 경계를 제어했다. hydration 완료 후 **profile=0 / replay=0**을 관측했다.
- 반증 확인: 루트 [ForceUpdateProvider](/Users/hongtaeho/running/runtaeho_app/src/features/forceUpdate/contexts/ForceUpdateProvider.tsx:90)는 children을 항상 렌더하며 persist gate가 아니다. 앱 root에도 auth/user persist 완료 gate가 없다. 설치 iOS AsyncStorage와 Expo AsyncFunction/SecureStore는 다른 큐를 사용하므로 앞의 읽기 callback 완료 순서가 보장되지 않는다. 실제 기기 발생률은 미측정이다.
- 근거: [bootstrap의 로그인 분기](/Users/hongtaeho/running/runtaeho_app/src/providers/AuthProvider.tsx:70), [세대 기준 effect](/Users/hongtaeho/running/runtaeho_app/src/providers/AuthProvider.tsx:81), [토큰 복원의 persist write](/Users/hongtaeho/running/runtaeho_app/src/features/auth/stores/authStore.ts:174), [auth persist 설정](/Users/hongtaeho/running/runtaeho_app/src/features/auth/stores/authStore.ts:256).

## T03 · P2 · R17 추가 경로: writer 간 잔액 순서와 offline 완료 갱신 미통합

직전 R17 수정은 `refreshUserPoint`끼리의 순서와 세션을 보호하지만, 모든 잔액 writer·완료 경로를 보호하지 않는다. 따라서 R17 전체의 완결 판정은 이 추가 경로에 대해 정정한다. 서버 잔액 손상이나 타 계정 변경을 뜻하지 않는다.

1. **전체 사용자 응답의 역전:** profile 저장 뒤 `/users/me`가 잔액 1200을 읽고 대기 → watch 보상 후 실제 잔액 refresh가 1300을 반영 → 늦은 사용자 응답의 `setLoginData(totalPoint)`가 1200으로 덮는다. 같은 session/user로 실제 useAuth/store/pointService 실행에서 **1300→1200** 확인. profile은 닫은 뒤에도 같은 세션의 committed refresh를 유지하며 전역 watch 이벤트는 동시에 처리될 수 있다.
2. **폰 종료 응답과 지연 watch 잔액:** watch upload/ACK 후 lock을 풀고 1200 GET 대기 → phone END가 lock을 얻어 응답 point=1300을 store에 반영 → 이전 watch GET이 1200으로 덮는다. 실제 QueryClient/useEndRunning/API/point/watch/replay lock/store로 재현. 요청은 `completed-records → users/points → running/55/end`, ACK=1, END 뒤 1300, 지연 GET 뒤 1200이었다. 공용 lock 해제는 유지해야 하며 그 자체가 원인은 아니다.
3. **offline 완료 후 갱신 누락:** bootstrap의 사용자 조회 뒤 raw `runningService.endRunning` replay가 point=1300/ACCEPTED를 받아 항목을 제거하지만 mutation의 잔액·query 완료 처리를 거치지 않는다. 실제 hook/storage/service/API/store 실행에서 **성공 1 / pending 0 / 표시 잔액 1200**, 준비한 기존 point cache는 invalidated=false였다. cold launch에 기존 query cache가 항상 있다는 뜻은 아니다.

- 근거: [전체 DTO 쓰기](/Users/hongtaeho/running/runtaeho_app/src/features/auth/hooks/useAuth.ts:167), [종료 응답 쓰기](/Users/hongtaeho/running/runtaeho_app/src/features/running/services/runningQueries.ts:49), [refresh 한정 가드](/Users/hongtaeho/running/runtaeho_app/src/features/point/services/pointService.ts:51), [raw replay](/Users/hongtaeho/running/runtaeho_app/src/features/running/hooks/useOfflineSync.ts:62), [watch lock 밖 잔액](/Users/hongtaeho/running/runtaeho_app/src/features/watchSync/watchSyncService.ts:70).
- 복구: 다음 modal 잔액 새로고침·정상 장기 background 복귀·새 보상/구매 등에서 갱신된다. 실제 서버/워치/native 이벤트는 미실행이다. 동일 root의 변형을 새 결함 세 개로 부풀리지 않는다.

## T04 · P2 신선도 · 이전 foreground가 새 background 시각을 삭제

- 실제 순서: 5분 초과 복귀 작업이 Unity/네트워크를 기다림 → 다시 background로 나가 새 `backgroundEnterTime` 저장 → 이전 foreground 작업이 끝나 동일 key를 무조건 삭제 → 다음 5분 초과 복귀가 경과 시간 0으로 계산된다.
- 실제 AppStateProvider/React 진단: active 400000이 이전 10000을 읽어 390초 → background 410000 저장 → 이전 작업 420000 완료 후 삭제 → active 820000은 실제 410초 경과했는데 0으로 계산. 두 번의 장기 복귀에 reset/point 갱신은 한 번이었다. `fgInFlight`가 다음 active를 버리는 변형도 있다.
- 영향/반증: >300초 분기의 잔액 조회·명시적 avatar 재적용을 건너뛴다. 0초 경로에서도 `recoverConnection()`은 호출되므로 Unity 영구 장애로 확대하지 않는다. 다음 정상 장기 복귀·별도 잔액 갱신으로 회복 가능하다.
- 근거: [새 timestamp 저장](/Users/hongtaeho/running/runtaeho_app/src/providers/AppStateProvider.tsx:73), [이전 작업의 삭제](/Users/hongtaeho/running/runtaeho_app/src/providers/AppStateProvider.tsx:212). native AppState·background 실행 시간은 미실행이며 외부 promise로 실제 합법적 대기를 제어했다.

## T05 · P2 · 제출 중 수정한 같은 화면의 새 초안이 사라짐

- 순서: 초안 A 제출 → 입력은 계속 가능해 B로 수정 → A 요청 성공 → 현재 화면이라는 수명 검사를 통과해 완료 이동/닫기 → B 입력 소실.
- 실제 InquiryView 제어 진단: 전송 제목 `A question`, pending 동안 현재 제목 `Changed after submit`, 성공 뒤 `/user/inquiry-done?trackingNo=INQ-TEST` replace 호출. 실제 component를 렌더하고 service/router·native animation만 대체했다. 1개 표적 진단 PASS, 기존 3개는 이름 필터로 미실행했다. 첫 환경 실패는 Animated renderer wiring 문제였고 수정된 경계 대역에서 행동을 재확인했다.
- 코드상 같은 패턴: [일반 문의의 payload/이동](/Users/hongtaeho/running/runtaeho_app/src/features/support/views/InquiryView.tsx:46), [입력 가능 상태](/Users/hongtaeho/running/runtaeho_app/src/features/support/views/InquiryView.tsx:79), [오류 문의](/Users/hongtaeho/running/runtaeho_app/src/features/support/views/ErrorInquiryView.tsx:52), [신발 추가](/Users/hongtaeho/running/runtaeho_app/src/features/shoes/views/components/AddShoeForm.tsx:72), [신발 수정](/Users/hongtaeho/running/runtaeho_app/src/features/shoes/views/EditShoeView.tsx:103). 신발/오류 문의의 각 화면 실행은 정적 대조까지다.
- 범위: 서버에는 제출한 A가 정상 저장된다. 제출 뒤 새로 입력한 B가 사라지는 문제이며, R26의 blur/unmount/재개방 보호와 다른 같은-instance 경계다. 실제 native 입력·화면 stack은 미실행이다.

## T06 · P3 · 달력 경계 뒤 새 현재 기간이 계속 미래로 남음

- 순서: 10월 31일 통계 방문 → 탭/앱을 유지한 채 11월 1일 복귀/refresh → `isFutureDate` 결과가 Date/period/timeZone만 의존하는 memo에 남는다.
- 실제 VM/차트/날짜 helper + React/고정 clock 실행: 11월 1일 재렌더에도 November query enabled=false, chart slot 2개 유지. 직접 계산한 `isFutureDate(November, MONTH)`는 false였다. 바뀐 data prop으로 재렌더해도 갱신되지 않아 기존 R10 comparator 수정과 다르다.
- 근거: [VM의 시간 의존 memo](/Users/hongtaeho/running/runtaeho_app/src/features/statistics/viewmodels/StatisticViewModel.ts:103), [차트의 같은 조건](/Users/hongtaeho/running/runtaeho_app/src/features/statistics/views/components/SwipeablePeriodChart.tsx:145), [방문 시 Date 유지](/Users/hongtaeho/running/runtaeho_app/src/features/statistics/views/StatisticsView.tsx:35).
- 복구: 필터 변경, 이전 기간으로 갔다가 돌아오기, remount. 주/연 경계도 같은 predicate를 사용한다. 데이터 손실이 아니라 일시적 다음 기간 이동 제한이다. 실제 기기 날짜 전환은 미실행이다.

## T07 · 보류/기기 검증 후보 · iOS cold attach 중 inactive가 되면 복구 누락

- source 순서: 최초 Unity start/Metal 대기 → 그 사이 inactive → [step2](/Users/hongtaeho/running/runtaeho_app/src/features/unity/bridge/iOS/UnityView.swift:110)가 attach 실패 반환, local isUnityLoaded=false 유지 → foreground 이벤트/명령/윈도우 재진입 모두 그 false를 guard로 반환한다.
- [foreground guard](/Users/hongtaeho/running/runtaeho_app/src/features/unity/bridge/iOS/UnityView.swift:250), [reattach guard](/Users/hongtaeho/running/runtaeho_app/src/features/unity/bridge/iOS/UnityView.swift:281), [window guard](/Users/hongtaeho/running/runtaeho_app/src/features/unity/bridge/iOS/UnityView.swift:332). GlobalUnityHost는 첫 viewport 뒤 native instance를 유지하고, JS failsafe는 ready 조회/opacity만 조정한다. 실제 컴파일 입력 경로임도 PBX 참조로 확인했다.
- 예상 영향: engine은 재개됐는데 retained container가 attach하지 않아 캐릭터 면이 비는 조건부 복구 누락. 정상 warm resume에는 일반화하지 않는다. R27 polling·R31 capture와 별개다.
- source상 재시도 누락은 확인했으나 **실기기 cold-start→inactive→resume은 미재현**이다. runtime guard 위반이 실제 기기에서 성립하는지 확인하기 전 확정 발생으로 세지 않는다. 이번에 native/Unity 소스는 수정하지 않았다.

## 제외·기존 항목과 확인 한계

- 기존 R22 Garmin late GET, R23 알림 pagination/refetch, R30 전체 close 중복, R32 final slider throttle, R39 숨은 interval/animation은 새 ID로 세지 않았다. R31은 명시적 사용자 보류다.
- R02/R20의 native 창 위 B 로그인, R25 동기 구간의 강제 세션 교체, R13b 현재 UI에 없는 포인트, R29b 서로 다른 구매/착장 상태 조회는 다시 결함으로 만들지 않았다.
- export layoutReady 무한 대기는 Android back 소비·gesture 차단·export 중 UI 차단을 고려하면 실제 이탈 경로가 확인되지 않아 제외했다. Android listener 제거 로직도 production 제거 caller가 없어 제외했다.
- 일반 unsubscribe 뒤 예전 GPS callback을 강제로 실행하는 재현은 설치 Expo의 callback ID 동기 삭제를 고려해 제외했다. React commit 전 두 번의 실제 탭이 도착한다는 전제도 미입증이다.
- 기존 Unity 복구 테스트의 teardown 뒤 RN Timeout 진단은 별도 테스트 격리 문제다. focus mock의 cleanup 미호출 및 취소하지 않은 RAF→RN Jest timeout을 가능한 source 설명으로 찾았지만 이번에 fresh native/stack 재현을 하지 않았고 제품 crash 근거로 세지 않았다.
- 기존 좁은 테스트 실행: render/effect 4 suites/13 tests PASS, running/queue 4 suites/52 tests PASS. 이 테스트의 통과는 새 타이밍 문제가 없다는 증거가 아니며 각 진단의 실제 관측 결과를 별도로 사용했다. 전체 unit/type/lint는 읽기 전용 감사에서 다시 실행하지 않았다.
- 최초 감사에서 서버/DB/실계정·iOS/Android runtime·native touch·릴리스 성능·실제 발생률은 NOT RUN이었다. 당시에는 새 영구 테스트·제품 수정·커밋·staging이 없었고 임시 진단은 메모리에서 실행했다. 이후 제품·회귀 수정과 사용자 커밋 지시의 검증은 상단 후속 결과를 따른다. 배포는 수행하지 않았다.
