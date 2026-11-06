import { Ssgoi, type SsgoiConfig } from '@ssgoi/react-native';
import { SsgoiRouteBoundary } from '@ssgoi/react-native/expo-router';
import { slide } from '@ssgoi/react-native/view-transitions';

const config = {
  transitions: [
    { from: '/user/app-info', to: '/user/licenses', bidirectional: true, transition: slide() },
    { from: '/user/terms-list', to: '/user/terms-detail', bidirectional: true, transition: slide() },
  ],
} satisfies SsgoiConfig;

export default function UserMotionLayout() {
  return (
    <Ssgoi config={config} reducedMotion="system">
      <SsgoiRouteBoundary style={{ flex: 1 }} />
    </Ssgoi>
  );
}
