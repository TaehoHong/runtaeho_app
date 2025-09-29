import React from 'react';
import { MyInfoView } from '~/features/user/views/MyInfoView';

/**
 * 내정보(프로필) 화면
 * iOS MyInfoView 대응
 */
export default function ProfileScreen() {
  console.log('👤 [PROFILE_SCREEN] 내정보 화면 렌더링');

  return <MyInfoView />;
}