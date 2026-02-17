import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MyInfoView } from '~/features/user/views/MyInfoView';

/**
 * 내정보(프로필) 화면
 * iOS MyInfoView 대응
 */
export default function ProfileScreen() {
  console.log('👤 [PROFILE_SCREEN] 내정보 화면 렌더링');

  return (
    <View style={styles.container} testID="profile-screen">
      <MyInfoView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
