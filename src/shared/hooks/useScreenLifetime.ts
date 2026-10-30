import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/** Capture the current focused screen or modal instance before starting async work. */
export function useScreenLifetime() {
  const lifetime = useRef({ active: false });

  useFocusEffect(useCallback(() => {
    const current = { active: true };
    lifetime.current = current;
    return () => { current.active = false; };
  }, []));

  return useCallback(() => {
    const current = lifetime.current;
    return () => current.active;
  }, []);
}
