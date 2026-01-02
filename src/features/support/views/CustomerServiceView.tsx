import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '~/shared/components/typography';
import { CONTACT } from '~/shared/constants';
import { GREY, PRIMARY } from '~/shared/styles';

/**
 * 메뉴 아이템 타입
 */
interface MenuItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor: string;
  title: string;
  description: string;
  showNewBadge?: boolean;
  onPress: () => void;
}

/**
 * 고객센터 화면
 * 1:1 문의, FAQ, 공지사항 등 고객 지원 메뉴
 */
export const CustomerServiceView: React.FC = () => {
  const router = useRouter();

  /**
   * 이메일 문의 핸들러
   */
  const handleEmailPress = () => {
    Linking.openURL(`mailto:${CONTACT.EMAIL}`);
  };

  /**
   * 메뉴 아이템 목록
   */
  const menuItems: MenuItem[] = [
    {
      id: 'inquiry',
      icon: 'chatbubble-outline',
      iconBackgroundColor: '#E8F5E9',
      title: '1:1 문의',
      description: '빠른 답변을 받아보세요',
      onPress: () => {
        router.push('/user/inquiry');
      },
    },
    {
      id: 'faq',
      icon: 'document-text-outline',
      iconBackgroundColor: '#E8F5E9',
      title: '자주 묻는 질문',
      description: 'FAQ를 확인하세요',
      onPress: () => {
        router.push('/user/faq');
      },
    },
    {
      id: 'notice',
      icon: 'notifications-outline',
      iconBackgroundColor: '#E8F5E9',
      title: '공지사항',
      description: '최신 소식을 확인하세요',
      showNewBadge: true,
      onPress: () => {
        router.push('/user/notice');
      },
    },
  ];

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
        <Text style={styles.headerTitle}>고객센터</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 메인 컨텐츠 */}
      <View style={styles.content}>
        {/* 메뉴 리스트 */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && styles.menuItemBorder,
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              {/* 아이콘 */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: item.iconBackgroundColor },
                ]}
              >
                <Ionicons name={item.icon} size={20} color={PRIMARY[600]} />
              </View>

              {/* 텍스트 */}
              <View style={styles.menuTextContainer}>
                <View style={styles.menuTitleRow}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  {item.showNewBadge && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>

              {/* 화살표 */}
              <Ionicons name="chevron-forward" size={20} color={GREY[300]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* 연락처 섹션 */}
        <View style={styles.contactSection}>
          <Text style={styles.contactSectionTitle}>연락처</Text>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={handleEmailPress}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-outline" size={20} color={GREY[500]} />
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>이메일 문의</Text>
              <Text style={styles.contactValue}>{CONTACT.EMAIL}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 운영 시간 안내 */}
        <View style={styles.operatingHoursContainer}>
          <View style={styles.operatingHoursContent}>
            <Ionicons name="time-outline" size={16} color={PRIMARY[700]} />
            <Text style={styles.operatingHoursText}>
              {CONTACT.OPERATING_HOURS}
            </Text>
          </View>
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
  },
  menuSection: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: GREY[100],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  newBadge: {
    backgroundColor: PRIMARY[600],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: GREY.WHITE,
    letterSpacing: 0.4,
  },
  menuDescription: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Pretendard',
    color: GREY[500],
    marginTop: 4,
  },
  contactSection: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  contactSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: GREY[900],
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Pretendard',
    color: GREY[500],
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[900],
    marginTop: 4,
  },
  operatingHoursContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: PRIMARY[50],
    borderRadius: 12,
  },
  operatingHoursContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  operatingHoursText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: PRIMARY[700],
  },
});
