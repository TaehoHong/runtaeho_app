import React, { useCallback } from 'react';
import { router } from 'expo-router';
import { AvatarView } from '~/features/avatar/views';
import { useUnityExitGuard } from '~/features/unity/hooks/useUnityExitGuard';

export default function AvatarPage() {
  useUnityExitGuard();
  const handleClose = useCallback(() => {
    router.back();
  }, []);

  return <AvatarView onClose={handleClose} />;
}
