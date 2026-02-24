import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '~/shared/components/typography';
import { Icon } from '~/shared/components/ui';
import { GREY, PRIMARY } from '~/shared/styles';

/**
 * 문의하기 이메일 주소
 */
const SUPPORT_EMAIL = 'support@runtaeho.com';

/**
 * 앱 아이콘 이미지
 */
const APP_ICON = require('assets/images/icon.png');

/**
 * 앱 정보 화면
 * - 앱 버전 정보
 * - 오픈소스 라이선스
 * - 문의하기
 */
export const AppInfoView: React.FC = () => {
  const router = useRouter();

  // 앱 버전 정보
  const appVersion = Constants.expoConfig?.version || Application.nativeApplicationVersion || '1.0.0';
  const buildNumber = Application.nativeBuildVersion || '1';
  const appName = Constants.expoConfig?.name || 'RunTaeho';

  /**
   * 이메일로 문의하기
   */
  const handleContact = async () => {
    const subject = encodeURIComponent(`[${appName}] 문의하기`);
    const body = encodeURIComponent(
      `\n\n\n---\n앱 버전: ${appVersion} (${buildNumber})\n기기: ${Platform.OS} ${Platform.Version}`
    );
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          '이메일 앱 없음',
          `이메일 앱을 찾을 수 없습니다.\n\n문의 이메일: ${SUPPORT_EMAIL}`,
          [
            {
              text: '이메일 복사',
              onPress: async () => {
                await Clipboard.setStringAsync(SUPPORT_EMAIL);
                Alert.alert('복사 완료', '이메일 주소가 클립보드에 복사되었습니다.');
              },
            },
            { text: '확인', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('이메일 열기 실패:', error);
      Alert.alert('오류', '이메일 앱을 열 수 없습니다.');
    }
  };

  /**
   * 오픈소스 라이선스 보기
   */
  const handleOpenSourceLicenses = () => {
    router.push('/user/licenses' as any);
  };

  /**
   * 뒤로가기
   */
  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>앱 정보</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* 앱 로고 및 버전 */}
        <View style={styles.appInfoSection}>
          <View style={styles.appIconContainer}>
            <Image source={APP_ICON} style={styles.appIcon} contentFit="cover" />
          </View>
          <Text style={styles.appName}>{appName}</Text>
          <Text style={styles.appVersion}>버전 {appVersion} ({buildNumber})</Text>
        </View>

        {/* 메뉴 카드 */}
        <View style={styles.menuCard}>
          {/* 문의하기 */}
          <TouchableOpacity style={styles.menuItem} onPress={handleContact}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="mail-outline" size={20} color={GREY[700]} />
              <Text style={styles.menuItemText}>문의하기</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Text style={styles.menuItemSubtext}>{SUPPORT_EMAIL}</Text>
              <Icon name="chevron" size={16} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* 오픈소스 라이선스 */}
          <TouchableOpacity style={styles.menuItem} onPress={handleOpenSourceLicenses}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={20} color={GREY[700]} />
              <Text style={styles.menuItemText}>오픈소스 라이선스</Text>
            </View>
            <Icon name="chevron" size={16} />
          </TouchableOpacity>
        </View>

        {/* 저작권 */}
        <Text style={styles.copyright}>
          © {new Date().getFullYear()} RunTaeho. All rights reserved.
        </Text>
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: GREY[100],
  },
  headerButton: {
    padding: 4,
    minWidth: 44,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 32,
    paddingBottom: 40,
  },
  appInfoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: PRIMARY[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  appIcon: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Pretendard',
    color: GREY[900],
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    fontFamily: 'Pretendard',
    color: GREY[500],
  },
  menuCard: {
    marginHorizontal: 20,
    backgroundColor: GREY.WHITE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[800],
  },
  menuItemSubtext: {
    fontSize: 13,
    fontFamily: 'Pretendard',
    color: GREY[400],
  },
  divider: {
    height: 1,
    backgroundColor: GREY[100],
    marginHorizontal: 16,
  },
  copyright: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: GREY[400],
    textAlign: 'center',
    marginTop: 32,
  },
});
