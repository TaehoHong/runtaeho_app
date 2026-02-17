# RunTaeho Unit Test Review Gate

## Summary
- 목적: Unit 테스트 리뷰를 회귀 방지 중심의 고정 게이트로 운영한다.
- 강도: `실무 게이트` (P0/P1 필수 차단).
- 범위:
`/Users/hongtaeho/running/runtaeho_app/src/**/__tests__/*.test.ts(x)`
`/Users/hongtaeho/running/runtaeho_app/src/providers/__tests__/*.test.tsx`
- 제외: E2E/Maestro, 프로덕션 코드 변경 구현.

## Public API / Type
- 프로덕션 API/타입 변경 없음.
- 리뷰 산출물 규칙:
`severity(P0/P1/P2)`, `file:line 근거`, `scenario ID 매핑`, `Validity/Fit 결과`.

## Severity Gate

### P0 (즉시 차단)
1. flaky 가능성: 실제 시간/랜덤/외부 상태 의존으로 재현성 저하.
2. 비동기 오용: `act`/`waitFor` 없이 비동기 상태 단정.
3. 거짓 양성: 핵심 로직 단정 없이 존재 확인만으로 통과.
4. 상태 누수: store/mock/timer 정리 누락으로 순서 의존 발생.
5. Scenario Validity 치명 실패: V1/V3/V5 실패.

### P1 (병합 전 수정 권고)
1. 실패/예외/경계 분기 누락.
2. 부작용 검증 누락(호출 인자/횟수/상태 전이).
3. 오탐 방지 부재(`not.toHaveBeenCalled` 등 부정 단정 없음).
4. 과도한 mock으로 실제 분기 검증 무력화.
5. 시나리오-테스트 매핑 불일치(문서 ID와 테스트 미매핑).
6. Scenario Fit 핵심 실패: F1/F2/F6 실패.

### P2 (후속 개선)
1. 중복 테스트(동일 분기 반복).
2. 의도 불명확한 테스트명.
3. 픽스처/헬퍼 부족으로 가독성 저하.
4. 의미 없는 로그 노이즈.
5. 표현/서술 정돈 이슈.

## Coverage Gate
1. 기본 기준: 대상 feature 파일 `Statements >= 80%`, `Branches >= 60%`.
2. 생명주기/상태전이 핵심 훅 기준: `Branches >= 70%`.
3. 커버리지 수치 단독 합격 금지. 분기 품질(P0/P1) + 시나리오 품질 동시 충족 필요.

## Scenario Quality Gate

### Definition
- `Validity`: 시나리오가 실제로 검증 가능한지.
- `Fit`: 시나리오가 해당 feature 리스크에 적절한지.

### Validity Checklist (V1~V6)
1. V1: Given이 재현 가능한 상태인가 (mock/store/timer로 구성 가능).
2. V2: When이 단일 트리거로 명확한가.
3. V3: Then이 관측 가능한 결과(값/호출/상태)로 측정 가능한가.
4. V4: Then 단정이 Given/When과 논리적으로 일치하는가.
5. V5: 비결정성(실시간/랜덤/외부 I/O) 의존이 제거됐는가.
6. V6: 오탐 방지 부정 단정이 1개 이상 존재하는가.

### Fit Checklist (F1~F6)
1. F1: 시나리오가 실제 리스크 타입(인증/상태전이/오류복구/UI분기/캐시)에 매핑되는가.
2. F2: 정상/실패/경계 중 어느 버킷인지 명확한가.
3. F3: 동일 분기 중복 테스트가 아닌가.
4. F4: 테스트 레벨이 적절한가(Unit에서 검증 가능한 범위인가).
5. F5: 회귀 임팩트가 낮은 장식성 케이스가 아닌가.
6. F6: 시나리오 ID와 테스트 케이스가 1:1 이상 매핑되는가.

### Scenario Gate Decision Rules
- `P0`:
V1/V3/V5 중 하나라도 실패 (검증 불가능/비결정성).
- `P1`:
F1/F2/F6 실패, 또는 F3 중복으로 유효 시나리오 대체 불가.
- `P2`:
표현/가독성 개선 수준(명명/서술 정돈).

