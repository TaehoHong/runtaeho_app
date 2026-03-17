const mockIsAvailableAsync = jest.fn();
const mockWatchStepCount = jest.fn();
const mockRemove = jest.fn();
let stepCountCallback: ((result: { steps: number }) => void) | null = null;

jest.mock('expo-sensors', () => ({
  Pedometer: {
    isAvailableAsync: (...args: unknown[]) => mockIsAvailableAsync(...args),
    watchStepCount: (...args: unknown[]) => mockWatchStepCount(...args),
  },
}));

const { pedometerService } = require('~/features/running/services/sensors/PedometerService');

describe('PedometerService final cadence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pedometerService.reset();
    stepCountCallback = null;
    mockIsAvailableAsync.mockResolvedValue(true);
    mockWatchStepCount.mockImplementation((callback: (result: { steps: number }) => void) => {
      stepCountCallback = callback;
      return { remove: mockRemove };
    });
  });

  it('keeps the last measured cadence for final upload when the latest signal is stale', async () => {
    const dateNowSpy = jest.spyOn(Date, 'now');

    dateNowSpy.mockReturnValue(0);
    await pedometerService.startTracking(() => {});

    dateNowSpy.mockReturnValue(10_000);
    stepCountCallback?.({ steps: 8 });

    expect(pedometerService.getCadenceSnapshot()).toEqual({
      cadence: 48,
      isMeasured: true,
    });
    expect(pedometerService.getFinalCadence()).toBe(48);

    dateNowSpy.mockReturnValue(16_000);

    expect(pedometerService.getCadenceSnapshot()).toEqual({
      cadence: 0,
      isMeasured: false,
    });
    expect(pedometerService.getFinalCadence()).toBe(48);

    dateNowSpy.mockRestore();
  });

  it('resets the stored final cadence when a new tracking session starts', async () => {
    const dateNowSpy = jest.spyOn(Date, 'now');

    dateNowSpy.mockReturnValue(0);
    await pedometerService.startTracking(() => {});

    dateNowSpy.mockReturnValue(10_000);
    stepCountCallback?.({ steps: 8 });
    expect(pedometerService.getFinalCadence()).toBe(48);

    pedometerService.reset();

    dateNowSpy.mockReturnValue(20_000);
    await pedometerService.startTracking(() => {});

    expect(pedometerService.getFinalCadence()).toBe(0);

    dateNowSpy.mockRestore();
  });
});
