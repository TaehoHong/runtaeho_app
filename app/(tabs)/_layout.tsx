import { Tabs } from 'expo-router';
import { useAppStore, RunningState, ViewState } from '~/stores/app/appStore';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

/**
 * 메인 탭 네비게이션 레이아웃
 * iOS MainTabView 대응
 * 러닝 상태에 따라 탭바 표시/숨김 제어
 */
export default function TabLayout() {
  const runningState = useAppStore((state) => state.runningState);
  const viewState = useAppStore((state) => state.viewState);

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
          paddingBottom: 10,
          paddingTop: 10,
          height: 60,
          opacity: shouldShowTabBar ? 1 : 0,
          pointerEvents: shouldShowTabBar ? 'auto' : 'none',
        },
        tabBarActiveTintColor: '#4d99e5',
        tabBarInactiveTintColor: '#666666',
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
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="running"
        options={{
          title: '러닝',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="walk-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: '통계',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}