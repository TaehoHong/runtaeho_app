import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from '~/features/auth/hooks/useAuth';
import { PointHistoryView } from '~/features/point/views';
import { ShoesListView } from '~/features/shoes/views';
import { Text } from '~/shared/components/typography';
import { Icon } from '~/shared/components/ui';
import { GREY } from '~/shared/styles';
import type { User } from '../models';

/**
 * 내정보 화면
 * iOS MyInfoView 대응
 * 프로필 카드 + 메인 메뉴 + 설정 메뉴 + 로그아웃
 */
export const MyInfoView: React.FC = () => {
  // useAuth Hook 사용 (현업 표준 패턴)
  const { user: currentUser, totalPoint } = useAuth();
  const router = useRouter();
  const [showPointModal, setShowPointModal] = useState(false);
  const [showShoesModal, setShowShoesModal] = useState(false);

  console.log('👤 [MyInfoView] 내정보 화면 렌더링');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* 프로필 카드 */}
        <ProfileCard 
          user={currentUser} 
          totalPoint={totalPoint}
          onPointPress={() => setShowPointModal(true)}
        />
        
        {/* 메인 메뉴 카드 */}
        <MainMenuCard
          onShoesPress={() => setShowShoesModal(true)}
          onAvatarPress={() => router.push('/user/avatar')}
        />
        
        {/* 메뉴 설정 카드 */}
        <MenuSettingsCard />
      </ScrollView>

      {/* 모달들 - iOS fullScreenCover 대응 */}
      <PointModal visible={showPointModal} onClose={() => setShowPointModal(false)} />
      <ShoesModal visible={showShoesModal} onClose={() => setShowShoesModal(false)} />
    </SafeAreaView>
  );
};

/**
 * 프로필 카드
 */
interface ProfileCardProps {
  user: User | null;
  totalPoint: number;
  onPointPress: () => void;
}


const ProfileCard: React.FC<ProfileCardProps> = ({ user, totalPoint, onPointPress }) => {
  const router = useRouter();

  // 프로필 이미지 source 결정
  const imageSource = user?.profileImageURL
    ? { uri: user.profileImageURL }  // URL인 경우 객체로 감싸기
    : require('assets/images/default-profile-image.png');  // 로컬 파일

  const handleEditProfile = () => {
    router.push('/user/profile-edit');
  };

  return (
    <View style={[styles.profileCard]}>
      <TouchableOpacity
        style={[styles.profileHeader, styles.rowCentered]}
        onPress={handleEditProfile}
      >
        <Image
          style={styles.profileImage}
          source={imageSource}
          contentFit="cover"
        />
        <View style={styles.usernameContainer}>
          <Text style={styles.username}>{user?.nickname || '사용자'}</Text>
          <Icon name="pencil" size={18} />
        </View>
      </TouchableOpacity>
            <View style={styles.horizontalDivider} />
            <View style={[styles.pointRow, styles.rowCentered]}>
                <View style={[styles.pointLabel, styles.rowCentered]}>
                    <Icon name="point" size={24} />
                    <Text style={[styles.pointLabelText, styles.pointColor]}>포인트</Text>
                </View>
                  <TouchableOpacity onPress={onPointPress} testID="myinfo-point-history-open">
                  <View style={[styles.pointValue, styles.rowCentered]}>
                      <Text style={[styles.pointValueText, styles.pointColor]}>{ totalPoint || 0 } P</Text>
                      <Icon style={styles.chevronIcon} name="chevron" size={16} />
                  </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

/**
 * 메인 메뉴 카드
 * iOS MainMenuCard 대응
 */
interface MainMenuCardProps {
  onShoesPress: () => void;
  onAvatarPress: () => void;
}

const MainMenuCard: React.FC<MainMenuCardProps> = ({ onShoesPress, onAvatarPress }) => {
  return (
    <View style={[styles.mainMenuCard, styles.rowCentered]}>
      <TouchableOpacity
        style={[styles.menuItemButton, styles.rowCentered]}
        onPress={onShoesPress}
      >
        <Icon name="pixel_shoes" size={24} />
        <Text style={styles.menuItemLabel}>내 신발</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuItemButton, styles.rowCentered]}
        onPress={onAvatarPress}
      >
        <Icon name="avatar" size={24} />
        <Text style={styles.menuItemLabel}>아바타</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * 메뉴 아이템 Props
 */
interface MenuItemProps {
  title: string;
  onPress: () => void;
  testID?: string;
}

/**
 * 개별 메뉴 아이템 컴포넌트
 */
const MenuItem: React.FC<MenuItemProps> = ({ title, onPress, testID }) => {
  return (
    <TouchableOpacity
      style={[styles.menuItem, styles.rowCentered]}
      onPress={onPress}
      testID={testID}
    >
      <Text style={styles.menuItemText}>{title}</Text>
      <Icon name="chevron" size={16} />
    </TouchableOpacity>
  );
};

/**
 * 메뉴 설정 카드 Props
 */
interface MenuSettingsCardProps {
  items?: MenuItemProps[];
}

/**
 * 메뉴 설정 카드
 */
const MenuSettingsCard: React.FC<MenuSettingsCardProps> = ({ items }) => {
  const router = useRouter();

  const defaultMenuItems: MenuItemProps[] = [
    { title: '연결 계정 관리', onPress: () => router.push('/user/account-connection') },
    { title: '약관 및 정책', onPress: () => router.push('/user/terms-list') },
    { title: '설정', onPress: () => router.push('/user/settings'), testID: 'myinfo-menu-settings' },
  ];

  const menuItems = items || defaultMenuItems;

  return (
    <View style={styles.menuSettingsSection}>
      <Text style={styles.sectionTitle}>서비스</Text>
      <View style={styles.menuItemsContainer}>
        {menuItems.map((item, index) => (
          <MenuItem key={index} {...item} />
        ))}
      </View>
    </View>
  );
};


interface ModalProps {
  visible: boolean;
  onClose: () => void;
}

const PointModal: React.FC<ModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <PointHistoryView onClose={onClose} />
    </Modal>
  );
};

