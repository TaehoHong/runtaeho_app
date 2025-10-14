import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Text } from '~/shared/components/typography';
import { Icon } from '~/shared/components/ui';
import { useUserStore } from '~/stores/user/userStore';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { PointHistoryView } from '~/features/point/views';
import { ShoesListView } from '~/features/shoes/views';
import { AvatarView } from '~/features/avatar/views';
import type { User } from '../models';

/**
 * 내정보 화면
 * iOS MyInfoView 대응
 * 프로필 카드 + 메인 메뉴 + 설정 메뉴 + 로그아웃
 */
export const MyInfoView: React.FC = () => {
  const currentUser = useUserStore((state) => state.currentUser);
  const totalPoint = useUserStore((state) => state.totalPoint);
  const logout = useUserStore((state) => state.logout);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [showShoesModal, setShowShoesModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  console.log('👤 [MyInfoView] 내정보 화면 렌더링');

  const handleLogout = () => {
    console.log('🚪 [MyInfoView] 로그아웃 실행');
    logout();
    setShowLogoutAlert(false);
  };

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
          onAvatarPress={() => setShowAvatarModal(true)}
        />
        
        {/* 메뉴 설정 카드 */}
        <MenuSettingsCard />
        
        {/* 로그아웃 버튼 */}
        <LogoutButton onPress={() => setShowLogoutAlert(true)} />
      </ScrollView>
      
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
                style={[styles.alertButton, styles.logoutButton]} 
                onPress={handleLogout}
              >
                <Text style={styles.logoutButtonText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 마네도들 - iOS fullScreenCover 대응 */}
      <PointModal visible={showPointModal} onClose={() => setShowPointModal(false)} />
      <ShoesModal visible={showShoesModal} onClose={() => setShowShoesModal(false)} />
      <AvatarModal visible={showAvatarModal} onClose={() => setShowAvatarModal(false)} />
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
  	// 프로필 이미지 source 결정
  	const imageSource = user?.profileImageURL
      ? { uri: user.profileImageURL }  // URL인 경우 객체로 감싸기
      : require('assets/images/default-profile-image.png');  // 로컬 파일

  	return (
        <View style={[styles.profileCard]}>
            <View style={[styles.profileHeader, styles.rowCentered]}>
                <Image
                  style={styles.profileImage}
                  source={imageSource}
                  contentFit="cover"
                 />
                <View style={styles.usernameContainer}>
                    <Text style={styles.username}>{user?.nickname || '사용자'}</Text>
                    <Icon name="pencil" size={18} />
                </View>
            </View>
            <View style={styles.horizontalDivider} />
            <View style={[styles.pointRow, styles.rowCentered]}>
                <View style={[styles.pointLabel, styles.rowCentered]}>
                    <Icon name="point" size={24} />
                    <Text style={[styles.pointLabelText, styles.pointColor]}>포인트</Text>
                </View>
                  <TouchableOpacity onPress={onPointPress}>
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
}

/**
 * 개별 메뉴 아이템 컴포넌트
 */
const MenuItem: React.FC<MenuItemProps> = ({ title, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.menuItem, styles.rowCentered]}
      onPress={onPress}
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
 * iOS MenuSettingsCard 대응
 */
const MenuSettingsCard: React.FC<MenuSettingsCardProps> = ({ items }) => {
  const defaultMenuItems: MenuItemProps[] = [
    { title: '연결 계정 관리', onPress: () => console.log('연결 계정 관리') },
    { title: '공지사항', onPress: () => console.log('공지사항') },
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

/**
 * 로그아웃 버튼
 * iOS LogoutButton 대응
 */
interface LogoutButtonProps {
  onPress: () => void;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.logoutButtonContainer} onPress={onPress}>
      <Ionicons name="log-out-outline" size={18} color="#FF6B6B" />
      <Text style={styles.logoutButtonText}>로그아웃</Text>
    </TouchableOpacity>
  );
};

/**
 * 모달 컴포넌트들
 * iOS fullScreenCover 대응
 */
interface ModalProps {
  visible: boolean;
  onClose: () => void;
}

const PointModal: React.FC<ModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <PointHistoryView onClose={onClose} />
    </Modal>
  );
};

const ShoesModal: React.FC<ModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ShoesListView onClose={onClose} />
    </Modal>
  );
};

const AvatarModal: React.FC<ModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <AvatarView onClose={onClose} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    width: 162,
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
    color: '#414141',
    textAlign: 'left',
  },
  menuSettingsSection: {
    // width: '100%',
    padding: 16,
    gap: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#202020',
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
    color: '#414141',
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Pretendard',
    textAlign: 'left',
  },
  logoutButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 16,
  },
  logoutButtonText: {
    fontSize: 24,
    color: '#FF6B6B',
    marginLeft: 8,
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
    marginBottom: 10,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
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
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowCentered: {
      alignItems: "center",
      flexDirection: "row"
  },
  pointColor: {
      color: "#414141",
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
      height: 60
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
      color: "#2b2b2b",
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
      borderColor: "#f5f5f5",
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
      color: "#9d9d9d"
  }
});

