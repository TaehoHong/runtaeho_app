import { Stack } from 'expo-router/stack';
import { Provider } from 'react-redux';
import { store } from '~/store';
import { UnityBridgeProvider } from '~/contexts/UnityBridgeContext';

export default function RootLayout() {
  console.log('🏠 RootLayout 렌더링 시작 (Redux + Unity Bridge 포함)');

  return (
    <Provider store={store}>
      <UnityBridgeProvider config={{ enableDebugLogs: true }}>
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
          <Stack.Screen
            name="unity-test"
            options={{
              title: 'Unity Bridge 테스트',
              headerShown: true
            }}
          />
        </Stack>
      </UnityBridgeProvider>
    </Provider>
  );
}