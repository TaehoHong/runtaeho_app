# Point Info Bar 간격 이슈 분석

## 문제
running-finished.tsx에 PointInfoBar를 추가했을 때, Unity 화면과 PointInfoBar 사이에 간격이 보임.

## 원인
`running-finished.tsx`의 `container` 스타일이 고정 높이 (`height: height * 0.5`)를 사용하는 반면, 부모 컨테이너인 `RunningView.tsx`의 `controlPanelContainer`는 동적 높이 (`flex: 0.5`)를 사용하여 불일치 발생.

### 파일 위치
- `src/features/running/views/running-finished.tsx:117-122` - container 스타일
- `src/features/running/views/RunningView.tsx:164-169` - controlPanelContainer 스타일

### 높이 불일치 상세
1. `container.height = Dimensions.get('window').height * 0.5` (전체 창 높이의 50%)
2. `controlPanelContainer.flex = 0.5` (부모 높이의 50% - borders)
3. borderTopWidth: 1px, borderBottomWidth: 2px로 인한 추가 차이
4. 결과: container가 더 작아서 controlPanelContainer의 배경색(#f5f5f5)이 위쪽에 노출됨

## 해결 방법
`container` 스타일에서 `height: height * 0.5`를 제거하고 `flex: 1`로 변경하면 부모 컨테이너를 완전히 채워 간격 제거 가능.

```typescript
// 수정 전
container: {
  width: width,
  height: height * 0.5,  // ← 문제
  justifyContent: 'flex-start',
  alignItems: 'center'
}

// 수정 후
container: {
  flex: 1,  // ← 해결
  justifyContent: 'flex-start',
  alignItems: 'center'
}
```

## 참고: 다른 러닝 뷰 비교
- `running-start.tsx`: `flex: 1` 사용 (간격 없음)
- `running-active.tsx`: `height: height * 0.5` + `paddingTop: 16`
- `running-paused.tsx`: `height: height * 0.5` (동일 이슈 가능성)

## PointInfoBar 구현 상세
- 파일: `src/features/running/views/components/point-info-bar.tsx`
- Export: `src/shared/components/common/index.ts:12`
- Props: `earnedPoints: number`, `totalPoints: number`
- 포인트 계산: `Math.floor(distance / 100)` (100m당 1포인트)
- 사용자 포인트 조회: `useGetUserPoint()` hook (src/features/point/services/pointQueries.ts:72-78)
