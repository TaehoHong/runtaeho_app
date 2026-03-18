import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { UnityView } from './UnityView';
import { useUnityStore, type UnityViewport } from '~/stores/unity/unityStore';

const MIN_HOST_SIZE = 1;

/**
 * 앱 전체에서 Unity native surface를 하나만 유지하는 전역 host.
 * 실제 노출 위치는 unityStore.activeViewport가 결정한다.
 */
export const GlobalUnityHost: React.FC = () => {
  const activeViewport = useUnityStore((state) => state.activeViewport);
  const [hasMountedUnity, setHasMountedUnity] = useState(false);
  const [lastViewport, setLastViewport] = useState<UnityViewport | null>(null);

  useEffect(() => {
    if (!activeViewport) {
      return;
    }

    setHasMountedUnity(true);
    setLastViewport(activeViewport);
  }, [activeViewport]);

  const resolvedViewport = activeViewport ?? lastViewport;

  const hostStyle = useMemo(() => {
    if (!resolvedViewport) {
      return styles.hiddenHost;
    }

    return {
      left: resolvedViewport.frame.x,
      top: resolvedViewport.frame.y,
      width: Math.max(resolvedViewport.frame.width, MIN_HOST_SIZE),
      height: Math.max(resolvedViewport.frame.height, MIN_HOST_SIZE),
      borderRadius: resolvedViewport.borderRadius ?? 0,
      opacity: activeViewport ? 1 : 0,
    };
  }, [activeViewport, resolvedViewport]);

  if (!hasMountedUnity) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View pointerEvents="none" style={[styles.host, hostStyle]}>
        <UnityView style={styles.unityView} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    pointerEvents: 'none',
  },
  host: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  hiddenHost: {
    left: 0,
    top: 0,
    width: MIN_HOST_SIZE,
    height: MIN_HOST_SIZE,
    opacity: 0,
  },
  unityView: {
    flex: 1,
  },
});

export default GlobalUnityHost;
