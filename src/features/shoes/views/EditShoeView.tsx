import { t, useAppLanguage } from '~/i18n';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useScreenLifetime } from '~/shared/hooks/useScreenLifetime';
import { getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';
import { TopScreenSafeAreaView } from '~/shared/components';
import { Text } from '~/shared/components/typography';
import { GREY, PRIMARY, RED } from '~/shared/styles';
import type { ShoeViewModel } from '../models';
import { createPatchShoeDto } from '../models';
import { usePatchShoe } from '../services';

/**
 * 신발 수정 화면
 * Figma: #4_마이페이지_내 신발_신발수정하기
 */
interface EditShoeViewProps {
  shoe: ShoeViewModel;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const EditShoeView: React.FC<EditShoeViewProps> = ({
  shoe,
  onClose,
  onSuccess,
}) => {
  useAppLanguage();
  const captureLifetime = useScreenLifetime();
  const { mutateAsync: patchShoe } = usePatchShoe();
  const [brand, setBrand] = useState(shoe.brand);
  const [model, setModel] = useState(shoe.model);
  const [targetDistance, setTargetDistance] = useState(
    shoe.targetDistance ? String(shoe.targetDistance / 1000) : ''
  );
  const [targetDistanceError, setTargetDistanceError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 변경사항 감지
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const brandChanged = brand !== shoe.brand;
    const modelChanged = model !== shoe.model;
    const targetDistanceChanged =
      targetDistance !== (shoe.targetDistance ? String(shoe.targetDistance / 1000) : '');

    setHasChanges(brandChanged || modelChanged || targetDistanceChanged);
  }, [brand, model, targetDistance, shoe]);

  // 브랜드 입력 처리
  const handleBrandChange = (text: string) => {
    if (isSubmitting) return;
    setBrand(text);
  };

  // 모델명 입력 처리
  const handleModelChange = (text: string) => {
    if (isSubmitting) return;
    setModel(text);
  };

  // 목표 거리 입력 처리
  const handleTargetDistanceChange = (text: string) => {
    if (isSubmitting) return;
    setTargetDistance(text);

    // 숫자 검증
    if (text && !/^\d+$/.test(text)) {
      setTargetDistanceError(t("목표 거리는 숫자로만 입력이 가능해요."));
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
      !targetDistanceError &&
      hasChanges
    );
  };

  // 신발 수정 처리
  const handleSubmit = async () => {
    if (!isFormValid() || isSubmitting) return;

    const isScreenCurrent = captureLifetime();
    const session = getSessionSnapshot();
    const isCurrent = () => isScreenCurrent() && isSessionCurrent(session);
    try {
      setIsSubmitting(true);
      const dto = createPatchShoeDto(shoe.id, {
        brand: brand.trim(),
        model: model.trim(),
        targetDistance: parseInt(targetDistance) * 1000, // km to meters
      });

      await patchShoe(dto);
      console.log('✅ [EditShoeView] 신발 수정 완료');

      // 성공 콜백 호출
      if (!isCurrent()) return;
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('❌ [EditShoeView] 신발 수정 실패:', error);
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
            label={t("브랜드")}
            placeholder={t("신발의 브랜드를 입력해주세요.")}
            value={brand}
            onChangeText={handleBrandChange}
            editable={!isSubmitting}
          />

          {/* 모델명 입력 */}
          <InputField
            label={t("모델명")}
            placeholder={t("신발의 모델명을 입력해주세요.")}
            value={model}
            onChangeText={handleModelChange}
            editable={!isSubmitting}
          />

          {/* 목표 거리 입력 */}
          <InputField
            label={t("목표 거리 (km)")}
            placeholder={t("목표 거리를 입력해주세요.")}
            value={targetDistance}
            onChangeText={handleTargetDistanceChange}
            editable={!isSubmitting}
            keyboardType="numeric"
            error={targetDistanceError}
          />

          {/* 수정 버튼 */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              !isFormValid() && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
          >
            <Text style={styles.submitButtonText}>{t("신발 수정하기")}</Text>
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
 * Figma: 뒤로가기 + "신발 수정"
 */
interface HeaderProps {
  onClose?: (() => void) | undefined;
}

const Header: React.FC<HeaderProps> = ({ onClose }) => {
  useAppLanguage();
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onClose} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={GREY[900]} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t("신발 수정")}</Text>
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
  editable: boolean;
  keyboardType?: 'default' | 'numeric';
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  editable,
  keyboardType = 'default',
  error,
}) => {
  useAppLanguage();
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholder={placeholder}
        placeholderTextColor={GREY[300]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
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

  // ===== 수정 버튼 =====
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
