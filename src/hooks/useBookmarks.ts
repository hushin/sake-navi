import useSWR from 'swr';
import { getBookmarks, addBookmark, removeBookmark, type BookmarkedSake } from '@/lib/api';
import { SWR_KEYS } from '@/lib/swrKeys';

export function useBookmarks() {
  const { data, error, isLoading, mutate } = useSWR<BookmarkedSake[]>(
    SWR_KEYS.bookmarks,
    () => getBookmarks(),
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const bookmarkedSakeIds = new Set(data?.map((b) => b.sake.sakeId) ?? []);
  const bookmarkedBreweryIds = new Set(data?.map((b) => b.brewery.breweryId) ?? []);

  const toggleBookmark = async (sakeId: number) => {
    const isBookmarked = bookmarkedSakeIds.has(sakeId);

    if (isBookmarked) {
      // 削除: オプティミスティック更新
      const optimisticData = data?.filter((b) => b.sake.sakeId !== sakeId);
      await mutate(
        async () => {
          await removeBookmark(sakeId);
          return optimisticData;
        },
        {
          optimisticData,
          rollbackOnError: true,
          revalidate: false,
        },
      );
    } else {
      // 追加: APIコール後に再取得（BookmarkedSakeオブジェクトの構築が困難なため）
      await addBookmark(sakeId);
      await mutate();
    }
  };

  return {
    bookmarks: data ?? [],
    bookmarkedSakeIds,
    bookmarkedBreweryIds,
    isLoading,
    error,
    toggleBookmark,
    mutate,
  };
}
