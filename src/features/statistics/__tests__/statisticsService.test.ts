import { statisticsService } from '../services/statisticsService';
import { apiClient } from '~/services/api/client';
import { Period } from '../models';

jest.mock('~/services/api/client', () => ({ apiClient: { get: jest.fn() } }));

it('sends UTC instant bounds and IANA zone without shifting the instant twice', async () => {
  jest.mocked(apiClient.get).mockResolvedValue({ data: {} });
  await statisticsService.getStatisticsSummary({
    startDateTime: new Date('2026-01-01T00:00:00+05:30'),
    endDateTime: new Date('2026-01-02T00:00:00+05:30'),
    statisticType: Period.MONTH, timeZone: 'Asia/Kolkata',
  });
  expect(apiClient.get).toHaveBeenCalledWith(expect.any(String), { params: {
    startDateTime: '2025-12-31T18:30:00.000', endDateTime: '2026-01-01T18:30:00.000',
    statisticType: Period.MONTH, timeZone: 'Asia/Kolkata',
  } });
});
