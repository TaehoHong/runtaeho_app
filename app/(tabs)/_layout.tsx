import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, RunningState, ViewState } from '~/stores/app/appStore';
import { Icon } from '~/shared/components/ui';

/**
 * 메인 탭 네비게이션 레이아웃
 * 러닝 상태에 따라 탭바 표시/숨김 제어
 */
export default function TabLayout() {
  const runningState = useAppStore((state) => state.runningState);
  const viewState = useAppStore((state) => state.viewState);
  const insets = useSafeAreaInsets();

  // iOS와 동일한 로직: 러닝 중이 아니고 로딩 완료 시에만 탭바 표시
  const shouldShowTabBar = runningState === RunningState.Stopped && viewState === ViewState.Loaded;

  console.log('📋 [TAB_LAYOUT] 탭 레이아웃 렌더링, 탭바 표시:', shouldShowTabBar);

  return (
    <Tabs
      initialRouteName="running"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.2)',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 5,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
          opacity: shouldShowTabBar ? 1 : 0,
          pointerEvents: shouldShowTabBar ? 'auto' : 'none',
        },
        tabBarActiveTintColor: '#45DA31',
        tabBarInactiveTintColor: '#B4B4B4',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        // iOS와 동일한 애니메이션 효과
        animation: 'fade',
        // animationDuration는 지원되지 않는 속성이므로 제거
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: '내정보',
          tabBarIcon: ({ color, size }) => (
            <Icon name = 'myinfo' size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="running"
        options={{
          title: '러닝',
          tabBarIcon: ({ color, size }) => (
            <Icon name = 'shoe' size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: '통계',
          tabBarIcon: ({ color, size }) => (
            <Icon name = 'chart' size={size} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}