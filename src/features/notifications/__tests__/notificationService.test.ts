import { notificationIdFromData, notificationService } from '../services/notificationService';
import { apiClient } from '~/services/api/client';
import { isSessionCurrent } from '~/features/auth/stores/authStore';

jest.mock('~/services/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));
jest.mock('~/features/auth/stores/authStore', () => ({
  getSessionSnapshot: () => ({ generation: 1, userId: 7 }), isSessionCurrent: jest.fn(() => true),
}));

it.each([{}, { notificationId: 'https://example.com' }, { notificationId: '../admin' }, { notificationId: -1 },
  { notificationId: 0 }, { notificationId: 1.5 }, { notificationId: '1e3' }, { notificationId: '9007199254740992' }])(
  'ignores non inbox identifiers in untrusted push data %j', data => {
    expect(notificationIdFromData(data)).toBeNull();
  });

it('accepts only positive safe integer notification identifiers', () => {
  expect(notificationIdFromData({ notificationId: '42' })).toBe(42);
  expect(notificationIdFromData({ notificationId: 42 })).toBe(42);
});

it('does not expose a previous account inbox after a session switch', async () => {
  jest.mocked(apiClient.get).mockResolvedValue({ data: { content: [{ id: 1, body: 'previous account' }] } });
  jest.mocked(isSessionCurrent).mockReturnValue(false);
  await expect(notificationService.list('ja')).rejects.toThrow();
  expect(apiClient.get).toHaveBeenCalledWith('/notifications', expect.objectContaining({ sessionSnapshot: { generation: 1, userId: 7 } }));
});
