import React, { type PropsWithChildren } from 'react';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAvatarViewModel } from '../viewmodels/useAvatarViewModel';
import { avatarService } from '../services/avatarService';
import { pointService } from '~/features/point/services/pointService';
import { unityService } from '~/features/unity/services/UnityService';
import { useUserStore } from '~/stores/user/userStore';
import { createTestQueryClient } from '~/test-utils/queryClient';
import { ItemStatus, type Item } from '../models/Item';
import type { Avatar } from '../models/Avatar';
import { AvatarView } from '../views/AvatarView';
import { renderWithProviders } from '~/test-utils/renderWithProviders';
import { createUser } from '~/features/user/models/User';
import { getSessionSnapshot } from '~/features/auth/stores/authStore';

jest.mock('../services/avatarService', () => ({
  avatarService: { getItems: jest.fn(), purchaseItems: jest.fn(), updateEquippedItems: jest.fn() },
}));
jest.mock('~/features/point/services/pointService', () => {
  const actual = jest.requireActual('~/features/point/services/pointService');
  actual.pointService.getUserPoint = jest.fn();
  return actual;
});
jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: { syncAvatar: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../views/components/AvatarPreview', () => ({
  AvatarPreview: () => null,
}));

const hair: Item = {
  id: 1, itemType: { id: 1, name: '머리' }, name: 'Normal_Hair9',
  unityFilePath: 'Hair/Normal_Hair9', filePath: '', point: 0, createdAt: '', isOwned: true,
};
const paidHair: Item = { ...hair, id: 2, name: 'New_Hair_02', point: 1000, isOwned: false };
const cloth: Item = { ...hair, id: 3, itemType: { id: 2, name: '의상' } };
const paidCloth: Item = { ...cloth, id: 4, name: 'New_Cloth_02', point: 1000, isOwned: false };
const avatar: Avatar = { id: 1, userId: 1, isMain: true, hairColor: '#000000', items: [hair, cloth] };

function setup() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(useAvatarViewModel, { wrapper }), client };
}

beforeEach(() => {
  useUserStore.setState({
    currentUser: createUser({ id: 1, nickname: 'User 1' }),
    avatarId: 1, equippedItems: { 1: hair, 2: cloth }, hairColor: '#000000', totalPoint: 2500,
  });
  jest.mocked(avatarService.getItems).mockImplementation(async ({ itemTypeId }) => ({
    content: itemTypeId === 1 ? [hair, paidHair] : [cloth, paidCloth], cursor: 4, hasNext: false,
  }));
  jest.mocked(avatarService.purchaseItems).mockResolvedValue(undefined);
  jest.mocked(avatarService.updateEquippedItems).mockResolvedValue(avatar);
  jest.mocked(pointService.getUserPoint).mockResolvedValue({ userId: 1, point: 500 });
});

it('defaults to owned items and keeps a try-on when changing the filter', async () => {
  const { result } = setup();
  await waitFor(() => expect(result.current.currentCategoryItems.map(item => item.id)).toEqual([1]));
  act(() => result.current.selectOwnershipFilter('all'));
  expect(result.current.currentCategoryItems.map(item => item.id)).toEqual([1, 2]);
  act(() => result.current.selectItem(paidHair));
  expect(result.current.currentCategoryItems[1]?.status).toBe(ItemStatus.NOT_OWNED);
  act(() => result.current.selectOwnershipFilter('owned'));
  expect(result.current.currentCategoryItems.map(item => item.id)).toEqual([1]);
  expect(result.current.previewItems[1]?.id).toBe(2);
  expect(result.current.totalPurchasePrice).toBe(1000);
});

it('purchases selections from both categories even when the owned filter hides them', async () => {
  const { result } = setup();
  await waitFor(() => expect(result.current.currentCategoryItems).toHaveLength(1));
  act(() => {
    result.current.selectItem(paidHair);
    result.current.selectCategory(1);
  });
  await waitFor(() => expect(result.current.currentCategoryItems[0]?.id).toBe(3));
  act(() => result.current.selectItem(paidCloth));
  expect(result.current.totalPurchasePrice).toBe(2000);
  expect(result.current.remainingPoints).toBe(500);
  await act(async () => result.current.confirmPurchase());
  expect(avatarService.purchaseItems).toHaveBeenCalledWith({ itemIds: [2, 4] }, getSessionSnapshot());
  expect(useUserStore.getState().equippedItems[1]?.id).toBe(2);
  expect(useUserStore.getState().equippedItems[2]?.id).toBe(4);
  expect(result.current.hasChanges).toBe(false);
});

