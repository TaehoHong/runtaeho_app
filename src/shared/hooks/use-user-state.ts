import { useState, useEffect } from 'react';
import { UserStateManager } from '../services/user-state-manager';
import { UserAuthData } from '../../features/auth/models/UserAuthData';

interface UserState {
  isLoggedIn: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  userData: UserAuthData | null;
  equippedItems: any[];
}

export const useUserState = () => {
  const manager = UserStateManager.getInstance();
  const [userState, setUserState] = useState<UserState>(manager.currentState);

  useEffect(() => {
    const unsubscribe = manager.addListener(setUserState);
    return unsubscribe;
  }, [manager]);

  return {
    userState,
    login: manager.login.bind(manager),
    logout: manager.logout.bind(manager),
    updateTokens: manager.updateTokens.bind(manager),
    updateUserData: manager.updateUserData.bind(manager),
    updateEquippedItems: manager.updateEquippedItems.bind(manager),
  };
};