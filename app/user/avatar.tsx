import React, { useCallback } from 'react';
import { router } from 'expo-router';
import { AvatarView } from '~/features/avatar/views';

export default function AvatarPage() {
  const handleClose = useCallback(() => {
    router.back();
  }, []);

  return <AvatarView onClose={handleClose} />;
}
