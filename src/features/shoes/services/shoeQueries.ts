/**
 * Shoe React Query Hooks
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../services/queryClient';
import type { AddShoeDto, CursorResult, PatchShoeDto, Shoe, ShoeListRequest } from '../models';
import { shoeService } from './shoeService';


/**
 * 신발 무한 스크롤
 */
export const useInfiniteShoes = (
  params: {
    isEnabled?: boolean | undefined;
    size?: number | undefined;
  },
  options?: { enabled?: boolean | undefined } | undefined
) => {
  return useInfiniteQuery<CursorResult<Shoe>>({
    queryKey: queryKeys.shoe.list(params),
    queryFn: ({ pageParam }) =>
      shoeService.getShoesCursor({
        cursor: pageParam as number | undefined,
        isEnabled: params.isEnabled,
        size: params.size || 10,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage: CursorResult<Shoe>) => (lastPage.hasNext ? lastPage.nextCursor : undefined),
    ...(options?.enabled !== undefined && { enabled: options.enabled }),
  });
};

/**
 * 모든 신발 목록 조회
 */
export const useGetAllShoes = (
  params?: { isEnabled?: boolean | undefined } | undefined,
  options?: { enabled?: boolean | undefined } | undefined
) => {
  return useQuery<Shoe[]>({
    queryKey: queryKeys.shoe.allShoes(params?.isEnabled),
    queryFn: () => shoeService.getAllShoes(params),
    ...(options?.enabled !== undefined && { enabled: options.enabled }),
  });
};


/**
 * 신발 추가
 * 기존: useAddShoeMutation()
 */
export const useAddShoe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addShoeDto: AddShoeDto) => shoeService.addShoe(addShoeDto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.all });
    },
  });
};

/**
 * 신발 수정
 * 기존: usePatchShoeMutation()
 */
export const usePatchShoe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patchShoeDto: PatchShoeDto) => shoeService.patchShoe(patchShoeDto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoe.detail(variables.id) });
    },
  });
};
