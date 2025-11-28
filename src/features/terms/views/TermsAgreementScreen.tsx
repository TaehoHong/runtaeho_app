/**
 * 약관 동의 화면
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTermsStore } from '../stores';
import { useTermsAgreement } from '../hooks';
import { TermType } from '../models/types';
import { Colors } from '~/shared/styles';

export const TermsAgreementScreen: React.FC = () => {
  const {
    termsData,
    isLoading,
    error,
    agreements,
    setAgreement,
    setAllAgreements,
    fetchTermsContent,
    getTermByType,
  } = useTermsStore();

  const { isSubmitting, canProceed, submitAgreement } = useTermsAgreement();

  // 약관 내용 로드 (제출 중이 아닐 때만 - 제출 완료 후 리렌더링 방지)
  useEffect(() => {
    if (!isSubmitting && !termsData) {
      fetchTermsContent();
    }
  }, [fetchTermsContent, isSubmitting, termsData]);

  // 전체 동의 여부 확인
  const isAllAgreed = agreements.terms && agreements.privacy && agreements.location;

  // 전체 동의 토글
  const handleToggleAll = () => {
    setAllAgreements(!isAllAgreed);
  };

  // 약관 링크 열기
  const openTermsLink = async (link: string, title: string) => {
    try {
      const canOpen = await Linking.canOpenURL(link);
      if (canOpen) {
        await Linking.openURL(link);
      } else {
        Alert.alert('오류', `${title}을(를) 열 수 없습니다.`);
      }
    } catch (error) {
      console.error('❌ [TERMS] 링크 열기 실패:', error);
      Alert.alert('오류', '약관을 열 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // 로딩 중 또는 제출 완료 후 라우팅 대기 중
  if (isLoading || (isSubmitting && !error)) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.PRIMARY[600]} />
            <Text style={styles.loadingText}>
              {isSubmitting ? '약관 동의 처리 중...' : '약관을 불러오는 중...'}
            </Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // 에러 발생 (제출 중이 아닐 때만)
  if (!isSubmitting && (error || !termsData)) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || '약관을 불러올 수 없습니다.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTermsContent}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // 약관 아이템 가져오기
  const serviceTerm = getTermByType(TermType.SERVICE);
  const privateTerm = getTermByType(TermType.PRIVATE);
  const locationTerm = getTermByType(TermType.LOCATION);

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>RunTaeho 시작하기</Text>
          <Text style={styles.subtitle}>아래 약관에 동의해주세요</Text>
        </View>

        {/* 전체 동의 */}
        <TouchableOpacity
          style={styles.allAgreeButton}
          onPress={handleToggleAll}
          activeOpacity={0.7}
        >
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isAllAgreed && styles.checkboxChecked]}>
              {isAllAgreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.allAgreeText}>전체 동의</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 서비스 이용약관 (필수) */}
        {serviceTerm && (
          <View style={styles.termsItem}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreement(TermType.SERVICE, !agreements.terms)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreements.terms && styles.checkboxChecked]}>
                {agreements.terms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsLabel}>
                <Text style={styles.required}>(필수)</Text> 서비스 이용약관
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openTermsLink(serviceTerm.link, '서비스 이용약관')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewDetail}>자세히 보기 &gt;</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 개인정보 처리방침 (필수) */}
        {privateTerm && (
          <View style={styles.termsItem}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreement(TermType.PRIVATE, !agreements.privacy)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreements.privacy && styles.checkboxChecked]}>
                {agreements.privacy && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsLabel}>
                <Text style={styles.required}>(필수)</Text> 개인정보 처리방침
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openTermsLink(privateTerm.link, '개인정보 처리방침')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewDetail}>자세히 보기 &gt;</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 위치기반서비스 이용약관 (필수) */}
        {locationTerm && (
          <View style={styles.termsItem}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreement(TermType.LOCATION, !agreements.location)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreements.location && styles.checkboxChecked]}>
                {agreements.location && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsLabel}>
                <Text style={styles.required}>(필수)</Text> 위치기반서비스 이용약관
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openTermsLink(locationTerm.link, '위치기반서비스 이용약관')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewDetail}>자세히 보기 &gt;</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 제출 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            !canProceed && styles.submitButtonDisabled,
          ]}
          onPress={submitAgreement}
          disabled={!canProceed || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>동의하고 시작하기</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.GREY[500],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.RED.DEFAULT,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.PRIMARY[600],
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.GREY[900],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.GREY[500],
  },
  allAgreeButton: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: Colors.GREY[50],
    borderRadius: 8,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.GREY[200],
    marginBottom: 16,
  },
  termsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.GREY[100],
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.GREY[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.PRIMARY[600],
    borderColor: Colors.PRIMARY[600],
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  allAgreeText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.GREY[900],
  },
  termsLabel: {
    fontSize: 16,
    color: Colors.GREY[900],
  },
  required: {
    color: Colors.RED.DEFAULT,
    fontWeight: '600',
  },
  viewDetail: {
    fontSize: 14,
    color: Colors.GREY[500],
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.GREY[100],
  },
  submitButton: {
    height: 56,
    backgroundColor: Colors.PRIMARY[600],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.GREY[300],
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
