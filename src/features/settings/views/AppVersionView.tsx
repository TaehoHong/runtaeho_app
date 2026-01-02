import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '~/shared/components/typography';
import { GREY } from '~/shared/styles';

// 앱 아이콘 이미지
const APP_ICON = require('../../../../assets/images/icon.png');

/**
 * 앱 버전 정보 화면
 */
export const AppVersionView: React.FC = () => {
  const router = useRouter();

  // 앱 버전 정보
  const appVersion = Application.nativeApplicationVersion ?? '1.0.0';
  const buildNumber = Application.nativeBuildVersion ?? '1';
  const currentYear = new Date().getFullYear();

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>버전 정보</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 컨텐츠 */}
      <View style={styles.content}>
        {/* 앱 아이콘 */}
        <View style={styles.iconContainer}>
          <Image
            source={APP_ICON}
            style={styles.appIcon}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </View>

        {/* 버전 정보 */}
        <Text style={styles.versionText}>{appVersion} 버전</Text>
        <Text style={styles.buildText}>빌드: {buildNumber}</Text>

        {/* 저작권 */}
        <View style={styles.copyrightContainer}>
          <Text style={styles.copyrightText}>
            Copyright {currentYear} RunTaeho
          </Text>
          <Text style={styles.copyrightText}>All Rights Reserved</Text>
        </View>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 32,
    backgroundColor: GREY.WHITE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    marginBottom: 32,
  },
  appIcon: {
    width: '100%',
    height: '100%',
  },
  versionText: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[700],
    marginBottom: 8,
  },
  buildText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Pretendard',
    color: GREY[500],
    marginBottom: 40,
  },
  copyrightContainer: {
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Pretendard',
    color: GREY[400],
    lineHeight: 18,
  },
});
