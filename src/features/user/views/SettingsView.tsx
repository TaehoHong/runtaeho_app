import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { Text } from '~/shared/components/typography';
import { GREY, RED } from '~/shared/styles';
import { userService } from '../services/userService';

/**
 * 설정 화면
 * 고객센터, 로그아웃, 회원 탈퇴 등 계정 관련 설정
 */
export const SettingsView: React.FC = () => {
  const router = useRouter();
  const { logout } = useAuth();
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [showWithdrawAlert, setShowWithdrawAlert] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  /**
   * 고객센터 이동 핸들러
   */
  const handleCustomerService = () => {
    router.push('/user/customer-service');
  };

  /**
   * 앱 버전 정보 이동 핸들러
   */
  const handleAppVersion = () => {
    router.push('/user/app-version');
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
        '로그아웃 실패',
        '로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.',
        [{ text: '확인', style: 'default' }]
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

    try {
      setIsWithdrawing(true);
      console.log('[SettingsView] 회원 탈퇴 시작...');

      await userService.withdraw();
      await logout();

      console.log('[SettingsView] 회원 탈퇴 완료');
      setShowWithdrawAlert(false);

      router.replace('/auth/login');
    } catch (error) {
      console.error('[SettingsView] 회원 탈퇴 실패:', error);
      setShowWithdrawAlert(false);

      Alert.alert(
        '회원 탈퇴 실패',
        '회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.',
        [{ text: '확인', style: 'default' }]
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="settings-screen">
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 설정 메뉴 */}
      <View style={styles.content}>
        {/* 고객센터 섹션 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleCustomerService}
            activeOpacity={0.7}
          >
            <Text style={styles.menuItemText}>고객센터</Text>
            <Ionicons name="chevron-forward" size={20} color={GREY[300]} />
          </TouchableOpacity>
        </View>

        {/* 계정 섹션 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={() => setShowLogoutAlert(true)}
            activeOpacity={0.7}
            testID="settings-logout-menu"
          >
            <Text style={styles.menuItemText}>로그아웃</Text>
            <Ionicons name="chevron-forward" size={20} color={GREY[300]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowWithdrawAlert(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.menuItemText, styles.dangerText]}>회원 탈퇴</Text>
            <Ionicons name="chevron-forward" size={20} color={GREY[300]} />
          </TouchableOpacity>
        </View>

        {/* 앱 버전 섹션 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleAppVersion}
            activeOpacity={0.7}
          >
            <Text style={styles.menuItemText}>앱 버전</Text>
            <Ionicons name="chevron-forward" size={20} color={GREY[300]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 로그아웃 알림 */}
      <Modal
        visible={showLogoutAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutAlert(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>로그아웃</Text>
            <Text style={styles.alertMessage}>정말로 로그아웃하시겠습니까?</Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={[styles.alertButton, styles.cancelButton]}
                onPress={() => setShowLogoutAlert(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertButton, styles.confirmButton]}
                onPress={handleLogout}
                disabled={isLoggingOut}
                testID="settings-logout-confirm"
              >
                <Text style={styles.confirmButtonText}>
                  {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
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
            <Text style={styles.alertTitle}>회원 탈퇴</Text>
            <Text style={styles.alertMessage}>
              정말로 탈퇴하시겠습니까?{'\n'}
              탈퇴 후에는 계정 복구가 불가능합니다.
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={[styles.alertButton, styles.cancelButton]}
                onPress={() => setShowWithdrawAlert(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertButton, styles.dangerButton]}
                onPress={handleWithdraw}
                disabled={isWithdrawing}
              >
                <Text style={styles.confirmButtonText}>
                  {isWithdrawing ? '처리 중...' : '탈퇴하기'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
