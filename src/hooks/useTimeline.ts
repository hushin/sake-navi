import useSWRInfinite from 'swr/infinite';
import { getTimeline, type TimelineResponse } from '@/lib/api';
import { SWR_KEYS } from '@/lib/swrKeys';

const ONE_MINUTE = 1 * 60 * 1000;

export function useTimeline() {
  const getKey = (pageIndex: number, previousPageData: TimelineResponse | null) => {
    if (pageIndex === 0) return [SWR_KEYS.timeline, null];
    if (!previousPageData?.nextCursor) return null;
    return [SWR_KEYS.timeline, previousPageData.nextCursor];
  };

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<TimelineResponse>(
      getKey,
      ([, cursor]: [string, string | null]) => getTimeline(cursor ?? undefined),
      {
        dedupingInterval: ONE_MINUTE,
        revalidateFirstPage: false,
        revalidateOnFocus: false,
        revalidateAll: false,
        persistSize: true,
      },
    );

  const items = data?.flatMap((page) => page.items) ?? [];
  const hasReachedEnd = data ? data[data.length - 1]?.nextCursor === null : false;
  const isLoadingMore = size > 0 && data && typeof data[size - 1] === 'undefined';

  const loadMore = () => {
    if (!hasReachedEnd && !isLoadingMore) {
      setSize(size + 1);
    }
  };

  const refresh = async () => {
    setSize(1);
    await mutate();
  };

  return {
    items,
    isLoading,
    isValidating,
    isLoadingMore: !!isLoadingMore,
    hasReachedEnd,
    error,
    loadMore,
    refresh,
    mutate,
  };
}
