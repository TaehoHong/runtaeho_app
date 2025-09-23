import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="running"
        options={{
          title: '러닝',
          tabBarIcon: ({ color, size }) => {
            // TODO: Add running icon
            return null;
          }
        }}
      />
      <Tabs.Screen
        name="character"
        options={{
          title: '캐릭터',
          tabBarIcon: ({ color, size }) => {
            // TODO: Add character icon
            return null;
          }
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarIcon: ({ color, size }) => {
            // TODO: Add profile icon
            return null;
          }
        }}
      />
    </Tabs>
  );
}