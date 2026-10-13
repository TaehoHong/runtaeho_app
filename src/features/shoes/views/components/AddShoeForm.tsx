import { t, useAppLanguage } from '~/i18n';
import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TopScreenSafeAreaView } from '~/shared/components';
import { Text } from '~/shared/components/typography';
import { PRIMARY, GREY, RED } from '~/shared/styles';
import { useAddShoe } from '~/features/shoes/services';
import { createAddShoeDto, validateShoe } from '~/features/shoes/models';

/**
 * 신발 추가 모달 화면
 */
interface AddShoeFormProps {
  entry: 'route' | 'list';
  onClose?: (() => void) | undefined;
  onSuccess?: (() => void) | undefined;
}

export function AddShoeForm({ entry, onClose, onSuccess }: AddShoeFormProps) {
  useAppLanguage();
  const { mutateAsync: addShoe, isPending: isAddingShoe } = useAddShoe();
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetDistanceError, setTargetDistanceError] = useState('');
  const handleTargetDistanceChange = (text: string) => {
    setTargetDistance(text);
    setTargetDistanceError(text && !/^\d+$/.test(text)
      ? t("목표 거리는 숫자로만 입력이 가능해요.") : '');
  };

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
    if (!isFormValid() || isAddingShoe || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      setErrors([]);

      // Validation
      const validation = entry === 'route' ? validateShoe({
        brand,
        model,
        targetDistance: parseInt(targetDistance) * 1000
      }) : { isValid: true, errors: [] };
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }

      // Add Shoe
      await addShoe(createAddShoeDto(
        brand.trim(),
        model.trim(),
        parseInt(targetDistance) * 1000,
        entry === 'route'
      ));
      onSuccess?.();
      onClose?.();

    } catch {
      console.error('[AddShoeForm] 신발 추가 실패');
      if (entry === 'route') {
        setErrors([t("신발 추가에 실패했습니다. 다시 시도해주세요.")]);
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <TopScreenSafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={GREY[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("신발 추가")}</Text>
          <View style={styles.headerRight} />
        </View>

        {/* 메인 컨텐츠 */}
        <View style={styles.content}>
          {/* 브랜드 입력 */}
          <InputField
            label={t("브랜드")}
            placeholder={t("신발의 브랜드를 입력해주세요.")}
            value={brand}
            onChangeText={setBrand}
          />

          {/* 모델명 입력 */}
          <InputField
            label={t("모델명")}
            placeholder={t("신발의 모델명을 입력해주세요.")}
            value={model}
            onChangeText={setModel}
          />

          {/* 목표 거리 입력 */}
          <InputField
            label={t("목표 거리 (km)")}
            placeholder={t("목표 거리를 입력해주세요.")}
            value={targetDistance}
            onChangeText={handleTargetDistanceChange}
            error={entry === 'list' ? targetDistanceError : undefined}
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
            disabled={!isFormValid() || isAddingShoe || isSubmitting}
            activeOpacity={entry === 'route' ? 0.7 : undefined}
          >
            {entry === 'route' && (isAddingShoe || isSubmitting) ? (
              <ActivityIndicator color={GREY.WHITE} />
            ) : (
              <Text style={styles.submitButtonText}>{t("신발 저장하기")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TopScreenSafeAreaView>
  );
}

// InputField Component
interface InputFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric';
  error?: string | undefined;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  error,
}) => {
  useAppLanguage();
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : undefined]}
        placeholder={placeholder}
        placeholderTextColor={GREY[300]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error && <Text style={[styles.errorText, styles.liveError]}>{error}</Text>}
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

  inputError: { borderColor: RED[400] },
  liveError: { marginTop: 4 },

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
