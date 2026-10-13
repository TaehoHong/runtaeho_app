import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { HairColorPicker } from '../views/components/HairColorPicker';
import { HAIR_COLORS } from '../models/avatarConstants';

it('exposes localized names and selected state while preserving color selection', () => {
  const onSelect = jest.fn();
  const view = render(<HairColorPicker selectedColor="#000000" onSelectColor={onSelect} />);
  expect(view.getByRole('button', { name: HAIR_COLORS[0].name }).props.accessibilityState).toEqual({ selected: true });
  const brown = view.getByRole('button', { name: HAIR_COLORS[1].name });
  expect(brown.props.accessibilityState).toEqual({ selected: false });
  fireEvent.press(brown);
  expect(onSelect).toHaveBeenCalledWith(HAIR_COLORS[1]);
});
