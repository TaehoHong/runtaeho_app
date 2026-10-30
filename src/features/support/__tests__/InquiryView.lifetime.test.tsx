import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { InquiryView } from '../views/InquiryView';
import { ErrorInquiryView } from '../views/ErrorInquiryView';

const mockReplace = jest.fn();
const mockSubmit = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('../inquiryService', () => ({ inquiryService: { submit: (...args: unknown[]) => mockSubmit(...args) } }));

const submitInquiry = () => {
  const form = render(<InquiryView />);
  fireEvent.changeText(screen.getByPlaceholderText('문의 제목을 입력해주세요.'), 'A question');
  fireEvent.changeText(screen.getByPlaceholderText('궁금한 점을 자세히 적어주세요.'), 'Question details');
  fireEvent.changeText(screen.getByPlaceholderText('email@example.com'), 'runner@example.com');
  fireEvent.press(screen.getByText('문의 보내기'));
  return form;
};

it('leaving a submitted inquiry prevents its late success from replacing the current screen', async () => {
  let finish!: (value: { trackingNo: string }) => void;
  mockSubmit.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const form = submitInquiry();
  form.unmount();
  await act(async () => { finish({ trackingNo: 'INQ-1' }); });
  expect(mockReplace).not.toHaveBeenCalled();
});

it('leaving a submitted inquiry suppresses its late failure alert', async () => {
  let fail!: (error: Error) => void;
  mockSubmit.mockReturnValueOnce(new Promise((_, reject) => { fail = reject; }));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const form = submitInquiry();
  form.unmount();
  await act(async () => { fail(new Error('offline')); });
  expect(alert).not.toHaveBeenCalled();
  alert.mockRestore();
});


it('an active inquiry can retry a failed submission and open its accepted tracking number', async () => {
  mockSubmit.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ trackingNo: 'INQ 1' });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  submitInquiry();
  await waitFor(() => expect(alert).toHaveBeenCalledWith('문의 접수 실패', expect.any(String), [{ text: '확인' }]));
  await act(async () => { fireEvent.press(screen.getByText('문의 보내기')); });
  expect(mockReplace).toHaveBeenCalledWith('/user/inquiry-done?trackingNo=INQ%201');
  alert.mockRestore();
});

it('keeps the submitted input unchanged while pending and restores editing after failure', async () => {
  let fail!: (error: Error) => void;
  mockSubmit.mockReturnValueOnce(new Promise((_, reject) => { fail = reject; }));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  submitInquiry();
  const title = screen.getByPlaceholderText('문의 제목을 입력해주세요.');
  expect(title.props.editable).toBe(false);
  act(() => title.props.onChangeText('Changed after submit'));
  expect(screen.getByPlaceholderText('문의 제목을 입력해주세요.').props.value).toBe('A question');
  expect(mockSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'A question' }));
  await act(async () => { fail(new Error('offline')); });
  expect(screen.getByPlaceholderText('문의 제목을 입력해주세요.').props.editable).toBe(true);
  fireEvent.changeText(screen.getByPlaceholderText('문의 제목을 입력해주세요.'), 'Retry');
  expect(screen.getByPlaceholderText('문의 제목을 입력해주세요.').props.value).toBe('Retry');
  alert.mockRestore();
});


it('holds diagnostics consent during a pending error inquiry and allows changing it after failure', async () => {
  let fail!: (error: Error) => void;
  mockSubmit.mockReturnValueOnce(new Promise((_, reject) => { fail = reject; }));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  render(<ErrorInquiryView />);
  fireEvent.changeText(screen.getByPlaceholderText('문제가 발생한 상황을 적어주세요.'), 'Details');
  fireEvent.changeText(screen.getByPlaceholderText('email@example.com'), 'runner@example.com');
  fireEvent.press(screen.getByText('오류 문의 보내기'));
  const toggle = screen.UNSAFE_getAllByType(TouchableOpacity).find(node => node.props.testID === 'diagnostics-toggle')!;
  expect(toggle.props.disabled).toBe(true);
  act(() => toggle.props.onPress());
  await act(async () => { fail(new Error('offline')); });
  expect(screen.UNSAFE_getAllByType(TouchableOpacity).find(node => node.props.testID === 'diagnostics-toggle')!.props.disabled).toBe(false);
  mockSubmit.mockResolvedValueOnce({ trackingNo: 'INQ-2' });
  await act(async () => { fireEvent.press(screen.getByText('오류 문의 보내기')); });
  expect(mockSubmit).toHaveBeenLastCalledWith(expect.not.objectContaining({ appVersion: expect.anything() }));
  alert.mockRestore();
});
