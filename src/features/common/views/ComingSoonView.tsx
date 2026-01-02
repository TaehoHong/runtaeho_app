import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '~/shared/components/typography';
import { CONTACT } from '~/shared/constants';
import { GREY, PRIMARY } from '~/shared/styles';

interface ComingSoonViewProps {
  /** 헤더 타이틀 */
  title?: string;
}

/**
 * 준비중 화면
 * 아직 준비되지 않은 기능에 대한 안내 화면
 */
export const ComingSoonView: React.FC<ComingSoonViewProps> = ({
  title = '설정',
}) => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${CONTACT.EMAIL}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 메인 컨텐츠 */}
      <View style={styles.content}>
        {/* 준비중 카드 */}
        <View style={styles.mainCard}>
          {/* 아이콘 */}
          <View style={styles.iconContainer}>
            <Ionicons name="notifications-outline" size={32} color={PRIMARY[600]} />
          </View>

          {/* 타이틀 */}
          <Text style={styles.mainTitle}>준비중입니다</Text>

          {/* 설명 */}
          <Text style={styles.description}>
            더 나은 서비스 제공을 위해{'\n'}열심히 준비하고 있습니다
          </Text>

          {/* 돌아가기 버튼 */}
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Text style={styles.goBackButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>

        {/* 연락처 섹션 */}
        <View style={styles.contactSection}>
          <Text style={styles.contactGuide}>
            궁금한 사항이 있으시면{'\n'}아래 연락처로 문의해주세요
          </Text>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={handleEmailPress}
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={18} color={PRIMARY[600]} />
            <Text style={styles.contactEmail}>{CONTACT.EMAIL}</Text>
          </TouchableOpacity>
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
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  mainCard: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PRIMARY[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: GREY[900],
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Pretendard',
    color: GREY[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  goBackButton: {
    backgroundColor: PRIMARY[600],
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 24,
  },
  goBackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: GREY.WHITE,
  },
  contactSection: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  contactGuide: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Pretendard',
    color: GREY[500],
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactEmail: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
});
