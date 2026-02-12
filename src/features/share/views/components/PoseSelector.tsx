

import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  LayoutChangeEvent,
  AccessibilityActionEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { PoseOption } from '../../models/types';
import { POSE_OPTIONS } from '../../constants/shareOptions';
import { GREY, PRIMARY } from '~/shared/styles';

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
 * 개별 포즈 버튼 컴포넌트 (간소화 버전)
 * - 탭: 포즈 선택만
 */
interface PoseButtonProps {
  option: PoseOption;
  isSelected: boolean;
  disabled: boolean;
  onSelect: (pose: PoseOption) => void;
}

const PoseButton = React.memo<PoseButtonProps>(({
  option,
  isSelected,
  disabled,
  onSelect,
}) => {
  // 포즈 선택 (UI 스레드 → JS 스레드)
  const selectPose = useCallback(() => {
    onSelect(option);
  }, [onSelect, option]);

  // 탭 제스처: 단순 탭 시 포즈만 선택
  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onEnd(() => {
      scheduleOnRN(selectPose);
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[disabled ? styles.buttonDisabled : undefined]}
        accessible={true}
        accessibilityLabel={`${option.name} 포즈${isSelected ? ', 선택됨' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected, disabled }}
      >
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

/**
 * 프레임 슬라이더 컴포넌트
 * - 드래그로 애니메이션 프레임 선택 (0~1)
 */
interface FrameSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const FrameSlider = React.memo<FrameSliderProps>(({
  value,
  onChange,
  disabled = false,
}) => {
  // 트랙 너비 저장 (UI 스레드 안전을 위해 SharedValue 사용)
  const trackWidth = useSharedValue(0);

  // 슬라이더 값을 SharedValue로 관리
  const sliderValue = useSharedValue(value);

  // value prop이 변경될 때 SharedValue 동기화
  React.useEffect(() => {
    sliderValue.value = value;
  }, [value, sliderValue]);

  // 슬라이더 값 업데이트
  const updateSliderValue = useCallback((newValue: number) => {
    onChange(newValue);
  }, [onChange]);

  // 트랙 레이아웃 측정
  const onTrackLayout = useCallback((event: LayoutChangeEvent) => {
    trackWidth.value = event.nativeEvent.layout.width;
  }, [trackWidth]);

  // 팬 제스처: 드래그로 슬라이더 조절
  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onStart((event) => {
      // 터치 시작 위치에서 값 계산
      if (trackWidth.value > 0) {
        const newValue = Math.max(0, Math.min(1, event.x / trackWidth.value));
        sliderValue.value = newValue;
        scheduleOnRN(updateSliderValue, newValue);
      }
    })
    .onUpdate((event) => {
      // 드래그로 슬라이더 값 조절
      if (trackWidth.value > 0) {
        const newValue = Math.max(0, Math.min(1, event.x / trackWidth.value));
        sliderValue.value = newValue;
        scheduleOnRN(updateSliderValue, newValue);
      }
    });

  // 탭 제스처: 탭한 위치로 이동
  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((event) => {
      if (trackWidth.value > 0) {
        const newValue = Math.max(0, Math.min(1, event.x / trackWidth.value));
        sliderValue.value = newValue;
        scheduleOnRN(updateSliderValue, newValue);
      }
    });

  // 복합 제스처
  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // 슬라이더 채움 스타일
  const sliderFillStyle = useAnimatedStyle(() => {
    return {
      width: `${sliderValue.value * 100}%`,
    };
  });

  // 슬라이더 썸 위치 스타일
  const sliderThumbStyle = useAnimatedStyle(() => {
    const thumbPosition = sliderValue.value * (trackWidth.value - 20); // 썸 크기 20px 고려
    return {
      transform: [{ translateX: thumbPosition }],
    };
  });

  const percentage = Math.round(value * 100);

  // VoiceOver 접근성 액션 핸들러
  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const step = 0.1; // 10% 단위
      if (event.nativeEvent.actionName === 'increment') {
        const newValue = Math.min(1, value + step);
        onChange(newValue);
      } else if (event.nativeEvent.actionName === 'decrement') {
        const newValue = Math.max(0, value - step);
        onChange(newValue);
      }
    },
    [value, onChange]
  );

  return (
    <View style={[styles.sliderContainer, disabled && styles.sliderDisabled]}>
      <GestureDetector gesture={composedGesture}>
        <View
          style={styles.sliderTrackContainer}
          onLayout={onTrackLayout}
          accessible={true}
          accessibilityLabel={`프레임 슬라이더, ${percentage}%`}
          accessibilityRole="adjustable"
          accessibilityValue={{ min: 0, max: 100, now: percentage }}
          accessibilityActions={[
            { name: 'increment', label: '증가' },
            { name: 'decrement', label: '감소' },
          ]}
          onAccessibilityAction={handleAccessibilityAction}
        >
          {/* 트랙 */}
          <View style={styles.sliderTrack}>
            <Animated.View style={[styles.sliderFill, sliderFillStyle]} />
          </View>

          {/* 썸 */}
          <Animated.View style={[styles.sliderThumb, sliderThumbStyle]} />
        </View>
      </GestureDetector>

      {/* 퍼센트 표시 */}
      <Text style={styles.sliderValueText}>{percentage}%</Text>
    </View>
  );
});

FrameSlider.displayName = 'FrameSlider';

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
              onSelect={onSelect}
            />
          );
        })}
      </ScrollView>

      {/* 프레임 슬라이더 */}
      <FrameSlider
        value={sliderValue}
        onChange={onSliderChange}
        disabled={disabled}
      />
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
    overflow: 'hidden',
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
    marginBottom: 12,
    paddingHorizontal: 16,
    fontFamily: 'Pretendard-SemiBold',
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
  // 프레임 슬라이더 스타일
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  sliderDisabled: {
    opacity: 0.5,
  },
  sliderTrackContainer: {
    flex: 1,
    height: 44,
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
    width: 20,
    height: 20,
    backgroundColor: GREY.WHITE,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: PRIMARY[500],
    // 세로 중앙 정렬 (트랙 높이 8px 기준)
    top: 12, // (44 - 20) / 2 = 12
    left: 0,
    // 그림자
    shadowColor: GREY[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY[600],
    fontFamily: 'Pretendard-SemiBold',
    minWidth: 36,
    textAlign: 'right',
  },
});

export default PoseSelector;
