import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useUserStore } from '~/stores/user/userStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

/**
 * 내정보 화면
 * iOS MyInfoView 대응
 * 프로필 카드 + 메인 메뉴 + 설정 메뉴 + 로그아웃
 */
export const MyInfoView: React.FC = () => {
  const currentUser = useUserStore((state) => state.currentUser);
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
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* 프로필 카드 */}
        <ProfileCard user={currentUser} />
        
        {/* 메인 메뉴 카드 */}
        <MainMenuCard 
          onPointPress={() => setShowPointModal(true)}
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
    </View>
  );
};

/**
 * 프로필 카드
 * iOS ProfileCard 대응
 */
interface ProfileCardProps {
  user: any;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ user }) => {
  // TODO: totalPoint 데이터 연동
  const totalPoint = 0;
  
  return (
    <View style={styles.profileCard}>
      <View style={styles.profileImageContainer}>
        <View style={styles.profileImage} />
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.nickname}>{user?.nickname || '사용자'}</Text>
        <Text style={styles.userLevel}>러너 Lv.{user?.level || 1} | 포인트: {totalPoint}P</Text>
      </View>
    </View>
  );
};

/**
 * 메인 메뉴 카드
 * iOS MainMenuCard 대응
 */
interface MainMenuCardProps {
  onPointPress: () => void;
  onShoesPress: () => void;
  onAvatarPress: () => void;
}

const MainMenuCard: React.FC<MainMenuCardProps> = ({ onPointPress, onShoesPress, onAvatarPress }) => {
  const totalPoint = 0; // TODO: Redux에서 가져오기
  
  return (
    <View style={styles.mainMenuCard}>
      <TouchableOpacity style={styles.menuItem} onPress={onPointPress}>
        <Ionicons name="diamond-outline" size={24} color="#4d99e5" />
        <Text style={styles.menuItemValue}>{totalPoint}</Text>
      </TouchableOpacity>
      
      <View style={styles.verticalDivider} />
      
      <TouchableOpacity style={styles.menuItem} onPress={onShoesPress}>
        <Ionicons name="footsteps-outline" size={24} color="#4d99e5" />
        <Text style={styles.menuItemText}>내 신발</Text>
      </TouchableOpacity>
      
      <View style={styles.verticalDivider} />
      
      <TouchableOpacity style={styles.menuItem} onPress={onAvatarPress}>
        <Ionicons name="person-outline" size={24} color="#4d99e5" />
        <Text style={styles.menuItemText}>아바타</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * 메뉴 설정 카드
 * iOS MenuSettingsCard 대응
 */
const MenuSettingsCard: React.FC = () => {
  const menuItems = [
    { title: '계정 연결', onPress: () => console.log('계정 연결') },
    { title: '통계', onPress: () => router.push('/(tabs)/statistics') },
    { title: '공지사항', onPress: () => console.log('공지사항') },
    { title: '약관', onPress: () => console.log('약관') },
  ];
  
  return (
    <View style={styles.menuSettingsCard}>
      {menuItems.map((item, index) => (
        <View key={index}>
          <TouchableOpacity style={styles.menuSettingRow} onPress={item.onPress}>
            <Text style={styles.menuSettingTitle}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
          {index < menuItems.length - 1 && <View style={styles.horizontalDivider} />}
        </View>
      ))}
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
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>포인트</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.modalContent}>
          <Text>포인트 내역 화면</Text>
          <Text>필터 옵션</Text>
        </View>
      </View>
    </Modal>
  );
};

const ShoesModal: React.FC<ModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>내 신발</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.modalContent}>
          <Text>신발 목록</Text>
          <Text>+ 신발 추가</Text>
        </View>
      </View>
    </Modal>
  );
};

const AvatarModal: React.FC<ModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>아바타</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.modalContent}>
          <Text>Unity 캐릭터</Text>
          <Text>아이템 목록</Text>
          <Text>구매/착용</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  profileImageContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 83,
    height: 83,
    borderRadius: 41.5,
    backgroundColor: '#d9d9d9',
    borderWidth: 2,
    borderColor: '#4d99e5',
  },
  profileInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 8,
  },
  userLevel: {
    fontSize: 16,
    color: '#808080',
  },
  mainMenuCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  menuItemValue: {
    fontSize: 29,
    fontWeight: 'bold',
    color: 'black',
  },
  menuItemText: {
    fontSize: 29,
    fontWeight: 'bold',
    color: 'black',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#e6e6e6',
    marginVertical: 10,
    height: 40,
  },
  menuSettingsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
  },
  menuSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  menuSettingTitle: {
    fontSize: 24,
    color: 'black',
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#f2f2f2',
    marginHorizontal: 20,
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
});
