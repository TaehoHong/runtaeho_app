import type { AppStateStatus } from 'react-native';
import type { Item } from '~/features/avatar';
import {
  useUnityStore,
  type UnityReadyEventSnapshot,
  type UnitySessionStatus,
  type UnityViewport,
} from '~/stores/unity/unityStore';

type AvatarPayload = { items: Item[]; hairColor?: string } | null;
type UnityReadyNativeEvent = Omit<UnityReadyEventSnapshot, 'version' | 'timestamp'>;

class UnitySessionController {
  private static instance: UnitySessionController;

  static getInstance(): UnitySessionController {
    if (!UnitySessionController.instance) {
      UnitySessionController.instance = new UnitySessionController();
    }

    return UnitySessionController.instance;
  }

  computeAvatarPayloadHash(payload: AvatarPayload): string | null {
    if (!payload) {
      return null;
    }

    const itemIds = payload.items
      .map((item) => item.id)
      .sort((left, right) => left - right);

    if (itemIds.length === 0 && !payload.hairColor) {
      return null;
    }

    return JSON.stringify({
      itemIds,
      hairColor: payload.hairColor ?? '',
    });
  }

  updateViewport(activeViewport: UnityViewport | null): void {
    const store = useUnityStore.getState();
    const currentStatus = store.sessionStatus;

    if (activeViewport) {
      store.setSessionStatus('attached_visible', `viewport:${activeViewport.owner}`, activeViewport.owner);
      return;
    }

    if (currentStatus === 'cold' || currentStatus === 'booting' || currentStatus === 'backgrounded') {
      return;
    }

    store.setSessionStatus('ready_hidden', 'viewport:cleared', null);
  }

  markBooting(reason: string): void {
    useUnityStore.getState().setSessionStatus('booting', reason);
  }

  markMessageChannelReady(reason: string): void {
    const store = useUnityStore.getState();
    const owner = store.activeViewport?.owner ?? null;
    const nextStatus: UnitySessionStatus = owner ? 'attached_visible' : 'ready_hidden';
    store.setSessionStatus(nextStatus, reason, owner);
  }

  markMessageChannelLost(reason: string): void {
    const store = useUnityStore.getState();
    store.invalidateAvatarPayloadApplication();
    store.setSessionStatus('recovering', reason, store.activeViewport?.owner ?? null);
  }

  handleAppStateChange(previousState: AppStateStatus, nextState: AppStateStatus): void {
    const store = useUnityStore.getState();
    const hasViewport = !!store.activeViewport;

    if (previousState === nextState) {
      return;
    }

    if (nextState === 'background' || nextState === 'inactive') {
      store.setSessionStatus('backgrounded', `appstate:${nextState}`, store.activeViewport?.owner ?? null);
      return;
    }

    if (nextState === 'active' && previousState !== 'active') {
      if (hasViewport) {
        store.bumpReattachToken();
        store.bumpDebugCounter('reattachRequestCount');
        store.setSessionStatus('reattaching', 'appstate:active', store.activeViewport?.owner ?? null);
        return;
      }

      if (store.sessionStatus === 'backgrounded') {
        store.setSessionStatus('ready_hidden', 'appstate:active_without_viewport', null);
      }
    }
  }

  handleUnityReadyEvent(event: UnityReadyNativeEvent): void {
    const store = useUnityStore.getState();
    store.publishUnityReadyEvent(event);
    store.bumpDebugCounter('readyEventCount');

    if (event.ready === false) {
      store.setSessionStatus('recovering', 'unity_ready:false', store.activeViewport?.owner ?? null);
      return;
    }

    if (event.type === 'reattach') {
      store.bumpDebugCounter('attachCount');
      store.invalidateAvatarPayloadApplication();
      store.setSessionStatus('attached_visible', 'unity_ready:reattach', store.activeViewport?.owner ?? null);
      return;
    }

    if (store.activeViewport) {
      store.bumpDebugCounter('attachCount');
      store.setSessionStatus('attached_visible', 'unity_ready', store.activeViewport.owner);
      return;
    }

    store.setSessionStatus('ready_hidden', 'unity_ready:hidden', null);
  }

  handleUnityError(message?: string): void {
    const store = useUnityStore.getState();
    store.setSessionStatus(
      'recovering',
      `unity_error:${message ?? 'unknown'}`,
      store.activeViewport?.owner ?? null
    );
  }

  setCurrentAvatarPayload(payload: AvatarPayload): string | null {
    const hash = this.computeAvatarPayloadHash(payload);
    useUnityStore.getState().setCurrentAvatarPayloadHash(hash);
    return hash;
  }

  shouldSyncAvatarPayload(payload: AvatarPayload): boolean {
    const hash = this.setCurrentAvatarPayload(payload);
    return hash !== useUnityStore.getState().lastAppliedAvatarHash;
  }

  markAvatarApplied(payload: AvatarPayload): string | null {
    const hash = this.computeAvatarPayloadHash(payload);
    useUnityStore.getState().markAvatarPayloadApplied(hash);
    return hash;
  }

  invalidateAvatarPayloadApplication(): void {
    useUnityStore.getState().invalidateAvatarPayloadApplication();
  }

  recordHardReset(reason: string): void {
    const store = useUnityStore.getState();
    store.bumpDebugCounter('hardResetCount');
    store.invalidateAvatarPayloadApplication();
    store.setSessionStatus('recovering', reason, store.activeViewport?.owner ?? null);
  }
}

export const unitySessionController = UnitySessionController.getInstance();
