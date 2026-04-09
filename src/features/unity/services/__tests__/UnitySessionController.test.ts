import type { AppStateStatus } from 'react-native';
import type { Item } from '~/features/avatar';
import { unitySessionController } from '../UnitySessionController';
import { useUnityStore } from '~/stores/unity/unityStore';

function createItem(id: number): Item {
  return {
    id,
    itemType: {
      id: 1,
      name: '머리',
    },
    name: `Hair_${id}`,
    unityFilePath: `Assets/Hair_${id}.png`,
    filePath: `/assets/Hair_${id}.png`,
    point: 100,
    createdAt: new Date().toISOString(),
    isOwned: true,
  };
}

describe('UnitySessionController', () => {
  beforeEach(() => {
    useUnityStore.getState().resetUnityState();
  });

  it('tracks avatar payload hash and skips duplicate syncs for the same payload', () => {
    const payload = {
      items: [createItem(1), createItem(2)],
      hairColor: '#112233',
    };

    expect(unitySessionController.shouldSyncAvatarPayload(payload)).toBe(true);

    unitySessionController.markAvatarApplied(payload);

    expect(unitySessionController.shouldSyncAvatarPayload(payload)).toBe(false);
  });

  it('invalidates applied avatar hash when a reattach ready event is received', () => {
    const payload = {
      items: [createItem(9)],
      hairColor: '#abcdef',
    };

    unitySessionController.markAvatarApplied(payload);
    expect(unitySessionController.shouldSyncAvatarPayload(payload)).toBe(false);

    unitySessionController.handleUnityReadyEvent({
      ready: true,
      type: 'reattach',
      message: 'Unity reattached successfully',
    });

    expect(useUnityStore.getState().sessionStatus).toBe('attached_visible');
    expect(unitySessionController.shouldSyncAvatarPayload(payload)).toBe(true);
  });

  it('bumps reattach token and moves to reattaching when app returns active with an active viewport', () => {
    useUnityStore.getState().setActiveViewport({
      owner: 'running',
      frame: { x: 0, y: 0, width: 100, height: 200 },
      borderRadius: 0,
    });

    unitySessionController.updateViewport(useUnityStore.getState().activeViewport);

    const previousToken = useUnityStore.getState().reattachToken;

    unitySessionController.handleAppStateChange(
      'background' as AppStateStatus,
      'active' as AppStateStatus
    );

    expect(useUnityStore.getState().reattachToken).toBe(previousToken + 1);
    expect(useUnityStore.getState().sessionStatus).toBe('reattaching');
    expect(useUnityStore.getState().debugCounters.reattachRequestCount).toBe(1);
  });

  it('moves to ready_hidden when viewport is cleared after being visible', () => {
    useUnityStore.getState().setActiveViewport({
      owner: 'avatar',
      frame: { x: 10, y: 20, width: 120, height: 120 },
      borderRadius: 16,
    });
    unitySessionController.updateViewport(useUnityStore.getState().activeViewport);

    useUnityStore.getState().clearActiveViewport('avatar');
    unitySessionController.updateViewport(useUnityStore.getState().activeViewport);

    expect(useUnityStore.getState().sessionStatus).toBe('ready_hidden');
  });
});
