import type { Item } from '~/features/avatar';
import { UnityService } from '../UnityService';
import { UnityBridge } from '../../bridge/UnityBridge';
import { useUnityStore } from '~/stores/unity/unityStore';
import { unitySessionController } from '../UnitySessionController';

jest.mock('../../bridge/UnityBridge', () => ({ UnityBridge: {
  isGameObjectReady: jest.fn(() => true),
  changeAvatarAndWait: jest.fn(),
} }));

const items: Item[] = [{
  id: 1, itemType: { id: 1, name: '머리' }, name: 'Hair_1',
  unityFilePath: 'Assets/Hair_1.png', filePath: '/assets/Hair_1.png',
  point: 100, createdAt: '2026-01-01T00:00:00Z', isOwned: true,
}];

function deferred() {
  let resolve!: (value: boolean) => void;
  const promise = new Promise<boolean>(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => { jest.clearAllMocks(); useUnityStore.getState().resetUnityState(); });

it('waits for each native application and keeps the final applied payload hash', async () => {
  const a = deferred(); const b = deferred();
  jest.mocked(UnityBridge.changeAvatarAndWait).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const service = new UnityService();
  const first = service.syncAvatar(items, '#111111', { waitForReady: false });
  let secondSettled = false;
  const second = service.syncAvatar(items, '#222222', { waitForReady: false }).then(value => { secondSettled = true; return value; });
  await Promise.resolve(); await Promise.resolve();
  expect(secondSettled).toBe(false);
  a.resolve(true);
  await first;
  expect(secondSettled).toBe(false);
  expect(useUnityStore.getState().currentAvatarPayloadHash).toBe(unitySessionController.computeAvatarPayloadHash({ items, hairColor: '#222222' }));
  b.resolve(true);
  expect(await second).toBe('applied');
  expect(useUnityStore.getState().lastAppliedAvatarHash).toBe(unitySessionController.computeAvatarPayloadHash({ items, hairColor: '#222222' }));
});

it('settles superseded queued requests without applying them and recovers after failure', async () => {
  const a = deferred(); const c = deferred();
  jest.mocked(UnityBridge.changeAvatarAndWait).mockReturnValueOnce(a.promise).mockReturnValueOnce(c.promise).mockResolvedValueOnce(true);
  const service = new UnityService();
  const first = service.syncAvatar(items, '#111111', { waitForReady: false });
  const second = service.syncAvatar(items, '#222222', { waitForReady: false });
  const third = service.syncAvatar(items, '#333333', { waitForReady: false });
  expect(await second).toBe('failed');
  a.resolve(false);
  expect(await first).toBe('failed');
  c.resolve(true);
  expect(await third).toBe('applied');
  expect(await service.syncAvatar(items, '#444444', { waitForReady: false })).toBe('applied');
  expect(UnityBridge.changeAvatarAndWait).toHaveBeenCalledTimes(3);
});
