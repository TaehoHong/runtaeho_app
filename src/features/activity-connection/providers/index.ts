import { garminService } from '~/features/garmin/services/garminService';
import type { ActivityConnectionProvider } from '../types';

export const activityConnectionProviders: readonly ActivityConnectionProvider[] = [
  {
    id: 'garmin',
    name: 'Garmin Connect',
    // Official asset: https://developer.garmin.com/brand-guidelines/connect/
    icon: require('../../../../assets/images/garmin-connect.png'),
    messages: {
      title: 'Garmin 연결',
      connectError: 'Garmin 연결을 완료하지 못했어요. 활동 공유 권한을 확인하고 다시 시도해 주세요.',
      disconnectTitle: 'Garmin 연결을 해제할까요?',
      disconnectDescription: '기존 기록은 유지하고 Garmin 연결을 해제해요. Garmin Connect에 연결이 남아 있다면 연결된 앱 설정에서도 해제해 주세요.',
      loginHint: 'Garmin 공식 로그인 화면 열기',
      unavailable: 'Garmin 연동을 준비하고 있어요. 잠시 후 다시 확인해 주세요.',
    },
    ...garminService,
  },
];
