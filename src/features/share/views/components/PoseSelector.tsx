/**
 * PoseSelector Component
 * 포즈 선택 UI 컴포넌트
 *
 * Figma 프로토타입 351:6944 정확 반영
 * - 버튼 높이: 48px
 * - pill 형태 버튼
 * - 그라데이션 활성 상태
 * - 섹션 카드 래핑
 *
 * Sprint 3: 포즈 타임라인 슬라이더 추가
 * - 롱프레스 시 슬라이더 팝오버 표시
 * - 드래그로 애니메이션 프레임 선택 (0~1)
 * - 실시간 Unity 캐릭터 업데이트
 */

import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import type { PoseOption } from '../../models/types';
import { POSE_OPTIONS } from '../../constants/shareOptions';
import { GREY, PRIMARY } from '~/shared/styles';

/** 슬라이더 드래그 범위 (좌우 각각 픽셀) */
const SLIDER_DRAG_RANGE = 150;

/** 롱프레스 인식 시간 (ms) */
const LONG_PRESS_DURATION = 200;

interface PoseSelectorProps {
  /** 선택된 포즈 */
  selectedPose: PoseOption;
  /** 포즈 선택 콜백 */
  onSelect: (pose: PoseOption) => void;
  /** 비활성화 상태 */
  disabled?: boolean;
  /** 슬라이더 값 (0~1) - 애니메이션 정규화 시간 */
  sliderValue: number;
  /** 슬라이더 값 변경 콜백 (실시간 업데이트) */
  onSliderChange: (value: number) => void;
}

/**
 * 개별 포즈 버튼 컴포넌트
 * - 탭: 포즈 선택만
 * - 롱프레스 + 드래그: 슬라이더로 프레임 조절
 */
interface PoseButtonProps {
  option: PoseOption;
  isSelected: boolean;
  disabled: boolean;
  sliderValue: number;
  onSelect: (pose: PoseOption) => void;
  onSliderChange: (value: number) => void;
}

