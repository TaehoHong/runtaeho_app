import type { ImageSourcePropType } from 'react-native';

export interface ActivityConnection {
  available: boolean;
  status: 'DISCONNECTED' | 'CONNECTED' | 'RECONNECT_REQUIRED' | 'DISCONNECTING';
}

export interface ActivityConnectionProvider {
  id: string;
  name: string;
  icon: ImageSourcePropType;
  messages: {
    title: string;
    connectError: string;
    disconnectTitle: string;
    disconnectDescription: string;
    loginHint: string;
    unavailable: string;
  };
  connection(signal?: AbortSignal): Promise<ActivityConnection>;
  connect(): Promise<'connected' | 'cancelled'>;
  disconnect(): Promise<ActivityConnection>;
}
