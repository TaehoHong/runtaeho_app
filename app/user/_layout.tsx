/**
 * User 관련 화면 레이아웃
 */

import { Stack, useNavigation, useSegments } from 'expo-router';
import { useLayoutEffect } from 'react';

export default function UserLayout() {
  const navigation = useNavigation();
  const segments = useSegments();
  const isMotionScreen = segments.some(segment => segment === '(motion)');

  useLayoutEffect(() => {
    navigation.setOptions({ gestureEnabled: !isMotionScreen });
  }, [isMotionScreen, navigation]);

  return (
    <Stack
      screenOptions={{
        headerShown: false, // 기본 헤더 숨김 (각 화면에서 자체 헤더 구현)
      }}
    >
      <Stack.Screen
        name="avatar"
        options={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="account-connection"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile-edit"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="(motion)"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
