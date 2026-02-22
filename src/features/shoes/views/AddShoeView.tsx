import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TopScreenSafeAreaView } from '~/shared/components';
import { Text } from '~/shared/components/typography';
import { GREY, PRIMARY, RED } from '~/shared/styles';
import { createAddShoeDto } from '../models';
import { shoeService } from '../services';

/**
 * 신발 추가 화면
 */
interface AddShoeViewProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export const AddShoeView: React.FC<AddShoeViewProps> = ({ onClose, onSuccess }) => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [targetDistance, setTargetDistance] = useState('');
  const [targetDistanceError, setTargetDistanceError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 브랜드 입력 처리
  const handleBrandChange = (text: string) => {
    setBrand(text);
  };

  // 모델명 입력 처리
  const handleModelChange = (text: string) => {
    setModel(text);
  };

  // 목표 거리 입력 처리
  const handleTargetDistanceChange = (text: string) => {
    setTargetDistance(text);

    // 숫자 검증
    if (text && !/^\d+$/.test(text)) {
      setTargetDistanceError('목표 거리는 숫자로만 입력이 가능해요.');
    } else {
      setTargetDistanceError('');
    }
  };

  // 폼 유효성 검사
  const isFormValid = () => {
    return (
      brand.trim().length > 0 &&
      model.trim().length > 0 &&
      targetDistance.trim().length > 0 &&
      /^\d+$/.test(targetDistance) &&
      !targetDistanceError
    );
  };

  // 신발 추가 처리
  const handleSubmit = async () => {
    if (!isFormValid() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const dto = createAddShoeDto(
        brand.trim(),
        model.trim(),
        parseInt(targetDistance) * 1000, // km to meters
        false
      );

      await shoeService.addShoe(dto);
      console.log('✅ [AddShoeView] 신발 추가 완료');

      // 성공 콜백 호출
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('❌ [AddShoeView] 신발 추가 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaProvider>
      <TopScreenSafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          {/* 헤더 */}
          <Header onClose={onClose} />

          {/* 메인 컨텐츠 */}
          <View style={styles.content}>
            {/* 브랜드 입력 */}
            <InputField
              label="브랜드"
              placeholder="신발의 브랜드를 입력해주세요."
              value={brand}
              onChangeText={handleBrandChange}
            />

            {/* 모델명 입력 */}
            <InputField
              label="모델명"
              placeholder="신발의 모델명을 입력해주세요."
              value={model}
              onChangeText={handleModelChange}
            />

            {/* 목표 거리 입력 */}
            <InputField
              label="목표 거리 (km)"
              placeholder="목표 거리를 입력해주세요."
              value={targetDistance}
              onChangeText={handleTargetDistanceChange}
              keyboardType="numeric"
              error={targetDistanceError}
            />

            {/* 저장 버튼 */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                !isFormValid() && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid() || isSubmitting}
            >
              <Text style={styles.submitButtonText}>신발 저장하기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TopScreenSafeAreaView>
    </SafeAreaProvider>
  );
};

// ========== 내부 컴포넌트들 ==========

/**
 * 헤더 컴포넌트
 * Figma: 뒤로가기 + "신발 추가"
 */
interface HeaderProps {
  onClose?: (() => void) | undefined;
}

const Header: React.FC<HeaderProps> = ({ onClose }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onClose} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={GREY[900]} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>신발 추가</Text>
      <View style={styles.headerRight} />
    </View>
  );
};

/**
 * 입력 필드 컴포넌트
 */
interface InputFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric';
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  error,
}) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
        ]}
        placeholder={placeholder}
        placeholderTextColor={GREY[300]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// ========== 스타일 ==========

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREY[50],
  },
  keyboardAvoid: {
    flex: 1,
  },

  // ===== 헤더 =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    height: 56,
    backgroundColor: GREY[50],
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: GREY[900],
    fontFamily: 'Pretendard',
    lineHeight: 24,
  },
  headerRight: {
    width: 24,
    height: 24,
  },

  // ===== 메인 컨텐츠 =====
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // ===== 입력 필드 =====
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: GREY[900],
    fontFamily: 'Pretendard',
    lineHeight: 16,
    marginBottom: 4,
  },
  input: {
    height: 48,
    backgroundColor: GREY.WHITE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GREY[200],
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '400',
    color: GREY[900],
    fontFamily: 'Pretendard',
    lineHeight: 20,
  },
  inputError: {
    borderColor: RED[400],
  },
  errorText: {
    fontSize: 12,
    fontWeight: '400',
    color: RED[400],
    fontFamily: 'Pretendard',
    lineHeight: 16,
    marginTop: 4,
  },

  // ===== 저장 버튼 =====
  submitButton: {
    height: 56,
    backgroundColor: PRIMARY[600],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    backgroundColor: GREY[200],
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: GREY.WHITE,
    fontFamily: 'Pretendard',
    lineHeight: 24,
  },
});
