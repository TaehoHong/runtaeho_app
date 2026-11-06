import { NativeModules, Platform } from 'react-native';
import { captureScreen, releaseCapture } from 'react-native-view-shot';
import { useUnityStore } from '~/stores/unity/unityStore';

export const captureTransitionSnapshot = async (): Promise<string> => {
  const state = useUnityStore.getState();
  if (Platform.OS === 'android' && state.activeViewport && state.isSurfaceVisible) {
    // A software screenshot alone leaves Android's separate Unity SurfaceView black.
    return NativeModules.RNUnityBridge.captureTransitionScreen();
  }
  return captureScreen({ format: 'png', quality: 1, result: 'tmpfile' });
};

export const releaseTransitionSnapshot = (uri: string): void => releaseCapture(uri);
