import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoesListView } from '../views/ShoesListView';
import { TouchableOpacity } from 'react-native';
import AddShoeRoute from '../../../../app/shoes/add-shoe';
import { AddShoeView } from '../views/AddShoeView';

const mockAdd = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('../services', () => ({
  useAddShoe: () => ({ mutateAsync: mockAdd, isPending: false }),
  shoeService: { addShoe: (...args: unknown[]) => mockAdd(...args) },
}));
jest.mock('../viewmodels', () => ({
  useShoeViewModel: () => ({
    handleAddShoe: (brand: string, model: string, targetDistance: number, isMain: boolean) =>
      mockAdd({ brand, model, targetDistance, isMain }),
    isAddingShoe: false,
    shoeViewModels: [],
    mainShoeViewModel: null,
    isLoading: false,
    refreshShoes: jest.fn(),
  }),
}));

const fill = (distance = '12') => {
  fireEvent.changeText(screen.getByPlaceholderText('신발의 브랜드를 입력해주세요.'), ' Brand ');
  fireEvent.changeText(screen.getByPlaceholderText('신발의 모델명을 입력해주세요.'), ' Model ');
  fireEvent.changeText(screen.getByPlaceholderText('목표 거리를 입력해주세요.'), distance);
};

beforeEach(() => {
  mockAdd.mockReset();
  mockBack.mockClear();
  mockAdd.mockResolvedValue({ id: 1 });
});

it('route saves a trimmed main shoe in meters and pops exactly once', async () => {
  render(<AddShoeRoute />);
  fill();
  fireEvent.press(screen.getByText('신발 저장하기'));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(mockAdd).toHaveBeenCalledWith({ brand: 'Brand', model: 'Model', targetDistance: 12000, isMain: true });
});

it('list saves zero distance without making the shoe main and refreshes before closing', async () => {
  const calls: string[] = [];
  render(<AddShoeView onSuccess={() => calls.push('success')} onClose={() => calls.push('close')} />);
  fill('0');
  fireEvent.press(screen.getByText('신발 저장하기'));
  await waitFor(() => expect(calls).toEqual(['success', 'close']));
  expect(mockAdd).toHaveBeenCalledWith({ brand: 'Brand', model: 'Model', targetDistance: 0, isMain: false });
  expect(mockBack).not.toHaveBeenCalled();
});

it('blocks same-turn duplicate submissions before pending state updates', async () => {
  mockAdd.mockReturnValue(new Promise(() => {}));
  render(<AddShoeRoute />);
  fill();
  const button = screen.UNSAFE_getAllByType(TouchableOpacity).find((node) => node.props.onPress && node.props.disabled !== undefined)!;
  act(() => {
    button.props.onPress();
    button.props.onPress();
  });
  expect(mockAdd).toHaveBeenCalledTimes(1);
});

it('keeps route failure visible and allows retry without closing', async () => {
  mockAdd.mockRejectedValueOnce(new Error('test failure'));
  render(<AddShoeRoute />);
  fill();
  fireEvent.press(screen.getByText('신발 저장하기'));
  await screen.findByText('신발 추가에 실패했습니다. 다시 시도해주세요.');
  expect(mockBack).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('신발 저장하기'));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
});

it('preserves list-only live numeric validation', () => {
  const list = render(<AddShoeView />);
  fill('1.5');
  expect(screen.getByText('목표 거리는 숫자로만 입력이 가능해요.')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('신발 저장하기'));
  expect(mockAdd).not.toHaveBeenCalled();
  list.unmount();
  render(<AddShoeRoute />);
  fill('1.5');
  expect(screen.queryByText('목표 거리는 숫자로만 입력이 가능해요.')).toBeNull();
  fireEvent.press(screen.getByText('신발 저장하기'));
  expect(mockAdd).not.toHaveBeenCalled();
});

it('leaves list failure open without adding the route error presentation', async () => {
  const onClose = jest.fn();
  const onSuccess = jest.fn();
  mockAdd.mockRejectedValueOnce(new Error('test failure'));
  render(<AddShoeView onClose={onClose} onSuccess={onSuccess} />);
  fill();
  fireEvent.press(screen.getByText('신발 저장하기'));
  await act(async () => { await Promise.resolve(); });
  expect(onClose).not.toHaveBeenCalled();
  expect(onSuccess).not.toHaveBeenCalled();
  expect(screen.queryByText('신발 추가에 실패했습니다. 다시 시도해주세요.')).toBeNull();
  fireEvent.press(screen.getByText('신발 저장하기'));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

it('starts with an empty form when the list modal is mounted again', () => {
  const first = render(<AddShoeView />);
  fill();
  first.unmount();
  render(<AddShoeView />);
  expect(screen.getByPlaceholderText('신발의 브랜드를 입력해주세요.').props.value).toBe('');
  expect(screen.getByPlaceholderText('신발의 모델명을 입력해주세요.').props.value).toBe('');
  expect(screen.getByPlaceholderText('목표 거리를 입력해주세요.').props.value).toBe('');
  fireEvent.press(screen.getByText('신발 저장하기'));
  expect(mockAdd).not.toHaveBeenCalled();
});


it('a previous submission cannot close the real list owner’s reopened add modal', async () => {
  let finish!: (value: unknown) => void;
  mockAdd.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  render(<ShoesListView />);
  const addButton = () => screen.UNSAFE_getAllByType(Ionicons).find(node => node.props.name === 'add-circle-outline')!;
  fireEvent.press(addButton());
  fill();
  fireEvent.press(screen.getByText('신발 저장하기'));
  fireEvent.press(screen.UNSAFE_getAllByType(Ionicons).find(node => node.props.name === 'chevron-back')!);
  fireEvent.press(addButton());
  await act(async () => { finish({ id: 1 }); });
  expect(screen.getByText('신발 저장하기')).toBeOnTheScreen();
  expect(screen.getByPlaceholderText('신발의 브랜드를 입력해주세요.').props.value).toBe('');
});

it('keeps the submitted shoe unchanged while pending and restores editing after failure', async () => {
  let fail!: (error: Error) => void;
  mockAdd.mockReturnValueOnce(new Promise((_, reject) => { fail = reject; }));
  render(<AddShoeRoute />);
  fill();
  fireEvent.press(screen.getByText('신발 저장하기'));
  const brand = screen.getByPlaceholderText('신발의 브랜드를 입력해주세요.');
  expect(brand.props.editable).toBe(false);
  act(() => brand.props.onChangeText('Changed after submit'));
  expect(screen.getByPlaceholderText('신발의 브랜드를 입력해주세요.').props.value).toBe(' Brand ');
  expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ brand: 'Brand' }));
  await act(async () => { fail(new Error('offline')); });
  expect(screen.getByPlaceholderText('신발의 브랜드를 입력해주세요.').props.editable).toBe(true);
  fireEvent.changeText(screen.getByPlaceholderText('신발의 브랜드를 입력해주세요.'), 'Retry');
  expect(screen.getByPlaceholderText('신발의 브랜드를 입력해주세요.').props.value).toBe('Retry');
});
