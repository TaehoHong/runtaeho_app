import { API_ENDPOINTS } from '~/services/api/config';
import { apiClient } from '~/services/api/client';
import { runningService } from '~/features/running/services/runningService';
import type { RunningRecord } from '~/features/running/models';

jest.mock('~/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('runningService', () => {
  const sampleRecord: RunningRecord = {
    id: 77,
    distance: 4200,
    steps: 5200,
    cadence: 168,
    heartRate: 145,
    calorie: 280,
    durationSec: 1500,
    startTimestamp: 1735689600,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('RUN-SVC-001 starts running with mapped request payload and returns initialized record', async () => {
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    mockApiClient.post.mockResolvedValue({ data: { id: 99 } });

    const record = await runningService.startRunning();

    expect(record.id).toBe(99);
    expect(record.distance).toBe(0);
    expect(mockApiClient.post).toHaveBeenCalledWith(
      API_ENDPOINTS.RUNNING.BASE,
      expect.objectContaining({
        startTimestamp: 1700000000,
        timezone: expect.any(String),
      })
    );
    expect(mockApiClient.post).not.toHaveBeenCalledWith(
      API_ENDPOINTS.RUNNING.BASE,
      expect.objectContaining({
        startTimestamp: 1700000001,
      })
    );
    dateNowSpy.mockRestore();
  });

  it('maps getRunningRecords filters to API query params', async () => {
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    const endDate = new Date('2025-01-02T00:00:00.000Z');
    mockApiClient.get.mockResolvedValue({
      data: { content: [], cursor: null, hasNext: false },
    });

    await runningService.getRunningRecords({
      cursor: 10,
      size: 20,
      startDate,
      endDate,
    });

    expect(mockApiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.RUNNING.SEARCH, {
      params: {
        cursor: 10,
        size: 20,
        startTimestamp: Math.floor(startDate.getTime() / 1000),
        endTimestamp: Math.floor(endDate.getTime() / 1000),
      },
    });
    expect(mockApiClient.get).not.toHaveBeenCalledWith(
      API_ENDPOINTS.RUNNING.SEARCH,
      expect.objectContaining({
        params: expect.objectContaining({ cursor: 99 }),
      })
    );
  });

  it('RUN-SVC-002 loads all pages and sorts records by startTimestamp descending', async () => {
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    const endDate = new Date('2025-01-31T00:00:00.000Z');

    mockApiClient.get
      .mockResolvedValueOnce({
        data: {
          content: [
            { id: 1, startTimestamp: 100, distance: 1 },
            { id: 2, startTimestamp: 300, distance: 2 },
          ],
          cursor: 20,
          hasNext: true,
        },
      })
      .mockResolvedValueOnce({
        data: {
          content: [{ id: 3, startTimestamp: 200, distance: 3 }],
          cursor: null,
          hasNext: false,
        },
      });

    const records = await runningService.loadRunningRecords({ startDate, endDate });

    expect(records.map((item) => item.id)).toEqual([2, 3, 1]);
    expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    expect(mockApiClient.get).toHaveBeenNthCalledWith(
      2,
      API_ENDPOINTS.RUNNING.SEARCH,
      expect.objectContaining({
        params: expect.objectContaining({ cursor: 20 }),
      })
    );
    expect(mockApiClient.get).not.toHaveBeenNthCalledWith(
      2,
      API_ENDPOINTS.RUNNING.SEARCH,
      expect.objectContaining({
        params: expect.objectContaining({ cursor: undefined }),
      })
    );
  });

  it('RUN-SVC-003 propagates API error when loading paginated records fails', async () => {
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    const networkError = new Error('network-down');
    mockApiClient.get.mockRejectedValue(networkError);

    await expect(
      runningService.loadRunningRecords({ startDate })
    ).rejects.toThrow('network-down');
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  it('maps end and update payloads for existing running records', async () => {
    mockApiClient.post.mockResolvedValue({
      data: {
        id: 77,
        distance: 4200,
        cadence: 168,
        heartRate: 145,
        calorie: 280,
        durationSec: 1500,
        point: 50,
      },
    });
    mockApiClient.put.mockResolvedValue({ data: undefined });

    const ended = await runningService.endRunning(sampleRecord);
    await runningService.updateRunningRecord(sampleRecord);

    expect(ended.point).toBe(50);
    expect(mockApiClient.post).toHaveBeenCalledWith(
      API_ENDPOINTS.RUNNING.END(77),
      expect.objectContaining({
        distance: 4200,
        durationSec: 1500,
        cadence: 168,
      })
    );
    expect(mockApiClient.put).toHaveBeenCalledWith(
      API_ENDPOINTS.RUNNING.DETAIL(77),
      sampleRecord
    );
    expect(mockApiClient.put).not.toHaveBeenCalledWith(
      API_ENDPOINTS.RUNNING.DETAIL(78),
      sampleRecord
    );
  });

  it('loads detail, loadMore, delete and item endpoints with correct params', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({
        data: { content: [sampleRecord], cursor: 1, hasNext: true },
      })
      .mockResolvedValueOnce({ data: sampleRecord })
      .mockResolvedValueOnce({ data: { items: [] } });
    mockApiClient.delete.mockResolvedValue({ data: undefined });
    mockApiClient.post.mockResolvedValue({ data: undefined });

    const loadMore = await runningService.loadMoreRecords({ cursor: 1, size: 20 });
    const detail = await runningService.getRunningRecord(77);
    await runningService.deleteRunningRecord(77);
    await runningService.saveRunningRecordItems({
      runningRecordId: 77,
      items: [
        {
          distance: 10,
          durationSec: 5,
          cadence: 150,
          heartRate: 140,
          minHeartRate: 130,
          maxHeartRate: 150,
          orderIndex: 0,
          startTimeStamp: 100,
          endTimeStamp: 105,
          gpsPoints: [],
        },
      ],
    });
    const items = await runningService.getRunningRecordItems(77);

    expect(loadMore.hasNext).toBe(true);
    expect(detail.id).toBe(77);
    expect(items).toEqual([]);
    expect(mockApiClient.get).toHaveBeenNthCalledWith(
      1,
      API_ENDPOINTS.RUNNING.SEARCH,
      { params: { cursor: 1, size: 20 } }
    );
    expect(mockApiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.RUNNING.DETAIL(77));
    expect(mockApiClient.post).toHaveBeenCalledWith(
      API_ENDPOINTS.RUNNING.ITEMS(77),
      expect.objectContaining({
        items: expect.any(Array),
      })
    );
  });
});
