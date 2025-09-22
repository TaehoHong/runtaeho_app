import { Stack } from 'expo-router/stack';

export default function RootLayout() {
  console.log('🏠 RootLayout 렌더링 시작 (단순화 버전)');

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false
        }}
      />
    </Stack>
  );
}