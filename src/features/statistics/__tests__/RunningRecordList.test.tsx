import { screen } from '@testing-library/react-native';
import { RunningRecordList } from '~/features/statistics/views/components/RunningRecordList';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockUseRunningRecordList = jest.fn();

jest.mock('~/features/statistics/viewmodels/useRunningRecordList', () => ({
  useRunningRecordList: (...args: unknown[]) => mockUseRunningRecordList(...args),
}));

const createListState = (overrides: Record<string, unknown> = {}) => ({
  records: [],
  isLoading: false,
  isError: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  fetchNextPage: jest.fn(),
  error: null,
  ...overrides,
});

describe('RunningRecordList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRunningRecordList.mockReturnValue(createListState());
  });

  it('forwards date filters to the running record list hook', () => {
    const startDate = new Date('2026-02-01T00:00:00.000Z');
    const endDate = new Date('2026-02-28T23:59:59.999Z');

    renderWithProviders(<RunningRecordList startDate={startDate} endDate={endDate} />);

    expect(mockUseRunningRecordList).toHaveBeenCalledWith({ startDate, endDate });
  });

  it('renders the period-specific empty message when records are empty', () => {
    renderWithProviders(<RunningRecordList emptyMessage="선택한 기간에 러닝 기록이 없어요." />);

    expect(screen.getByText('선택한 기간에 러닝 기록이 없어요.')).toBeOnTheScreen();
  });

  it('keeps the default empty message when no custom message is provided', () => {
    renderWithProviders(<RunningRecordList />);

    expect(screen.getByText('러닝을 시작하면 기록이 생겨요!')).toBeOnTheScreen();
  });
});
