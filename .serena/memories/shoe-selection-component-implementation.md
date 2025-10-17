# 신발 선택 컴포넌트 (ShoeSelectionArea) 구현

## 개요
러닝 완료 화면(RunningFinishedView)에서 사용하는 신발 선택 컴포넌트입니다. 사용자가 러닝에 착용한 신발을 선택할 수 있도록 수평 스크롤 가능한 카드 리스트를 제공합니다.

## 파일 위치
`/Users/hongtaeho/running/runtaeho_app/src/shared/components/common/shoe-selection-area.tsx`

## 디자인 정책 (Figma 기준)

### 카드 스타일
- **카드 너비**: 204px
- **카드 간격**: 20px
- **배경색**: #FFFFFF (white)
- **Border radius**: 8px
- **선택 테두리**: 2px solid #00C851 (초록색)
- **비선택 테두리**: 2px solid transparent (레이아웃 일관성 유지)

### 이미지 영역
- **높이**: 113px
- **배경색**: #FAFAFA (neutral-50)
- **Border radius**: 6px
- **아이콘**: shoe (64px)
- **텍스트**: "Image Coming Soon" - 13px, #606060, Cafe24Proup

### 텍스트 스타일
- **브랜드명**: 10px, #9D9D9D, font-weight 600
- **모델명**: 14px, #202020, font-weight 600
- **누적 거리**: 10px, #BCBCBC, font-weight 500

### 배지 ("현재 착용")
- **배경색**: #EEFEE9
- **텍스트 색상**: #00AF1F
- **폰트 크기**: 8px
- **Border radius**: 24px
- **패딩**: horizontal 8px, vertical 4px

## 구현 방식

### 중앙 정렬 로직
```typescript
// 화면 너비 기준으로 양쪽 패딩 계산
const sidePadding = (screenWidth - CARD_WIDTH) / 2;

// ScrollView에 동적 패딩 적용
contentContainerStyle={[
  styles.scrollContent,
  { paddingHorizontal: sidePadding },
]}
```

이를 통해 첫 번째와 마지막 카드도 화면 중앙에 위치할 수 있습니다.

### 스크롤 동작
- **Snap 기능**: `snapToInterval={CARD_WIDTH + CARD_GAP}` (224px)
- **감속률**: `decelerationRate="fast"` - 빠른 정지로 정확한 snap 제공
- **스크롤 이벤트**: `scrollEventThrottle={16}` - 60fps 업데이트

### 선택 상태 관리
```typescript
// 스크롤 위치 기반 자동 선택
const handleScroll = (event) => {
  const scrollX = event.nativeEvent.contentOffset.x;
  const index = Math.round(scrollX / (CARD_WIDTH + CARD_GAP));
  if (index !== selectedShoeIndex && index >= 0 && index < availableShoes.length) {
    setSelectedShoeIndex(index);
  }
};

// 카드 터치 시 중앙으로 스크롤
const handleCardPress = (index) => {
  setSelectedShoeIndex(index);
  scrollViewRef.current?.scrollTo({
    x: index * (CARD_WIDTH + CARD_GAP),
    animated: true,
  });
};
```

### 선택 표시
- **초록색 테두리**: 선택된 카드에 `borderColor: '#00C851'` 적용
- **배지 표시**: 선택된 카드에만 "현재 착용" 배지 표시
- **터치 피드백**: `TouchableOpacity`로 activeOpacity 0.8

## 상수 정의
```typescript
const CARD_WIDTH = 204;      // 카드 너비
const CARD_GAP = 20;         // 카드 간격
const screenWidth = Dimensions.get('window').width;
```

## 사용 위치
- `RunningFinishedView` 컴포넌트에서 사용
- Unity 배경 → DetailedStatisticsCard → MainDistanceCard → **ShoeSelectionArea** → CompleteButton 순서

## 데이터 구조
```typescript
interface Shoe {
  id: string;
  brand: string;
  model: string;
  totalDistance: number;
}
```

## TODO
- RunningFinishedViewModel에서 실제 신발 데이터 연결 필요
- 신발 이미지 로딩 기능 추가 필요

## 주의사항
1. ScrollView에 ref 필수 - 프로그래밍 방식 스크롤 제어용
2. borderWidth를 transparent로 설정하여 선택/비선택 시 레이아웃 shift 방지
3. gap 속성은 contentContainerStyle에 적용
4. 카드 터치 영역은 TouchableOpacity로 전체 카드 영역 포함