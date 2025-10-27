import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

/**
 * Permission Manager
 * SwiftUI PermissionManager와 동일한 역할
 * 
 * expo-location과 expo-notifications를 사용하여 권한 관리
 */

export type LocationPermissionStatus = 
  | 'authorizedAlways'
  | 'authorizedWhenInUse'
  | 'denied'
  | 'restricted'
  | 'notDetermined';

export type NotificationPermissionStatus =
  | 'authorized'
  | 'provisional'
  | 'denied'
  | 'notDetermined';

export class PermissionManager {
  private static instance: PermissionManager;
  
  private constructor() {
    this.setupNotificationHandler();
  }
  
  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }
  
  /**
   * 알림 핸들러 초기 설정
   */
  private setupNotificationHandler(): void {
    // 알림이 수신될 때 어떻게 표시할지 설정
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
  
  /**
   * 위치 권한 상태 확인
   */
  async checkLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      // Foreground 권한 확인
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      
      if (foregroundStatus.status === Location.PermissionStatus.GRANTED) {
        // Background 권한 확인
        const backgroundStatus = await Location.getBackgroundPermissionsAsync();
        
        if (backgroundStatus.status === Location.PermissionStatus.GRANTED) {
          return 'authorizedAlways';
        } else {
          return 'authorizedWhenInUse';
        }
      }
      
      switch (foregroundStatus.status) {
        case Location.PermissionStatus.DENIED:
          return 'denied';
        case Location.PermissionStatus.UNDETERMINED:
          return 'notDetermined';
        default:
          return 'notDetermined';
      }
    } catch (error) {
      console.error('❌ [PermissionManager] Failed to check location permission:', error);
      return 'notDetermined';
    }
  }
  
  /**
   * 위치 권한 요청
   */
  async requestLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      // 먼저 Foreground 권한 요청
      const foregroundResult = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundResult.status !== Location.PermissionStatus.GRANTED) {
        console.log('📍 [PermissionManager] Location permission denied');
        return 'denied';
      }
      
      console.log('📍 [PermissionManager] Foreground location permission granted');
      
      // iOS와 Android 분기 처리
      if (Platform.OS === 'ios') {
        // iOS에서는 백그라운드 권한을 별도로 요청
        const backgroundResult = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundResult.status === Location.PermissionStatus.GRANTED) {
          console.log('📍 [PermissionManager] Background location permission granted');
          return 'authorizedAlways';
        } else {
          console.log('📍 [PermissionManager] Background location permission denied');
          return 'authorizedWhenInUse';
        }
      } else {
        // Android에서는 foreground 권한만으로도 충분할 수 있음
        // 백그라운드 권한이 필요한 경우 별도 처리
        try {
          const backgroundResult = await Location.requestBackgroundPermissionsAsync();
          
          if (backgroundResult.status === Location.PermissionStatus.GRANTED) {
            return 'authorizedAlways';
          }
        } catch (error) {
          console.log('📍 [PermissionManager] Background permission not available on this Android version');
        }
        
        return 'authorizedWhenInUse';
      }
    } catch (error) {
      console.error('❌ [PermissionManager] Failed to request location permission:', error);
      return 'denied';
    }
  }
  
  /**
   * 알림 권한 상태 확인
   */
  async checkNotificationPermission(): Promise<NotificationPermissionStatus> {
    try {
      const settings = await Notifications.getPermissionsAsync();
      
      if (settings.granted) {
        return 'authorized';
      }
      
      switch (settings.status) {
        case Notifications.PermissionStatus.DENIED:
          return 'denied';
        case Notifications.PermissionStatus.UNDETERMINED:
          return 'notDetermined';
        default:
          return 'notDetermined';
      }
    } catch (error) {
      console.error('❌ [PermissionManager] Failed to check notification permission:', error);
      return 'notDetermined';
    }
  }
  
  /**
   * 알림 권한 요청
   * SwiftUI에서 requestAuthorization과 동일
   */
  async requestNotificationPermission(): Promise<NotificationPermissionStatus> {
    try {
      const settings = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: true,
          allowProvisional: false,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          priority: 'high',
          vibrate: true,
        },
      });
      
      if (settings.granted) {
        console.log('🔔 [PermissionManager] Notification permission granted');
        
        // Android의 경우 채널 설정
        if (Platform.OS === 'android') {
          await this.setupAndroidNotificationChannels();
        }
        
        return 'authorized';
      }
      
      console.log('🔔 [PermissionManager] Notification permission denied');
      return settings.status === Notifications.PermissionStatus.DENIED ? 'denied' : 'notDetermined';
    } catch (error) {
      console.error('❌ [PermissionManager] Failed to request notification permission:', error);
      return 'denied';
    }
  }
  
  /**
   * Android 알림 채널 설정
   */
  private async setupAndroidNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    try {
      // 기본 채널
      await Notifications.setNotificationChannelAsync('default', {
        name: '기본 알림',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
      
      // 러닝 알림 채널
      await Notifications.setNotificationChannelAsync('running', {
        name: '러닝 알림',
        importance: Notifications.AndroidImportance.HIGH,
        description: '러닝 시작, 종료, 목표 달성 알림',
        vibrationPattern: [0, 500],
        sound: 'default',
      });
      
      // 챌린지 알림 채널
      await Notifications.setNotificationChannelAsync('challenge', {
        name: '챌린지 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: '챌린지 참여 및 완료 알림',
        sound: 'default',
      });
      
      console.log('📱 [PermissionManager] Android notification channels created');
    } catch (error) {
      console.error('❌ [PermissionManager] Failed to create notification channels:', error);
    }
  }
  
  /**
   * 모든 필수 권한 확인
   */
  async checkAllRequiredPermissions(): Promise<{
    location: LocationPermissionStatus;
    notification: NotificationPermissionStatus;
  }> {
    const [location, notification] = await Promise.all([
      this.checkLocationPermission(),
      this.checkNotificationPermission(),
    ]);
    
    console.log('🔐 [PermissionManager] Current permissions:', { location, notification });
    
    return { location, notification };
  }
  
  /**
   * 모든 필수 권한 요청
   */
  async requestAllRequiredPermissions(): Promise<{
    location: LocationPermissionStatus;
    notification: NotificationPermissionStatus;
  }> {
    console.log('🔐 [PermissionManager] Requesting all permissions...');
    
    // 순차적으로 요청 (UX 개선)
    const location = await this.requestLocationPermission();
    const notification = await this.requestNotificationPermission();
    
    console.log('🔐 [PermissionManager] Permission request results:', { location, notification });
    
    return { location, notification };
  }
  
  /**
   * 위치 서비스 활성화 여부 확인
   */
  async isLocationServicesEnabled(): Promise<boolean> {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      console.log(`📍 [PermissionManager] Location services ${enabled ? 'enabled' : 'disabled'}`);
      return enabled;
    } catch (error) {
      console.error('❌ [PermissionManager] Failed to check location services:', error);
      return false;
    }
  }
  
  /**
   * 현재 위치 가져오기
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      // 권한 확인
      const permission = await this.checkLocationPermission();
      if (permission === 'denied' || permission === 'notDetermined') {
        console.log('📍 [PermissionManager] Location permission not granted');
        return null;
      }
      
      // 위치 서비스 활성화 확인
      const servicesEnabled = await this.isLocationServicesEnabled();
      if (!servicesEnabled) {
        console.log('📍 [PermissionManager] Location services disabled');
        return null;
      }
      
      // 현재 위치 가져오기
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 5,
      });
      
      console.log('📍 [PermissionManager] Got current location:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
      
      return location;
    } catch (error) {
      console.error('❌ [PermissionManager] Failed to get current location:', error);
      return null;
    }
  }
  
  /**
   * 백그라운드 위치 추적 시작
   */
  async startBackgroundLocationTracking(taskName: string): Promise<boolean> {
    try {
      const permission = await this.checkLocationPermission();
      if (permission !== 'authorizedAlways') {
        console.log('📍 [PermissionManager] Background location permission not granted');
        return false;
      }
      
      // TaskManager를 사용한 백그라운드 추적 설정
      // 별도의 TaskManager 설정이 필요
      console.log('📍 [PermissionManager] Background location tracking would start here');
      return true;
    } catch (error) {
      console.error('❌ [PermissionManager] Failed to start background location tracking:', error);
      return false;
    }
  }
  
  /**
   * 권한 설정 페이지 열기
   */
  async openSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
      console.log('⚙️ [PermissionManager] Opened settings');
    } catch (error) {
      console.error('❌ [PermissionManager] Failed to open settings:', error);
      
      // Fallback: 일반 설정 앱 열기
      try {
        if (Platform.OS === 'android') {
          await Linking.sendIntent('android.settings.SETTINGS');
        }
      } catch (fallbackError) {
        console.error('❌ [PermissionManager] Fallback also failed:', fallbackError);
      }
    }
  }
  
  /**
   * 권한이 영구적으로 거부되었는지 확인
   * (사용자가 "다시 묻지 않기"를 선택한 경우)
   */
  async isPermissionPermanentlyDenied(type: 'location' | 'notification'): Promise<boolean> {
    try {
      if (type === 'location') {
        const status = await this.checkLocationPermission();
        const canAsk = await Location.requestForegroundPermissionsAsync();
        
        // 거부되었는데 다시 요청해도 상태가 변하지 않으면 영구 거부
        return status === 'denied' && canAsk.status === Location.PermissionStatus.DENIED;
      } else {
        const status = await this.checkNotificationPermission();
        return status === 'denied' && !await Notifications.getPermissionsAsync().then(s => s.canAskAgain);
      }
    } catch (error) {
      console.error('❌ [PermissionManager] Failed to check permanent denial:', error);
      return false;
    }
  }
  
  /**
   * 권한 상태에 따른 안내 메시지 생성
   */
  getPermissionGuideMessage(type: 'location' | 'notification', status: string): string {
    if (type === 'location') {
      switch (status) {
        case 'authorizedAlways':
          return '위치 권한이 항상 허용되어 있습니다.';
        case 'authorizedWhenInUse':
          return '앱 사용 중에만 위치 권한이 허용되어 있습니다.';
        case 'denied':
          return '위치 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.';
        case 'restricted':
          return '위치 서비스가 제한되어 있습니다.';
        default:
          return '위치 권한을 확인할 수 없습니다.';
      }
    } else {
      switch (status) {
        case 'authorized':
          return '알림이 허용되어 있습니다.';
        case 'provisional':
          return '임시 알림이 허용되어 있습니다.';
        case 'denied':
          return '알림이 거부되었습니다. 설정에서 알림을 허용해주세요.';
        default:
          return '알림 권한을 확인할 수 없습니다.';
      }
    }
  }
}

// Singleton export
export const permissionManager = PermissionManager.getInstance();