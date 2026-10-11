import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { client } from './client';

const BOOKMARKS_QUERY_KEY = ['bookmarks'] as const;

/**
 * 自分のブックマーク一覧。
 *
 * 未サインインだと 401 になるので、セッションが無い画面では `enabled: false` で止める。
 * 一覧は `sakeIds` でも引けるようにして、画面ごとのトグルボタンの状態に使う。
 */
export function useBookmarks({ enabled = true }: { enabled?: boolean } = {}) {
  const query = useQuery({
    queryKey: BOOKMARKS_QUERY_KEY,
    enabled,
    queryFn: async () => {
      const res = await client.api.bookmarks.$get();
      if (!res.ok) {
        throw new Error('ブックマークを取得できませんでした');
      }
      return res.json();
    },
  });

  const sakeIds = useMemo(
    () => new Set(query.data?.items.map((item) => item.sakeId) ?? []),
    [query.data],
  );

  return { ...query, sakeIds };
}

/**
 * ブックマークの登録・解除。どちらも `['bookmarks']` を invalidate して、
 * 一覧と各画面のボタンを同じ状態に揃える（楽観更新はしない）。
 */
export function useBookmarkToggle() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY });

  const add = useMutation({
    mutationFn: async (sakeId: number) => {
      const res = await client.api.bookmarks.$post({ json: { sakeId } });
      // すでに登録済み（409）はこちらの状態が古いだけなので、成功と同じ扱いにする
      if (!res.ok && res.status !== 409) {
        throw new Error('ブックマークに追加できませんでした');
      }
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (sakeId: number) => {
      const res = await client.api.bookmarks[':sakeId'].$delete({
        param: { sakeId: String(sakeId) },
      });
      // すでに解除済み（404）も同じ扱い
      if (!res.ok && res.status !== 404) {
        throw new Error('ブックマークを解除できませんでした');
      }
    },
    onSuccess: invalidate,
  });

  return {
    /** `isBookmarked` は呼び出し元が持っている現在の状態を渡す */
    toggle: (sakeId: number, isBookmarked: boolean) => {
      if (isBookmarked) {
        remove.mutate(sakeId);
      } else {
        add.mutate(sakeId);
      }
    },
    /** 実行中の銘柄 id。全部のボタンを一斉に disabled にしないために返す */
    pendingSakeId: add.isPending ? add.variables : remove.isPending ? remove.variables : undefined,
    error: add.error ?? remove.error,
  };
}
