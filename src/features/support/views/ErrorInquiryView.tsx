import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { TopScreenSafeAreaView } from '~/shared/components';
import { Text, TextInput } from '~/shared/components/typography';
import { SystemInfoManager } from '~/shared/utils/SystemInfoManager';
import { GREY, PRIMARY, RED } from '~/shared/styles';
import { inquiryService } from '../inquiryService';
import type { InquiryRequest } from '../types';

export const ErrorInquiryView: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    errorCode?: string | string[];
    screenName?: string | string[];
  }>();
  const [content, setContent] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [sendInfo, setSendInfo] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const message = validate(content, replyEmail);
    if (message) {
      setError(message);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const result = await inquiryService.submit({
        type: 'ERROR',
        title: '오류 문의',
        content: content.trim(),
        replyEmail: replyEmail.trim(),
        ...(sendInfo ? diagnostics(params) : {}),
      });
      router.replace(
        `/user/inquiry-done?trackingNo=${encodeURIComponent(result.trackingNo)}` as Href
      );
    } catch {
      Alert.alert('문의 접수 실패', '오류 문의를 접수하지 못했어요. 잠시 후 다시 보내주세요.', [
        { text: '확인' },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TopScreenSafeAreaView style={styles.container}>
      <Header title="오류 문의" onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.infoBox}>
            <View style={styles.infoIcon}>
              <Ionicons name="information-circle-outline" size={18} color={PRIMARY[700]} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>진단 정보를 선택해서 보낼 수 있어요</Text>
              <Text style={styles.infoDesc}>
                앱 버전, 기기 정보, 오류 코드, 발생 화면만 포함돼요.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Field
              label="어떤 문제가 있었나요?"
              value={content}
              onChangeText={setContent}
              placeholder="문제가 발생한 상황을 적어주세요."
              multiline
              inputStyle={styles.contentInput}
              textAlignVertical="top"
            />
            <View style={styles.line} />
            <Field
              label="답변 받을 이메일"
              value={replyEmail}
              onChangeText={setReplyEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setSendInfo((value) => !value)}
            activeOpacity={0.8}
            testID="diagnostics-toggle"
          >
            <View style={[styles.checkbox, sendInfo && styles.checkboxOn]}>
              {sendInfo && <Ionicons name="checkmark" size={15} color={GREY[900]} />}
            </View>
            <View style={styles.checkText}>
              <Text style={styles.checkTitle}>진단 정보 함께 보내기</Text>
              <Text style={styles.checkDesc}>위치 기록, 운동 기록, 개인정보는 보내지 않아요.</Text>
            </View>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabled]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={GREY[900]} />
            ) : (
              <Text style={styles.submitText}>오류 문의 보내기</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TopScreenSafeAreaView>
  );
};

const validate = (content: string, email: string): string => {
  if (!content.trim()) return '문의 내용을 입력해주세요.';
  if (!isEmail(email.trim())) return '답변 받을 이메일을 확인해주세요.';
  return '';
};

const isEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const diagnostics = (params: {
  errorCode?: string | string[];
  screenName?: string | string[];
}): Partial<InquiryRequest> => {
  const info = SystemInfoManager.getInstance().getSystemInfo();
  const errorCode = first(params.errorCode);
  const screenName = first(params.screenName);
  const request: Partial<InquiryRequest> = {
    appVersion: info.appVersion,
    buildNumber: info.buildNumber,
    deviceModel: info.deviceModel,
    osName: info.osName,
    osVersion: info.osVersion,
  };

  if (errorCode) {
    request.errorCode = errorCode;
  }

  if (screenName) {
    request.screenName = screenName;
  }

  return request;
};

const first = (value?: string | string[]): string | undefined => {
  return Array.isArray(value) ? value[0] : value;
};

interface HeaderProps {
  title: string;
  onBack: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.backButton}>
      <Ionicons name="chevron-back" size={24} color={GREY[900]} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={styles.headerRight} />
  </View>
);

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  inputStyle?: object;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  textAlignVertical?: 'top';
}

const Field: React.FC<FieldProps> = ({ label, inputStyle, ...props }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, inputStyle]}
      placeholderTextColor={GREY[400]}
      {...props}
    />
  </View>
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: GREY[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: GREY.WHITE,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: GREY[900],
  },
  headerRight: {
    width: 32,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    backgroundColor: PRIMARY[50],
    marginBottom: 16,
  },
  infoIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GREY[900],
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: GREY[600],
    lineHeight: 18,
  },
  card: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  field: {
    paddingVertical: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: GREY[900],
    marginBottom: 8,
  },
  input: {
    minHeight: 24,
    padding: 0,
    fontSize: 14,
    fontWeight: '400',
    color: GREY[900],
  },
  contentInput: {
    minHeight: 132,
    lineHeight: 20,
  },
  line: {
    height: 1,
    backgroundColor: GREY[100],
  },
  checkRow: {
    flexDirection: 'row',
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: GREY[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxOn: {
    borderColor: PRIMARY[600],
    backgroundColor: PRIMARY[600],
  },
  checkText: {
    flex: 1,
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GREY[900],
    marginBottom: 4,
  },
  checkDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: GREY[500],
    lineHeight: 18,
  },
  error: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '500',
    color: RED.DEFAULT,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: GREY[50],
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY[600],
  },
  disabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: GREY[900],
  },
});
