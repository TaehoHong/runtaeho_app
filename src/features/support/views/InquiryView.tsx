import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { GREY, PRIMARY, RED } from '~/shared/styles';
import { inquiryService } from '../inquiryService';

export const InquiryView: React.FC = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const message = validate(title, content, replyEmail);
    if (message) {
      setError(message);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const result = await inquiryService.submit({
        type: 'GENERAL',
        title: title.trim(),
        content: content.trim(),
        replyEmail: replyEmail.trim(),
      });
      router.replace(
        `/user/inquiry-done?trackingNo=${encodeURIComponent(result.trackingNo)}` as Href
      );
    } catch {
      Alert.alert('문의 접수 실패', '문의를 접수하지 못했어요. 잠시 후 다시 보내주세요.', [
        { text: '확인' },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TopScreenSafeAreaView style={styles.container}>
      <Header title="1:1 문의" onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Field
              label="제목"
              value={title}
              onChangeText={setTitle}
              placeholder="문의 제목을 입력해주세요."
              returnKeyType="next"
            />
            <View style={styles.line} />
            <Field
              label="문의 내용"
              value={content}
              onChangeText={setContent}
              placeholder="궁금한 점을 자세히 적어주세요."
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
              <Text style={styles.submitText}>문의 보내기</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TopScreenSafeAreaView>
  );
};

const validate = (title: string, content: string, email: string): string => {
  if (!title.trim()) return '제목을 입력해주세요.';
  if (!content.trim()) return '문의 내용을 입력해주세요.';
  if (!isEmail(email.trim())) return '답변 받을 이메일을 확인해주세요.';
  return '';
};

const isEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
  returnKeyType?: 'next';
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
