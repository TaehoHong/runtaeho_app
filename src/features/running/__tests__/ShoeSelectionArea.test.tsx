import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { ShoeSelectionArea } from '~/features/running/views/shoe-selection-area';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockUseShoeViewModel = jest.fn();

jest.mock('~/features/shoes/viewmodels', () => ({
  useShoeViewModel: () => mockUseShoeViewModel(),
}));

jest.mock('~/shared/components/ui/Icon', () => ({
  Icon: () => null,
}));

describe('ShoeSelectionArea', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('RUN-SHOE-001 notifies parent when the main shoe is auto-selected', async () => {
    const onShoeSelect = jest.fn();

    mockUseShoeViewModel.mockReturnValue({
      shoes: [
        { id: 7, brand: 'Nike', model: 'Pegasus', totalDistance: 1200, isMain: true, isEnabled: true },
        { id: 8, brand: 'Asics', model: 'Novablast', totalDistance: 800, isMain: false, isEnabled: true },
      ],
      mainShoe: { id: 7, brand: 'Nike', model: 'Pegasus', totalDistance: 1200, isMain: true, isEnabled: true },
      isLoadingShoes: false,
    });

    renderWithProviders(<ShoeSelectionArea onShoeSelect={onShoeSelect} />);

    await waitFor(() => {
      expect(onShoeSelect).toHaveBeenCalledWith(7);
    });
  });

  it('RUN-SHOE-002 notifies parent when an initial selected shoe is restored', async () => {
    const onShoeSelect = jest.fn();

    mockUseShoeViewModel.mockReturnValue({
      shoes: [
        { id: 7, brand: 'Nike', model: 'Pegasus', totalDistance: 1200, isMain: true, isEnabled: true },
        { id: 8, brand: 'Asics', model: 'Novablast', totalDistance: 800, isMain: false, isEnabled: true },
      ],
      mainShoe: { id: 7, brand: 'Nike', model: 'Pegasus', totalDistance: 1200, isMain: true, isEnabled: true },
      isLoadingShoes: false,
    });

    renderWithProviders(
      <ShoeSelectionArea onShoeSelect={onShoeSelect} initialSelectedShoeId={8} />
    );

    await waitFor(() => {
      expect(onShoeSelect).toHaveBeenCalledWith(8);
    });
  });
});