## File-Level Checklist
1. 시나리오 품질:
Given/When/Then 의도가 테스트명에 드러나는가.
정상/실패/경계 3종이 존재하는가.
2. 단정 품질:
결과값 + 부작용 단정이 함께 있는가.
최소 1개 부정 단정이 있는가.
3. 비동기/타이머 안정성:
`act`, `waitFor`, fake timer 사용이 일관적인가.
unmount/cleanup 이후 추가 호출이 없는가.
4. 격리/독립성:
`resetAllStores`, mock reset, timer reset이 보장되는가.
외부 의존이 deterministic mock인가.
5. mock 전략 적합성:
mock이 분기 검증을 대체하지 않고 지원만 하는가.
호출 여부만 검사하고 인자/상태 단정이 빠지지 않았는가.
6. 회귀 위험 대응:
인증 상태, AppState, 캐시 invalidation, pagination, 권한/예외 케이스가 있는가.

## Review Procedure (Fixed Order)
1. 인벤토리 수집:
테스트 파일 목록, feature 분류, scenario ID 추출.
2. 시나리오 유효성 검사:
V1~V6 체크 및 `Validity` 판정.
3. 시나리오 적합성 검사:
F1~F6 체크 및 `Fit` 판정.
4. 파일별 게이트 평가:
각 파일에 대해 P0/P1/P2 + Coverage 판정.
모든 finding에 파일/라인 근거 기록.
5. feature 합격 판정:
`P0=0` AND `P1=0` AND coverage 기준 충족 AND scenario `Validity/Fit=PASS`이면 합격.
미충족 시 “추가 테스트 시나리오” 형태로 보완 항목 제시.
6. 최종 종합:
feature별 합격/보류 상태표 작성.
공통 패턴 이슈(async, mock 과다 등) 횡단 정리.

## Finding Output Format
- 필수 필드:
`Severity`, `Title`, `File`, `Line`, `Scenario ID`, `Validity Result (V1~V6)`,
`Fit Result (F1~F6)`, `Gate Impact (P0/P1/P2)`, `Why risky`, `How to fix`.
- 권장 포맷 예시:
`[P1] Missing error branch coverage`
`File: /path/to/file.test.tsx:120`
`Scenario ID: RUN-LIFE-002`
`Validity: PASS (V1,V2,V3,V4,V5,V6)`
`Fit: FAIL (F2)`
`Gate Impact: P1`
`Risk: end API 실패 시 fallback 회귀를 놓칠 수 있음`
`Fix: 실패 응답 mock + fallback side-effect(assert) 추가`

## Review Acceptance
1. P0 없음.
2. P1 없음.
3. Coverage gate 충족.
4. 시나리오 매트릭스와 테스트 ID 매핑 완료.
5. 모든 시나리오 `Validity=PASS`.
6. 모든 시나리오 `Fit=PASS` (중복은 P2로 분리되더라도 핵심 매핑 유지).

## Gate Validation Scenarios
1. 비결정성 검증:
Given `Date.now`/timer 고정 없이 시간 의존 테스트.
When Validity 체크.
Then `V5 FAIL` -> `P0`.
2. 검증 불가능 Then 검증:
Given Then이 관측 불가 문장.
When Validity 체크.
Then `V3 FAIL` -> `P0`.
3. 리스크 미매핑 검증:
Given 단순 렌더 존재만 확인하고 리스크 타입 미정의.
When Fit 체크.
Then `F1 FAIL` -> `P1`.
4. 시나리오 중복 검증:
Given 동일 분기 반복 2개 시나리오.
When Fit 체크.
Then `F3 FAIL` -> `P1` 또는 `P2`(대체 시나리오 존재 여부에 따름).
5. ID 매핑 불일치 검증:
Given 매트릭스 ID는 있는데 테스트명/케이스에 ID 없음.
When Fit 체크.
Then `F6 FAIL` -> `P1`.

## Assumptions
1. 테스트 런타임은 Jest + jest-expo + RTL.
2. `act warning fail` 정책(`jest.setup.ts`)을 유지한다.
3. 시나리오 매핑 기준 문서는
`/Users/hongtaeho/running/runtaeho_app/docs/unit-test-scenario-matrix.md`를 사용한다.
4. `Validity/Fit` 평가는 리뷰 단계의 수동 체크리스트 기반으로 수행한다.
5. 자동 점수화 스크립트는 현재 범위에서 제외한다.
