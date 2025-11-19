import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '~/shared/components/typography';
import { PRIMARY, GREY, RED } from '~/shared/styles';
import { useShoeViewModel } from '~/features/shoes/viewmodels';
import { validateShoe } from '~/features/shoes/models';

/**
 * 신발 추가 모달 화면
 */
export default function AddShoeModal() {
  const { handleAddShoe, isAddingShoe } = useShoeViewModel();

  // Form State
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [targetDistance, setTargetDistance] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // Form Validation
  const isFormValid = () => {
    return brand.trim().length > 0
      && model.trim().length > 0
      && /^\d+$/.test(targetDistance);
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!isFormValid() || isAddingShoe) return;

    try {
      setErrors([]);

      // Validation
      const validation = validateShoe({
        brand,
        model,
        targetDistance: parseInt(targetDistance) * 1000
      });
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }

      // Add Shoe
      const newShoe = await handleAddShoe(
        brand.trim(),
        model.trim(),
        parseInt(targetDistance) * 1000,
        true // 첫 신발이므로 자동 메인 설정
      );

      console.log('✅ [AddShoeModal] 신발 추가 성공:', newShoe);

      // 모달 닫기
      router.back();

    } catch (error) {
      console.error('❌ [AddShoeModal] 신발 추가 실패:', error);
      setErrors(['신발 추가에 실패했습니다. 다시 시도해주세요.']);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={GREY[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>신발 추가</Text>
          <View style={styles.headerRight} />
        </View>

        {/* 메인 컨텐츠 */}
        <View style={styles.content}>
          {/* 브랜드 입력 */}
          <InputField
            label="브랜드"
            placeholder="신발의 브랜드를 입력해주세요."
            value={brand}
            onChangeText={setBrand}
          />

          {/* 모델명 입력 */}
          <InputField
            label="모델명"
            placeholder="신발의 모델명을 입력해주세요."
            value={model}
            onChangeText={setModel}
          />

          {/* 목표 거리 입력 */}
          <InputField
            label="목표 거리 (km)"
            placeholder="목표 거리를 입력해주세요."
            value={targetDistance}
            onChangeText={setTargetDistance}
            keyboardType="numeric"
          />

          {/* Error Messages */}
          {errors.length > 0 && (
            <View style={styles.errorContainer}>
              {errors.map((error, index) => (
                <Text key={index} style={styles.errorText}>{error}</Text>
              ))}
            </View>
          )}

          {/* 저장 버튼 */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              !isFormValid() && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isAddingShoe}
            activeOpacity={0.7}
          >
            {isAddingShoe ? (
              <ActivityIndicator color={GREY.WHITE} />
            ) : (
              <Text style={styles.submitButtonText}>신발 저장하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// InputField Component
interface InputFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric';
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
}) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={GREY[300]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
};

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

  // ===== 에러 =====
  errorContainer: {
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '400',
    color: RED[400],
    fontFamily: 'Pretendard',
    lineHeight: 16,
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
