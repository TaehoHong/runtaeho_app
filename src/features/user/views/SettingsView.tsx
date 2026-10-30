import { t, useAppLanguage } from '~/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { TopScreenSafeAreaView } from '~/shared/components';
import { useScreenLifetime } from '~/shared/hooks/useScreenLifetime';
import { getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { Text } from '~/shared/components/typography';
import { GREY, RED } from '~/shared/styles';
import { userService } from '../services/userService';
import { useLanguageSettings } from '../hooks/useLanguageSettings';
import { useUserStore } from '~/stores/user/userStore';
import type { LanguagePreference } from '~/i18n/language';
import { useAds } from '~/features/ads/AdsProvider';

/**
 * 설정 화면
 * 고객센터, 권한 설정, 로그아웃, 회원 탈퇴
 */
export const SettingsView: React.FC = () => {
  useAppLanguage();
  const router = useRouter();
  const captureLifetime = useScreenLifetime();
  const { logout } = useAuth();
  const { privacyRequired, showPrivacyOptions } = useAds();
  const [isOpeningPrivacy, setIsOpeningPrivacy] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [showWithdrawAlert, setShowWithdrawAlert] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const language = useUserStore((state) => state.userPreferences.language);
  const saveLanguage = useLanguageSettings();
  const languageOptions: { value: LanguagePreference; label: string }[] = [
    { value: 'system', label: t("기기 설정 따르기") },
    { value: 'ko', label: '한국어' },
    { value: 'ja', label: '日本語' },
  ];
  const handleLanguageChange = async (value: LanguagePreference) => {
    if (saveLanguage.isPending) return;
    try {
      await saveLanguage.mutateAsync(value);
      setShowLanguagePicker(false);
    } catch {
      Alert.alert(t("언어 저장 실패"), t("언어 설정을 저장하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요."));
    }
  };

  /**
   * 고객센터 이동 핸들러
   */
  const handleCustomerService = () => {
    router.push('/user/customer-service');
  };

  const handlePermissionSettings = () => {
    router.push('/user/permission-settings');
  };

  /**
   * 로그아웃 핸들러
   */
  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      console.log('[SettingsView] 로그아웃 시작...');

      await logout();

      console.log('[SettingsView] 로그아웃 완료');
      setShowLogoutAlert(false);

      router.replace('/auth/login');
    } catch (error) {
      console.error('[SettingsView] 로그아웃 실패:', error);
      setShowLogoutAlert(false);

      Alert.alert(
        t("로그아웃 실패"),
        t("로그아웃 중 오류가 발생했습니다. 다시 시도해주세요."),
        [{ text: t("확인"), style: 'default' }]
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  /**
   * 회원 탈퇴 핸들러
   */
  const handleWithdraw = async () => {
    if (isWithdrawing) return;
    const isScreenCurrent = captureLifetime();
    const session = getSessionSnapshot();
    let followupSession = session;

    try {
      setIsWithdrawing(true);
      console.log('[SettingsView] 회원 탈퇴 시작...');

      await userService.withdraw();
      if (!isSessionCurrent(session)) return;
      const logoutOperation = logout();
      followupSession = getSessionSnapshot();
      await logoutOperation;

      console.log('[SettingsView] 회원 탈퇴 완료');
      setShowWithdrawAlert(false);

      // AuthProvider owns routing after logout invalidates the initiating session.
    } catch (error) {
      if (!isScreenCurrent() || !isSessionCurrent(followupSession)) return;
      console.error('[SettingsView] 회원 탈퇴 실패:', error);
      setShowWithdrawAlert(false);

      Alert.alert(
        t("회원 탈퇴 실패"),
        t("회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요."),
        [{ text: t("확인"), style: 'default' }]
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleAdPrivacy = async () => {
    if (isOpeningPrivacy) return;
    setIsOpeningPrivacy(true);
    try {
      await showPrivacyOptions();
    } catch {
      Alert.alert(t('광고 개인정보 설정'), t('설정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'));
    } finally {
      setIsOpeningPrivacy(false);
    }
  };

  return (
    <TopScreenSafeAreaView style={styles.container} testID="settings-screen">
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("설정")}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 설정 메뉴 */}
      <View style={styles.content}>
        <View style={styles.section}>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} accessibilityRole="button"
            onPress={() => router.push('/user/notification-settings')}>
            <Text style={styles.menuItemText}>{t('알림 설정')}</Text>
            <Ionicons name="chevron-forward" size={20} color={GREY[300]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={() => setShowLanguagePicker(true)}
            accessibilityRole="button"
            testID="settings-language-menu"
          >
            <Text style={styles.menuItemText}>{t("언어")}</Text>
            <Text>{languageOptions.find((option) => option.value === language)?.label}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={handleCustomerService}
            activeOpacity={0.7}
          >
            <Text style={styles.menuItemText}>{t("고객센터")}</Text>
            <Ionicons name="chevron-forward" size={20} color={GREY[300]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={handlePermissionSettings}
            activeOpacity={0.7}
          >
            <Text style={styles.menuItemText}>{t("권한 설정")}</Text>
            <Ionicons name="chevron-forward" size={20} color={GREY[300]} />
          </TouchableOpacity>

          {privacyRequired && <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={handleAdPrivacy}
            disabled={isOpeningPrivacy}
            accessibilityRole="button"
            testID="settings-ad-privacy"
          >
            <Text style={styles.menuItemText}>{t('광고 개인정보 설정')}</Text>
            <Ionicons name="chevron-forward" size={20} color={GREY[300]} />
          </TouchableOpacity>}

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={() => setShowLogoutAlert(true)}
            activeOpacity={0.7}
            testID="settings-logout-menu"
          >
            <Text style={styles.menuItemText}>{t("로그아웃")}</Text>
            <Ionicons name="chevron-forward" size={20} color={GREY[300]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowWithdrawAlert(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.menuItemText, styles.dangerText]}>{t("회원 탈퇴")}</Text>
            <Ionicons name="chevron-forward" size={20} color={GREY[300]} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showLanguagePicker} transparent animationType="fade"
        onRequestClose={() => { if (!saveLanguage.isPending) setShowLanguagePicker(false); }}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>{t("언어")}</Text>
            {languageOptions.map((option) => (
              <TouchableOpacity key={option.value} style={styles.menuItem}
                onPress={() => void handleLanguageChange(option.value)}
                disabled={saveLanguage.isPending} accessibilityRole="radio"
                accessibilityState={{ checked: option.value === language, disabled: saveLanguage.isPending }}
                testID={`settings-language-${option.value}`}>
                <Text style={styles.menuItemText}>{option.label}</Text>
                {option.value === language && <Ionicons name="checkmark" size={20} color={GREY[900]} />}
              </TouchableOpacity>
            ))}
            {saveLanguage.isPending && <Text accessibilityRole="alert">{t("저장 중...")}</Text>}
            <TouchableOpacity style={[styles.alertButton, styles.cancelButton]}
              onPress={() => setShowLanguagePicker(false)} disabled={saveLanguage.isPending}>
              <Text style={styles.cancelButtonText}>{t("취소")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 로그아웃 알림 */}
      <Modal
        visible={showLogoutAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutAlert(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>{t("로그아웃")}</Text>
            <Text style={styles.alertMessage}>{t("정말로 로그아웃하시겠습니까?")}</Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={[styles.alertButton, styles.cancelButton]}
                onPress={() => setShowLogoutAlert(false)}
              >
                <Text style={styles.cancelButtonText}>{t("취소")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertButton, styles.confirmButton]}
                onPress={handleLogout}
                disabled={isLoggingOut}
                testID="settings-logout-confirm"
              >
                <Text style={styles.confirmButtonText}>
                  {isLoggingOut ? t("로그아웃 중...") : t("로그아웃")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 회원 탈퇴 알림 */}
      <Modal
        visible={showWithdrawAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWithdrawAlert(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>{t("회원 탈퇴")}</Text>
            <Text style={styles.alertMessage}>{t("정말로 탈퇴하시겠습니까?")}{'\n'}{t("탈퇴 후에는 계정 복구가 불가능합니다.")}</Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={[styles.alertButton, styles.cancelButton]}
                onPress={() => setShowWithdrawAlert(false)}
              >
                <Text style={styles.cancelButtonText}>{t("취소")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertButton, styles.dangerButton]}
                onPress={handleWithdraw}
                disabled={isWithdrawing}
              >
                <Text style={styles.confirmButtonText}>
                  {isWithdrawing ? t("처리 중...") : t("탈퇴하기")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TopScreenSafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  section: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: GREY[100],
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  dangerText: {
    color: RED[400],
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    minWidth: 300,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Pretendard',
    marginBottom: 10,
    textAlign: 'center',
    color: GREY[900],
  },
  alertMessage: {
    fontSize: 16,
    fontFamily: 'Pretendard',
    marginBottom: 20,
    textAlign: 'center',
    color: GREY[600],
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: GREY[100],
  },
  cancelButtonText: {
    color: GREY[600],
    fontSize: 16,
    fontFamily: 'Pretendard',
  },
  confirmButton: {
    backgroundColor: RED[400],
  },
  dangerButton: {
    backgroundColor: RED[400],
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard',
  },
});