const ShoesModal: React.FC<ModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <ShoesListView onClose={onClose} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREY[50],
  },
  scrollView: {
    flex: 1,
  },
  mainMenuCard: {
    width: '100%',
    gap: 11,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  menuItemButton: {
    flex: 1,  // 균등 분할
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 14,
    gap: 8,
  },
  menuItemLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[800],
    textAlign: 'left',
  },
  menuSettingsSection: {
    // width: '100%',
    padding: 16,
    gap: 20,
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: GREY[900],
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Pretendard',
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  menuItemsContainer: {
    alignSelf: 'stretch',
    gap: 20,
  },
  menuItem: {
    gap: 8,
    alignSelf: 'stretch',
  },
  menuItemText: {
    fontWeight: '500',
    color: GREY[800],
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Pretendard',
    textAlign: 'left',
  },
  rowCentered: {
      alignItems: "center",
      flexDirection: "row"
  },
  pointColor: {
      color: GREY[800],
      lineHeight: 18,
      fontFamily: "Pretendard"
  },
  profileCard: {
    marginTop: 24,
    marginBottom:14,
    marginHorizontal:20,
    paddingHorizontal: 12,   // 내부 패딩
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  profileHeader: {
      width: 173,
      gap: 12
  },
  profileImage: {
      width: 60,
      borderRadius: 60,
      height: 60,
      backgroundColor: GREY[300],
  },
  usernameContainer: {
      alignItems: "flex-end",
      gap: 2,
      flexDirection: "row"
  },
  username: {
      fontSize: 16,
      letterSpacing: 0.5,
      lineHeight: 24,
      color: GREY[900],
      textAlign: "left",
      fontFamily: "Pretendard",
      fontWeight: "600"
  },
  editIcon: {
      width: 18,
      borderRadius: 32,
      height: 18,
      color: "#fff"
  },
  horizontalDivider: {
      borderStyle: "solid",
      borderColor: GREY[50],
      borderTopWidth: 0.8,
      height: 1,
      alignSelf: "stretch"
  },
  pointRow: {
      gap: 168,
      alignSelf: "stretch"
  },
  pointLabel: {
      gap: 6
  },
  pointIcon: {
      width: 24,
      height: 24
  },
  pointLabelText: {
      fontSize: 13,
      fontWeight: "500",
      textAlign: "left"
  },
  pointValue: {
      gap: 4
  },
  pointValueText: {
      width: 58,
      fontSize: 14,
      textAlign: "right",
      fontWeight: "600",
      lineHeight: 18
  },
  chevronIcon: {
      width: 16,
      height: 16,
      color: GREY[500]
  }
});
