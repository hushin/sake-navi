import { useInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { client, useSession } from '@/react-app/shared/api';
import { Button } from '@/react-app/shared/ui';
import { ReviewCard } from '@/react-app/widgets/review-card';
import { REVIEW_TAGS, type ReviewSort } from '@/shared/schemas/sake';

export type ReviewListSearch = {
  sort: ReviewSort;
  /** カンマ区切り。指定したタグをすべて含むレビューだけを表示する（AND） */
  tags?: string;
  /** 自分のレビューだけを表示する */
  mine?: boolean;
};

/**
 * 全レビューを横断して見る。評価順に並べ替えたり、タグで絞り込んだりして
 * 「評価の高い酒」を探す導線にする（タイムラインは新着順のまま）。
 */
export function ReviewsPage({
  search,
  onSearchChange,
}: {
  search: ReviewListSearch;
  onSearchChange: (next: ReviewListSearch) => void;
}) {
  const { data: session } = useSession();
  const userId = search.mine ? session?.user.id : undefined;
  const selectedTags = search.tags?.split(',').filter(Boolean) ?? [];

  const reviewsQuery = useInfiniteQuery({
    queryKey: ['reviews', search.sort, search.tags ?? '', userId ?? ''],
    // 自分のレビューだけの表示は、セッションが解決するまで待つ
    enabled: !search.mine || Boolean(session),
    queryFn: async ({ pageParam }) => {
      const res = await client.api.reviews.$get({
        query: {
          sort: search.sort,
          tags: search.tags || undefined,
          userId,
          cursor: pageParam,
        },
      });
      if (!res.ok) {
        throw new Error('レビューを取得できませんでした');
      }
      return res.json();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const items = reviewsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  // 相対時刻の基準は「最後に取得できた時刻」にする（render 中に Date.now() を呼ばない）
  const now = reviewsQuery.dataUpdatedAt;
  const hasFilters = selectedTags.length > 0 || Boolean(search.mine);

  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((value) => value !== tag)
      : [...selectedTags, tag];
    onSearchChange({ ...search, tags: next.length > 0 ? next.join(',') : undefined });
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">レビュー一覧</h1>
        <p className="text-sm text-muted-foreground">
          みんなのレビューを並び替え・タグで絞り込んで、評価の高いお酒を探せます。
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm font-medium">並び順</span>
          <FilterButton
            isSelected={search.sort === 'latest'}
            onClick={() => onSearchChange({ ...search, sort: 'latest' })}
          >
            新着順
          </FilterButton>
          <FilterButton
            isSelected={search.sort === 'rating'}
            onClick={() => onSearchChange({ ...search, sort: 'rating' })}
          >
            評価順
          </FilterButton>
          <FilterButton
            isSelected={Boolean(search.mine)}
            onClick={() => onSearchChange({ ...search, mine: search.mine ? undefined : true })}
            className="ml-auto"
          >
            自分のレビューだけ
          </FilterButton>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm font-medium">タグ</span>
          {REVIEW_TAGS.map((tag) => (
            <FilterButton
              key={tag}
              isSelected={selectedTags.includes(tag)}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </FilterButton>
          ))}
          {hasFilters && (
            <Button variant="ghost" size="xs" onClick={() => onSearchChange({ sort: search.sort })}>
              絞り込みを解除
            </Button>
          )}
        </div>
      </div>

      {reviewsQuery.isPending ? (
        <ReviewsSkeleton />
      ) : reviewsQuery.isError ? (
        <ReviewsError
          onRetry={() => void reviewsQuery.refetch()}
          isRetrying={reviewsQuery.isFetching}
        />
      ) : items.length === 0 ? (
        <ReviewsEmpty hasFilters={hasFilters} />
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <ReviewCard key={item.id} item={item} now={now} />
            ))}
          </ul>
          {reviewsQuery.hasNextPage && (
            <Button
              variant="outline"
              size="lg"
              disabled={reviewsQuery.isFetchingNextPage}
              onClick={() => void reviewsQuery.fetchNextPage()}
            >
              {reviewsQuery.isFetchingNextPage ? '読み込み中…' : 'もっと見る'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterButton({
  isSelected,
  onClick,
  className,
  children,
}: {
  isSelected: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={isSelected ? 'default' : 'outline'}
      aria-pressed={isSelected}
      onClick={onClick}
      className={className}
    >
      {children}
    </Button>
  );
}

function ReviewsSkeleton() {
  return (
    <div role="status" aria-label="読み込み中" className="flex flex-col gap-3">
      {['w-2/3', 'w-1/2', 'w-3/5'].map((width) => (
        <div key={width} className="rounded-xl border border-border p-4">
          <div className={`h-4 animate-pulse rounded-full bg-foreground/10 ${width}`} />
        </div>
      ))}
    </div>
  );
}

function ReviewsEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-12 text-center">
      <p className="text-sm font-medium">
        {hasFilters ? '条件に合うレビューがありません' : 'まだレビューがありません'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasFilters
          ? 'タグや並び順を変えて探してみてください。'
          : 'お酒を選んで最初の 1 件を投稿してみましょう。'}
      </p>
    </div>
  );
}

function ReviewsError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-border py-10 pl-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">レビューを読み込めませんでした</p>
        <p className="text-sm text-muted-foreground">
          通信に失敗しました。もう一度お試しください。
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? '再試行中…' : '再試行'}
      </Button>
    </div>
  );
}
