import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { EditShoeView } from '../views/EditShoeView';
import { createShoeViewModel, type Shoe } from '../models';
import { shoeService } from '../services/shoeService';
import { queryKeys } from '~/services/queryClient';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('../services/shoeService', () => ({ shoeService: { patchShoe: jest.fn() } }));

it('a committed edit after leaving invalidates shoe caches without closing another form', async () => {
  const shoe: Shoe = { id: 1, brand: 'Brand', model: 'Model', totalDistance: 0,
    targetDistance: 10000, isMain: false, isEnabled: true };
  let finish!: (value: Shoe) => void;
  jest.mocked(shoeService.patchShoe).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const onClose = jest.fn();
  const form = renderWithProviders(<EditShoeView shoe={createShoeViewModel(shoe)} onClose={onClose} />);
  const key = queryKeys.shoe.allShoes(true);
  form.queryClient.setQueryData(key, [shoe]);
  fireEvent.changeText(screen.getByPlaceholderText('신발의 모델명을 입력해주세요.'), 'Updated');
  fireEvent.press(screen.getByText('신발 수정하기'));
  form.unmount();
  await act(async () => { finish({ ...shoe, model: 'Updated' }); });
  expect(form.queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  expect(onClose).not.toHaveBeenCalled();
});

it('retains the submitted edit through a pending failure and allows editing and retrying', async () => {
  const shoe: Shoe = { id: 1, brand: 'Brand', model: 'Model', totalDistance: 0,
    targetDistance: 10000, isMain: false, isEnabled: true };
  let fail!: (error: Error) => void;
  const patch = jest.mocked(shoeService.patchShoe);
  patch.mockReset();
  patch.mockReturnValueOnce(new Promise((_, reject) => { fail = reject; }));
  const onClose = jest.fn();
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  renderWithProviders(<EditShoeView shoe={createShoeViewModel(shoe)} onClose={onClose} />);
  fireEvent.changeText(screen.getByPlaceholderText('신발의 모델명을 입력해주세요.'), 'Edit A');
  fireEvent.press(screen.getByText('신발 수정하기'));
  const model = screen.getByPlaceholderText('신발의 모델명을 입력해주세요.');
  expect(model.props.editable).toBe(false);
  act(() => model.props.onChangeText('Edit B'));
  expect(screen.getByPlaceholderText('신발의 모델명을 입력해주세요.').props.value).toBe('Edit A');
  await waitFor(() => expect(patch).toHaveBeenCalledWith(expect.objectContaining({ model: 'Edit A' })));
  await act(async () => { fail(new Error('offline')); });
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByPlaceholderText('신발의 모델명을 입력해주세요.').props.editable).toBe(true);
  fireEvent.changeText(screen.getByPlaceholderText('신발의 모델명을 입력해주세요.'), 'Retry');
  patch.mockResolvedValueOnce({ ...shoe, model: 'Retry' });
  await act(async () => { fireEvent.press(screen.getByText('신발 수정하기')); });
  expect(patch).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'Retry' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  errorLog.mockRestore();
});
