/**
 * Share 라우트 레이아웃
 * league/_layout.tsx와 동일한 패턴 적용
 *
 * 스택 진입 시점에 headerShown: false를 적용하여
 * 개별 화면 진입 시 레이아웃 변경을 방지하고
 * UnityView 재마운트로 인한 "Not loaded" 오류를 해결
 */

import { Stack } from 'expo-router/stack';

export default function ShareLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="editor" />
    </Stack>
  );
}
