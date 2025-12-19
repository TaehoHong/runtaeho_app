/**
 * League 라우트 레이아웃
 */

import { Stack } from 'expo-router/stack';

export default function LeagueLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="result" />
      <Stack.Screen name="result-detail" />
    </Stack>
  );
}
