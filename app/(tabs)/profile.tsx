import { View, Text, Button, StyleSheet } from 'react-native';
import { useUserState } from '../../src/shared/hooks/use-user-state';

export default function ProfilePage() {
  const { userState, logout } = useUserState();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>프로필</Text>

      {userState.userData && (
        <View style={styles.userInfo}>
          <Text style={styles.nickname}>{userState.userData.nickname}</Text>
          <Text style={styles.email}>{userState.userData.email}</Text>
          <Text style={styles.provider}>로그인 방식: {userState.userData.provider}</Text>
        </View>
      )}

      <Button
        title="로그아웃"
        onPress={handleLogout}
        color="#FF6B6B"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  userInfo: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
  },
  nickname: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  provider: {
    fontSize: 12,
    color: '#999',
  },
});