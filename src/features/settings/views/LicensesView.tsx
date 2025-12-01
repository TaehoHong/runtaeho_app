import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '~/shared/components/typography';
import { GREY } from '~/shared/styles';

/**
 * 라이선스 정보 타입
 */
interface LicenseInfo {
  name: string;
  version: string;
  license: string;
  repository?: string;
}

/**
 * 사용된 주요 오픈소스 라이브러리 목록
 */
const LICENSES: LicenseInfo[] = [
  { name: 'React', version: '19.1.0', license: 'MIT', repository: 'https://github.com/facebook/react' },
  { name: 'React Native', version: '0.81.5', license: 'MIT', repository: 'https://github.com/facebook/react-native' },
  { name: 'Expo', version: '54.0.20', license: 'MIT', repository: 'https://github.com/expo/expo' },
  { name: 'Expo Router', version: '6.0.6', license: 'MIT', repository: 'https://github.com/expo/router' },
  { name: 'Zustand', version: '5.0.8', license: 'MIT', repository: 'https://github.com/pmndrs/zustand' },
  { name: 'TanStack Query', version: '5.90.2', license: 'MIT', repository: 'https://github.com/TanStack/query' },
  { name: 'Axios', version: '1.12.2', license: 'MIT', repository: 'https://github.com/axios/axios' },
  { name: 'React Native Reanimated', version: '4.1.0', license: 'MIT', repository: 'https://github.com/software-mansion/react-native-reanimated' },
  { name: 'React Native Gesture Handler', version: '2.28.0', license: 'MIT', repository: 'https://github.com/software-mansion/react-native-gesture-handler' },
  { name: 'React Native Safe Area Context', version: '5.6.0', license: 'MIT', repository: 'https://github.com/th3rdwave/react-native-safe-area-context' },
  { name: 'React Native Screens', version: '4.16.0', license: 'MIT', repository: 'https://github.com/software-mansion/react-native-screens' },
  { name: 'React Native WebView', version: '13.15.0', license: 'MIT', repository: 'https://github.com/react-native-webview/react-native-webview' },
  { name: 'React Native SVG', version: '15.12.1', license: 'MIT', repository: 'https://github.com/software-mansion/react-native-svg' },
  { name: 'Expo Application', version: '7.0.7', license: 'MIT', repository: 'https://github.com/expo/expo' },
  { name: 'Expo Clipboard', version: '8.0.0', license: 'MIT', repository: 'https://github.com/expo/expo' },
  { name: 'Expo Image', version: '3.0.9', license: 'MIT', repository: 'https://github.com/expo/expo' },
  { name: 'Expo Image Picker', version: '17.0.8', license: 'MIT', repository: 'https://github.com/expo/expo' },
  { name: 'Expo Location', version: '19.0.7', license: 'MIT', repository: 'https://github.com/expo/expo' },
  { name: 'Expo Secure Store', version: '15.0.7', license: 'MIT', repository: 'https://github.com/expo/expo' },
  { name: 'Expo Constants', version: '18.0.9', license: 'MIT', repository: 'https://github.com/expo/expo' },
  { name: 'Expo Linking', version: '8.0.8', license: 'MIT', repository: 'https://github.com/expo/expo' },
  { name: 'Expo Notifications', version: '0.32.11', license: 'MIT', repository: 'https://github.com/expo/expo' },
  { name: '@expo/vector-icons', version: '15.0.2', license: 'MIT', repository: 'https://github.com/expo/vector-icons' },
  { name: '@react-native-google-signin/google-signin', version: '16.0.0', license: 'MIT', repository: 'https://github.com/react-native-google-signin/google-signin' },
  { name: '@invertase/react-native-apple-authentication', version: '2.4.1', license: 'Apache-2.0', repository: 'https://github.com/invertase/react-native-apple-authentication' },
  { name: '@sentry/react-native', version: '7.6.0', license: 'MIT', repository: 'https://github.com/getsentry/sentry-react-native' },
  { name: 'i18next', version: '25.6.3', license: 'MIT', repository: 'https://github.com/i18next/i18next' },
  { name: 'react-i18next', version: '16.3.5', license: 'MIT', repository: 'https://github.com/i18next/react-i18next' },
  { name: 'TypeScript', version: '5.9.2', license: 'Apache-2.0', repository: 'https://github.com/microsoft/TypeScript' },
].sort((a, b) => a.name.localeCompare(b.name));

/**
 * 오픈소스 라이선스 화면
 */
export const LicensesView: React.FC = () => {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleOpenRepository = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('URL 열기 실패:', error);
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>오픈소스 라이선스</Text>
        <View style={styles.headerButton} />
      </View>

      {/* 설명 */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>
          이 앱은 아래의 오픈소스 소프트웨어를 사용하고 있습니다.
        </Text>
      </View>

      {/* 라이선스 목록 */}
      <ScrollView style={styles.content}>
        <View style={styles.licenseList}>
          {LICENSES.map((item, index) => (
            <View key={`${item.name}-${index}`}>
              <TouchableOpacity
                style={styles.licenseItem}
                onPress={() => toggleExpand(index)}
                activeOpacity={0.7}
              >
                <View style={styles.licenseHeader}>
                  <Text style={styles.licenseName}>{item.name}</Text>
                  <Text style={styles.licenseVersion}>v{item.version}</Text>
                </View>
                <View style={styles.licenseRight}>
                  <Text style={styles.licenseType}>{item.license}</Text>
                  <Ionicons
                    name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={GREY[400]}
                  />
                </View>
              </TouchableOpacity>

              {/* 확장 영역 */}
              {expandedIndex === index && item.repository && (
                <View style={styles.expandedContent}>
                  <TouchableOpacity
                    style={styles.repositoryLink}
                    onPress={() => handleOpenRepository(item.repository!)}
                  >
                    <Ionicons name="logo-github" size={16} color={GREY[600]} />
                    <Text style={styles.repositoryText} numberOfLines={1}>
                      {item.repository.replace('https://github.com/', '')}
                    </Text>
                    <Ionicons name="open-outline" size={14} color={GREY[400]} />
                  </TouchableOpacity>
                </View>
              )}

              {index < LICENSES.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
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
  descriptionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: GREY.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: GREY[100],
  },
  description: {
    fontSize: 13,
    fontFamily: 'Pretendard',
    color: GREY[600],
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  licenseList: {
    marginTop: 16,
    marginHorizontal: 20,
    backgroundColor: GREY.WHITE,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 32,
  },
  licenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  licenseHeader: {
    flex: 1,
  },
  licenseName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[800],
    marginBottom: 2,
  },
  licenseVersion: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: GREY[400],
  },
  licenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  licenseType: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: GREY[500],
    backgroundColor: GREY[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  repositoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GREY[50],
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  repositoryText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Pretendard',
    color: GREY[600],
  },
  divider: {
    height: 1,
    backgroundColor: GREY[100],
    marginHorizontal: 16,
  },
});
