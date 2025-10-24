/**
 * User 관련 화면 레이아웃
 */

import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // 기본 헤더 숨김 (각 화면에서 자체 헤더 구현)
      }}
    >
      <Stack.Screen
        name="account-connection"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
