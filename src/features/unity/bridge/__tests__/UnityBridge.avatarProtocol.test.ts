const mockNative = {
  getAvatarProtocolVersion: jest.fn(),
  changeAvatarCorrelatedAndWait: jest.fn(),
  changeAvatarAndWait: jest.fn(),
  isCharactorReady: jest.fn().mockResolvedValue(true),
};
jest.mock('react-native', () => ({
  NativeModules: { RNUnityBridge: mockNative },
  NativeEventEmitter: jest.fn(() => ({ addListener: jest.fn(() => ({ remove: jest.fn() })) })),
  Platform: { OS: 'ios' },
}));
const { UnityBridge } = require('../UnityBridge') as typeof import('../UnityBridge');

beforeEach(() => jest.clearAllMocks());

it('preserves the legacy command for an embedded Unity binary without protocol support', async () => {
  mockNative.getAvatarProtocolVersion.mockResolvedValue(0);
  mockNative.changeAvatarAndWait.mockResolvedValue(true);
  expect(await UnityBridge.changeAvatarAndWait('Charactor', 'SetSprites', '{"list":[]}')).toBe(true);
  expect(mockNative.changeAvatarAndWait).toHaveBeenCalledWith('Charactor', 'SetSprites', '{"list":[]}');
  expect(mockNative.changeAvatarCorrelatedAndWait).not.toHaveBeenCalled();
});

it('sends distinct IDs in the command and native pending request for supported binaries', async () => {
  mockNative.getAvatarProtocolVersion.mockResolvedValue(1);
  mockNative.changeAvatarCorrelatedAndWait.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  expect(await UnityBridge.changeAvatarAndWait('Charactor', 'SetSprites', 'payload-A')).toBe(false);
  expect(await UnityBridge.changeAvatarAndWait('Charactor', 'SetSprites', 'payload-B')).toBe(true);
  const [first, second] = mockNative.changeAvatarCorrelatedAndWait.mock.calls;
  expect(JSON.parse(first![1])).toEqual({ requestId: first![2], payload: 'payload-A' });
  expect(JSON.parse(second![1])).toEqual({ requestId: second![2], payload: 'payload-B' });
  expect(first![2]).not.toBe(second![2]);
  expect(mockNative.changeAvatarAndWait).not.toHaveBeenCalled();
});