const PoseButton = React.memo<PoseButtonProps>(({
  option,
  isSelected,
  disabled,
  sliderValue,
  onSelect,
  onSliderChange,
}) => {
  // 슬라이더 팝오버 표시 여부 (0: 숨김, 1: 표시)
  const isSliderVisible = useSharedValue(0);

  // 슬라이더 값을 SharedValue로 관리 (UI 스레드 최적화)
  const sliderValueShared = useSharedValue(sliderValue);

  // 드래그 시작 시점의 슬라이더 값 저장
  const startSliderValue = useSharedValue(sliderValue);

  // 버튼 너비를 SharedValue로 관리
  const buttonWidthShared = useSharedValue(0);

  // 슬라이더 표시 상태 (JS 스레드용)
  const [isSliderShowing, setIsSliderShowing] = useState(false);

  // sliderValue prop이 변경될 때 SharedValue 동기화
  useEffect(() => {
    sliderValueShared.value = sliderValue;
  }, [sliderValue, sliderValueShared]);

  // 슬라이더 값 업데이트 (UI 스레드 → JS 스레드)
  const updateSliderValue = useCallback((value: number) => {
    onSliderChange(value);
  }, [onSliderChange]);

  // 포즈 선택 (UI 스레드 → JS 스레드)
  const selectPose = useCallback(() => {
    onSelect(option);
  }, [onSelect, option]);

  // 슬라이더 표시/숨기기 상태 업데이트
  const showSlider = useCallback(() => {
    setIsSliderShowing(true);
  }, []);

  const hideSlider = useCallback(() => {
    setIsSliderShowing(false);
  }, []);

  // 버튼 레이아웃 측정
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    buttonWidthShared.value = event.nativeEvent.layout.width;
  }, [buttonWidthShared]);

  // 탭 제스처: 단순 탭 시 포즈만 선택
  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onEnd(() => {
      runOnJS(selectPose)();
    });

  // 롱프레스 제스처: 슬라이더 표시 + 포즈 선택
  const longPressGesture = Gesture.LongPress()
    .enabled(!disabled)
    .minDuration(LONG_PRESS_DURATION)
    .onStart(() => {
      // 포즈 선택 + 슬라이더 표시
      runOnJS(selectPose)();
      runOnJS(showSlider)();
      startSliderValue.value = sliderValueShared.value;
      isSliderVisible.value = withTiming(1, { duration: 150 });
    });

  // 팬 제스처: 롱프레스 후 드래그로 슬라이더 조절
  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .activateAfterLongPress(LONG_PRESS_DURATION)
    .onStart(() => {
      // 드래그 시작 시 현재 값 저장
      startSliderValue.value = sliderValueShared.value;
    })
    .onUpdate((event) => {
      // 좌우 드래그로 슬라이더 값 조절
      // translationX: -SLIDER_DRAG_RANGE ~ +SLIDER_DRAG_RANGE → 0 ~ 1
      const delta = event.translationX / (SLIDER_DRAG_RANGE * 2);
      const newValue = Math.max(0, Math.min(1, startSliderValue.value + delta));
      sliderValueShared.value = newValue;
      runOnJS(updateSliderValue)(newValue);
    })
    .onEnd(() => {
      // 터치 해제 → 슬라이더 숨김
      isSliderVisible.value = withTiming(0, { duration: 150 });
      runOnJS(hideSlider)();
    })
    .onFinalize(() => {
      // 제스처 취소 시에도 슬라이더 숨김
      isSliderVisible.value = withTiming(0, { duration: 150 });
      runOnJS(hideSlider)();
    });

  // 복합 제스처: 탭 vs (롱프레스 + 팬)
  // Race: 먼저 인식되는 제스처가 승리
  const composedGesture = Gesture.Race(
    Gesture.Simultaneous(longPressGesture, panGesture),
    tapGesture
  );

  // 슬라이더 팝오버 애니메이션 스타일
  const sliderPopoverStyle = useAnimatedStyle(() => {
    return {
      opacity: isSliderVisible.value,
      transform: [
        {
          scale: interpolate(
            isSliderVisible.value,
            [0, 1],
            [0.8, 1],
            Extrapolation.CLAMP
          )
        },
        {
          translateY: interpolate(
            isSliderVisible.value,
            [0, 1],
            [10, 0],
            Extrapolation.CLAMP
          )
        },
      ],
    };
  });

  // 슬라이더 채움 너비 계산 (SharedValue 사용)
  const sliderFillWidth = useDerivedValue(() => {
    return sliderValueShared.value * 100;
  });

  const sliderFillStyle = useAnimatedStyle(() => {
    return {
      width: `${sliderFillWidth.value}%`,
    };
  });

  // 슬라이더 썸 위치 계산 (SharedValue 사용)
  const sliderThumbStyle = useAnimatedStyle(() => {
    // 버튼 너비 기준으로 썸 위치 계산 (패딩 고려)
    const trackWidth = Math.max(0, buttonWidthShared.value - 32); // 좌우 패딩 16px씩
    const thumbPosition = sliderValueShared.value * trackWidth;
    return {
      transform: [{ translateX: thumbPosition }],
    };
  });

  // 슬라이더 값 퍼센트 표시용 derived value
  const sliderPercentage = useDerivedValue(() => {
    return Math.round(sliderValueShared.value * 100);
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[disabled ? styles.buttonDisabled : undefined]}
        onLayout={onLayout}
        accessible={true}
        accessibilityLabel={`${option.name} 포즈${isSelected ? ', 선택됨' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected, disabled }}
        accessibilityHint="길게 누르면 프레임을 조절할 수 있습니다"
      >
        {/* 슬라이더 팝오버 - 버튼 위에 표시 */}
        <Animated.View
          style={[styles.sliderPopover, sliderPopoverStyle]}
          pointerEvents={isSliderShowing ? 'auto' : 'none'}
          accessible={isSliderShowing}
          accessibilityLabel={`프레임 슬라이더, ${sliderPercentage.value}%`}
          accessibilityRole="adjustable"
        >
          <View style={styles.sliderTrack}>
            <Animated.View style={[styles.sliderFill, sliderFillStyle]} />
          </View>
          <Animated.View style={[styles.sliderThumb, sliderThumbStyle]} />
          {/* 슬라이더 값 표시 */}
          <Text style={styles.sliderValueText}>
            {Math.round(sliderValue * 100)}%
          </Text>
        </Animated.View>

        {/* 포즈 버튼 */}
        {isSelected ? (
          <LinearGradient
            colors={[PRIMARY[500], PRIMARY[600]]}
            style={[styles.poseButton, styles.poseButtonActive]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={option.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={GREY.WHITE}
            />
            <Text style={[styles.poseLabel, styles.poseLabelActive]}>
              {option.name}
            </Text>
          </LinearGradient>
        ) : (
          <View style={styles.poseButton}>
            <Ionicons
              name={option.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={GREY[700]}
            />
            <Text style={styles.poseLabel}>{option.name}</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
});

PoseButton.displayName = 'PoseButton';

export const PoseSelector: React.FC<PoseSelectorProps> = ({
  selectedPose,
  onSelect,
  disabled = false,
  sliderValue,
  onSliderChange,
}) => {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.title}>포즈</Text>

      {/* 사용법 힌트 */}
      <Text style={styles.hintText}>
        버튼을 길게 누르고 좌우로 드래그하여 프레임 조절
      </Text>

      {/* 포즈 버튼들 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {POSE_OPTIONS.map((option) => {
          const isSelected = selectedPose.id === option.id;

          return (
            <PoseButton
              key={option.id}
              option={option}
              isSelected={isSelected}
              disabled={disabled}
              sliderValue={sliderValue}
              onSelect={onSelect}
              onSliderChange={onSliderChange}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GREY[100],
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 16,
    overflow: 'visible', // 슬라이더 팝오버가 카드 경계 밖으로 나올 수 있도록 허용
    // 카드 그림자
    shadowColor: GREY[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY[700],
    marginBottom: 8,
    paddingHorizontal: 16,
    fontFamily: 'Pretendard-SemiBold',
  },
  hintText: {
    fontSize: 12,
    color: GREY[500],
    marginBottom: 12,
    paddingHorizontal: 16,
    fontFamily: 'Pretendard-Regular',
  },
  scrollView: {
    overflow: 'visible',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    overflow: 'visible',
  },
  poseButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 9999, // pill 형태
    backgroundColor: GREY[100],
    borderWidth: 1,
    borderColor: GREY[200],
  },
  poseButtonActive: {
    borderWidth: 0,
    // PRIMARY 색상 그림자
    shadowColor: PRIMARY[500],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  poseLabel: {
    fontSize: 14,
    color: GREY[700],
    fontFamily: 'Pretendard-Medium',
  },
  poseLabelActive: {
    color: GREY.WHITE,
    fontWeight: '600',
  },
  // 슬라이더 팝오버 스타일
  sliderPopover: {
    position: 'absolute',
    top: -52,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: GREY.WHITE,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    // 그림자
    shadowColor: GREY[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 100,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 8,
    backgroundColor: GREY[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: PRIMARY[500],
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    top: 8,
    left: 16, // 패딩만큼 오프셋
    width: 20,
    height: 20,
    backgroundColor: GREY.WHITE,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: PRIMARY[500],
    // 그림자
    shadowColor: GREY[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderValueText: {
    position: 'absolute',
    right: 16,
    top: 12,
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY[600],
    fontFamily: 'Pretendard-SemiBold',
  },
});

export default PoseSelector;
