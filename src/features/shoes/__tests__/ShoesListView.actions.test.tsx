import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ShoesListView } from '../views/ShoesListView';

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));

const mockDelete = jest.fn();
const mockDisable = jest.fn();
const shoes = [
  { id: 1, brand: 'Nike', model: 'First', displayName: 'Nike First', totalDistance: 0, isAchieved: false },
  { id: 2, brand: 'Adidas', model: 'Second', displayName: 'Adidas Second', totalDistance: 1000, isAchieved: false },
];
jest.mock('../viewmodels', () => ({ useShoeViewModel: () => ({
  shoeViewModels: shoes, mainShoeViewModel: null, isLoading: false,
  handleSetMainShoe: jest.fn(), disableShoe: mockDisable, deleteShoe: mockDelete, refreshShoes: jest.fn(),
}) }));
jest.mock('react-native-swipe-list-view', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { SwipeListView: React.forwardRef(function MockSwipeList({ data, renderItem, renderHiddenItem }: any, ref: any) {
    React.useImperativeHandle(ref, () => ({ closeAllOpenRows: () => {} }));
    return <View>{data.map((item: any) => <View key={item.id}>{renderItem({ item })}{renderHiddenItem({ item })}</View>)}</View>;
  }) };
});
jest.mock('~/shared/components/ui', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Icon: ({ name }: { name: string }) => <Text>{name}</Text> };
});

it('identifies the selected shoe in the deletion confirmation and cancel does not delete', () => {
  render(<ShoesListView />);
  fireEvent.press(screen.getAllByText('treshcan')[1]!);
  expect(screen.getByText(/Adidas Second.*신발을 삭제하면/s)).toBeOnTheScreen();
  fireEvent.press(screen.getByText('취소'));
  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockDisable).not.toHaveBeenCalled();
});

it('asks before archiving the selected shoe and cancel leaves it unchanged', () => {
  render(<ShoesListView />);
  fireEvent.press(screen.getAllByText('store')[1]!);
  expect(screen.getAllByText('Adidas Second')).toHaveLength(2);
  expect(screen.getByText('신발 보관함에 보관할까요?')).toBeOnTheScreen();
  expect(mockDisable).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('취소'));
  expect(screen.queryByText(/신발 보관함에 보관할까요\?/)).toBeNull();
  expect(screen.getByText('Adidas Second')).toBeOnTheScreen();
  expect(mockDisable).not.toHaveBeenCalled();
});

it('archives only the selected shoe after confirmation', async () => {
  render(<ShoesListView />);
  fireEvent.press(screen.getAllByText('store')[1]!);
  expect(mockDisable).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('확인'));
  await waitFor(() => expect(mockDisable).toHaveBeenCalledWith(2));
  expect(mockDisable).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByText(/신발 보관함에 보관할까요\?/)).toBeNull());
});
