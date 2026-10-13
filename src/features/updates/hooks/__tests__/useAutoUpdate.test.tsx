import { act, renderHook } from '@testing-library/react-native';
import { useAutoUpdate } from '../useAutoUpdate';
import { checkForUpdate, downloadUpdate, applyUpdate } from '../../services/updateService';
import { useUpdateStore } from '../../stores/updateStore';

jest.mock('../../services/updateService', () => ({
  isUpdatesEnabled: () => true,
  checkForUpdate: jest.fn(), downloadUpdate: jest.fn(), applyUpdate: jest.fn(),
}));
const check = jest.mocked(checkForUpdate);
const flush = async () => { await act(async () => { await Promise.resolve(); }); };

describe('useAutoUpdate attempts', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); useUpdateStore.getState().reset(); });
  afterEach(() => { jest.useRealTimers(); });
  it('stops after three total failed attempts and starts a new manual attempt set', async () => {
    check.mockRejectedValue(new Error('offline'));
    const { result, unmount } = renderHook(() => useAutoUpdate());
    await flush();
    for (let index = 0; index < 3; index++) await act(async () => { jest.advanceTimersByTime(1000); });
    expect(check).toHaveBeenCalledTimes(3);
    expect(result.current.status).toBe('error');
    expect(result.current.retryCount).toBe(3);
    act(() => result.current.retry());
    await flush();
    expect(check).toHaveBeenCalledTimes(4);
    expect(result.current.retryCount).toBe(1);
    unmount();
  });
  it('does not download a late update after skip', async () => {
    let resolve!: (value: { isAvailable: boolean }) => void;
    check.mockReturnValue(new Promise((done) => { resolve = done; }));
    const { result, unmount } = renderHook(() => useAutoUpdate());
    act(() => result.current.skip());
    await act(async () => resolve({ isAvailable: true }));
    expect(downloadUpdate).not.toHaveBeenCalled();
    expect(applyUpdate).not.toHaveBeenCalled();
    expect(result.current.status).toBe('skipped');
    expect(useUpdateStore.getState().isAutoUpdateCompleted).toBe(true);
    unmount();
  });
  it('cancels scheduled retries on unmount', async () => {
    check.mockRejectedValue(new Error('offline'));
    const { unmount } = renderHook(() => useAutoUpdate());
    await flush();
    unmount();
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(check).toHaveBeenCalledTimes(1);
  });
  it('ignores download progress and apply after skip', async () => {
    check.mockResolvedValue({ isAvailable: true });
    let finish!: () => void;
    let progress!: NonNullable<Parameters<typeof downloadUpdate>[0]>;
    jest.mocked(downloadUpdate).mockImplementationOnce((callback) => {
      progress = callback!;
      return new Promise((resolve) => { finish = resolve; });
    });
    const { result, unmount } = renderHook(() => useAutoUpdate());
    await flush();
    act(() => result.current.skip());
    await act(async () => { progress({ totalBytes: 100, downloadedBytes: 100, percentage: 100 }); finish(); });
    expect(result.current.progress).toBe(0);
    expect(result.current.status).toBe('skipped');
    expect(applyUpdate).not.toHaveBeenCalled();
    unmount();
  });

});
