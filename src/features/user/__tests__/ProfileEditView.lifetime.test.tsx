import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ProfileEditView } from '../views/ProfileEditView';

const mockBack = jest.fn();
const mockUpdate = jest.fn();
const mockRefresh = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('~/features/auth/hooks/useAuth', () => ({ useAuth: () => ({
  user: { nickname: 'before' }, refreshUserData: mockRefresh,
}) }));
jest.mock('~/shared/hooks', () => ({ useMediaPicker: () => ({ pickMedia: jest.fn() }) }));
jest.mock('../services/userService', () => ({ userService: { updateProfile: (...args: unknown[]) => mockUpdate(...args) } }));
jest.mock('~/features/auth/stores/authStore', () => ({ getSessionSnapshot: () => ({ generation: 1, userId: 7 }), isSessionCurrent: () => true }));

beforeEach(() => { mockUpdate.mockResolvedValue({}); mockRefresh.mockResolvedValue(undefined); });

it('closing during a pending save leaves without a false discard promise and still refreshes the committed profile', async () => {
  let finish!: (value: unknown) => void;
  mockUpdate.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const form = render(<ProfileEditView />);
  fireEvent.changeText(screen.getByPlaceholderText('닉네임을 입력하세요'), 'after');
  fireEvent.press(screen.getByText('저장'));
  fireEvent.press(screen.UNSAFE_getAllByType(Ionicons).find(node => node.props.name === 'close')!);
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(alert).not.toHaveBeenCalled();
  form.unmount();
  await act(async () => { finish({}); });
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(alert).not.toHaveBeenCalled();
  alert.mockRestore();
});

it('a success alert confirmation cannot pop a later screen', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const form = render(<ProfileEditView />);
  fireEvent.changeText(screen.getByPlaceholderText('닉네임을 입력하세요'), 'after');
  await act(async () => { fireEvent.press(screen.getByText('저장')); });
  const confirm = alert.mock.calls[0]![2]![0]!.onPress!;
  form.unmount();
  confirm();
  expect(mockBack).not.toHaveBeenCalled();
  alert.mockRestore();
});


it('closing an unsaved draft still asks before discarding changes', () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  render(<ProfileEditView />);
  fireEvent.changeText(screen.getByPlaceholderText('닉네임을 입력하세요'), 'after');
  fireEvent.press(screen.UNSAFE_getAllByType(Ionicons).find(node => node.props.name === 'close')!);
  expect(alert).toHaveBeenCalledWith('변경 사항 취소', '수정된 내용이 저장되지 않습니다. 나가시겠습니까?', [
    { text: '계속 편집', style: 'cancel' },
    { text: '나가기', style: 'destructive', onPress: expect.any(Function) },
  ]);
  expect(mockBack).not.toHaveBeenCalled();
  alert.mock.calls[0]![2]![1]!.onPress!();
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockUpdate).not.toHaveBeenCalled();
  alert.mockRestore();
});
