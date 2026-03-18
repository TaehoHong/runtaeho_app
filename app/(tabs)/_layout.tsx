import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '~/stores/app/appStore';
import { Icon } from '~/shared/components/ui';
import { isTabBarVisible } from '~/shared/utils/tabBarVisibility';

/**
 * 메인 탭 네비게이션 레이아웃
 * 피그마 디자인: 통계 / 러닝 / 리그 / 내정보 (4개 탭)
 * 러닝 상태에 따라 탭바 표시/숨김 제어
 */
export default function TabLayout() {
  const runningState = useAppStore((state) => state.runningState);
  const viewState = useAppStore((state) => state.viewState);
  const insets = useSafeAreaInsets();

  // iOS와 동일한 로직: 러닝 중이 아니고 로딩 완료 시에만 탭바 표시
  const shouldShowTabBar = isTabBarVisible(runningState, viewState);

  console.log('📋 [TAB_LAYOUT] 탭 레이아웃 렌더링, 탭바 표시:', shouldShowTabBar);

  return (
    <Tabs
      initialRouteName="running"
      screenListeners={{
        tabPress: (e) => {
          if (!shouldShowTabBar) {
            e.preventDefault();
          }
        },
      }}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: 'transparent',
        },
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
          display: shouldShowTabBar ? 'flex' : 'none',
        },
        tabBarActiveTintColor: '#45DA31',
        tabBarInactiveTintColor: '#B4B4B4',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        // iOS와 동일한 애니메이션 효과
        animation: 'none',
      }}
    >
      <Tabs.Screen
        name="statistics"
        options={{
          title: '통계',
          tabBarButtonTestID: 'tab-statistics',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chart" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="running"
        options={{
          title: '러닝',
          tabBarButtonTestID: 'tab-running',
          tabBarIcon: ({ color, size }) => (
            <Icon name="shoe" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="league"
        options={{
          title: '리그',
          tabBarButtonTestID: 'tab-league',
          tabBarIcon: ({ color, size }) => (
            <Icon name="league" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내정보',
          tabBarButtonTestID: 'tab-profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="myinfo" size={size} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}