it('preserves selections when points are insufficient and restores the original preview on cancel', async () => {
  useUserStore.setState({ totalPoint: 500 });
  const { result } = setup();
  act(() => result.current.selectItem(paidHair));
  act(() => result.current.attemptPurchase());
  expect(result.current.showInsufficientPointsAlert).toBe(true);
  expect(result.current.showPurchaseModal).toBe(false);
  expect(result.current.previewItems[1]?.id).toBe(2);
  expect(avatarService.purchaseItems).not.toHaveBeenCalled();
  act(() => result.current.cancelChanges());
  expect(result.current.previewItems[1]?.id).toBe(1);
  expect(result.current.hasChanges).toBe(false);
  expect(unityService.syncAvatar).toHaveBeenCalledWith([hair, cloth], '#000000', { waitForReady: true });
});

it('retries only equipping after a successful purchase and an equip failure', async () => {
  jest.mocked(avatarService.updateEquippedItems).mockRejectedValue(new Error('equip unavailable'));
  const { result } = setup();
  act(() => result.current.selectItem(paidHair));
  await act(async () => result.current.confirmPurchase());
  expect(result.current.shouldShowPurchaseButton).toBe(false);
  expect(result.current.showPurchaseModal).toBe(false);
  expect(result.current.actionError).toBe('구매는 완료됐지만 적용하지 못했어요. 다시 적용해주세요.');
  expect(useUserStore.getState().equippedItems[1]?.id).toBe(1);
  jest.mocked(avatarService.updateEquippedItems).mockResolvedValue(avatar);
  await act(async () => result.current.confirmChanges());
  expect(avatarService.purchaseItems).toHaveBeenCalledTimes(1);
  expect(result.current.hasChanges).toBe(false);
  expect(result.current.actionError).toBeNull();
});

it('blocks duplicate confirmation while the purchase is in flight', async () => {
  let completePurchase!: () => void;
  jest.mocked(avatarService.purchaseItems).mockImplementation(() => new Promise<void>(resolve => {
    completePurchase = resolve;
  }));
  const { result } = setup();
  act(() => result.current.selectItem(paidHair));
  let first!: Promise<void>;
  act(() => { first = result.current.confirmPurchase(); });
  await waitFor(() => expect(avatarService.purchaseItems).toHaveBeenCalledTimes(1));
  await act(async () => result.current.confirmPurchase());
  expect(avatarService.purchaseItems).toHaveBeenCalledTimes(1);
  await act(async () => { completePurchase(); await first; });
});

it('does not automatically repeat a failed purchase or equip unpurchased items', async () => {
  jest.mocked(avatarService.purchaseItems).mockRejectedValue(new Error('response unavailable'));
  const { result } = setup();
  act(() => result.current.selectItem(paidHair));
  await act(async () => result.current.confirmPurchase());
  expect(avatarService.purchaseItems).toHaveBeenCalledTimes(1);
  expect(avatarService.updateEquippedItems).not.toHaveBeenCalled();
  expect(result.current.actionError).toBe('아이템 구매에 실패했습니다.');
  expect(result.current.previewItems[1]?.id).toBe(2);
  expect(useUserStore.getState().totalPoint).toBe(2500);
});

it('allows spending the exact balance and excludes an item replaced by an owned selection', async () => {
  useUserStore.setState({ totalPoint: 1000 });
  const { result } = setup();
  act(() => { result.current.selectItem(paidHair); result.current.selectItem(paidCloth); });
  act(() => result.current.selectItem(cloth));
  expect(result.current.itemsToPurchase.map(item => item.id)).toEqual([2]);
  act(() => result.current.attemptPurchase());
  expect(result.current.remainingPoints).toBe(0);
  expect(result.current.showPurchaseModal).toBe(true);
  expect(result.current.showInsufficientPointsAlert).toBe(false);
});

it('shows a combined purchase confirmation through the screen filters and category tabs', async () => {
  jest.useFakeTimers();
  const view = renderWithProviders(<AvatarView onClose={jest.fn()} />);
  try {
    await act(async () => { await jest.runOnlyPendingTimersAsync(); });
    expect(screen.getByText('착용 중')).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: '전체' }));
    fireEvent.press(screen.getByRole('button', { name: 'New_Hair_02, 1,000 P' }));
    fireEvent.press(screen.getByText('의상'));
    await act(async () => { await jest.runOnlyPendingTimersAsync(); });
    fireEvent.press(screen.getByRole('button', { name: 'New_Cloth_02, 1,000 P' }));
    fireEvent.press(screen.getByRole('tab', { name: '보유' }));
    expect(screen.queryByRole('button', { name: 'New_Cloth_02, 1,000 P' })).toBeNull();
    expect(screen.getByText('총 구매 금액 · 2,000 P')).toBeTruthy();
    fireEvent.press(screen.getByText('구매 후 적용'));
    expect(screen.getByText('-2,000 P')).toBeTruthy();
    expect(screen.getByText('500 P')).toBeTruthy();
    expect(avatarService.purchaseItems).not.toHaveBeenCalled();
  } finally {
    view.unmount();
    jest.useRealTimers();
  }
});
