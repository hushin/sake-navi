import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { InferResponseType } from 'hono/client';
import { type ReactNode, useRef } from 'react';
import { client, useBookmarkToggle, useBookmarks, useSession } from '@/react-app/shared/api';
import { cn } from '@/react-app/shared/lib';
import {
  Badge,
  BookmarkButton,
  Button,
  Card,
  Input,
  PaidTastingBadge,
  StarRating,
} from '@/react-app/shared/ui';
import { SAKE_CATEGORIES } from '@/shared/schemas/sake';

export type SakeListSearch = {
  /** URL に無いときは undefined（リンク側で search を省略できるようにする） */
  q?: string;
  category?: string;
  /** 有料試飲あり（金額の有無を問わない） */
  hasPaidTasting?: boolean;
  /** 有料試飲とだけ分かっていて金額が未入力（会場で埋める用） */
  needsPrice?: boolean;
};

type SakeListItem = InferResponseType<(typeof client.api.sakes)['$get'], 200>['items'][number];

/**
 * 検索条件は URL が持つ。入力欄は非制御にして、送信時にだけ URL を書き換える
 * （呼び出し側が `key={search.q}` を付けるので、URL が外から変わったら入力欄も作り直される）。
 */
export function SakeListPage({
  search,
  onSearchChange,
}: {
  search: SakeListSearch;
  onSearchChange: (next: SakeListSearch) => void;
}) {
  const keywordRef = useRef<HTMLInputElement>(null);
  const keyword = search.q ?? '';

  // 未サインインだと 401 になるので、セッションがあるときだけブックマークを取る
  const { data: session } = useSession();
  const bookmarks = useBookmarks({ enabled: Boolean(session) });
  const { toggle, pendingSakeId } = useBookmarkToggle();

  const category = SAKE_CATEGORIES.find((value) => value === search.category);

  const sakesQuery = useInfiniteQuery({
    queryKey: [
      'sakes',
      keyword,
      search.category ?? '',
      search.hasPaidTasting ? 'paid' : '',
      search.needsPrice ? 'needs-price' : '',
    ],
    queryFn: async ({ pageParam }) => {
      const res = await client.api.sakes.$get({
        query: {
          q: keyword.length > 0 ? keyword : undefined,
          category,
          hasPaidTasting: search.hasPaidTasting ? 'true' : undefined,
          needsPrice: search.needsPrice ? 'true' : undefined,
          cursor: pageParam === undefined ? undefined : String(pageParam),
        },
      });
      if (!res.ok) {
        throw new Error('お酒の一覧を取得できませんでした');
      }
      return res.json();
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const items = sakesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">お酒</h1>
        <p className="text-sm text-muted-foreground">
          にいがた酒の陣の出品酒から探して、レビューを残せます。
        </p>
      </header>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSearchChange({ ...search, q: keywordRef.current?.value.trim() ?? '' });
        }}
      >
        <div className="flex items-center gap-2">
          <Input
            ref={keywordRef}
            defaultValue={keyword}
            placeholder="酒名・酒蔵名で検索"
            aria-label="酒名・酒蔵名で検索"
            className="h-9"
          />
          <Button type="submit" size="lg" className="shrink-0 px-4">
            検索
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterButton
            isSelected={category === undefined}
            onClick={() => onSearchChange({ ...search, category: '' })}
          >
            すべて
          </FilterButton>
          {SAKE_CATEGORIES.map((value) => (
            <FilterButton
              key={value}
              isSelected={category === value}
              onClick={() => onSearchChange({ ...search, category: value })}
            >
              {value}
            </FilterButton>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterButton
            isSelected={Boolean(search.hasPaidTasting)}
            onClick={() =>
              onSearchChange({
                ...search,
                hasPaidTasting: search.hasPaidTasting ? undefined : true,
              })
            }
          >
            有料試飲あり
          </FilterButton>
          <FilterButton
            isSelected={Boolean(search.needsPrice)}
            onClick={() =>
              onSearchChange({ ...search, needsPrice: search.needsPrice ? undefined : true })
            }
          >
            金額未入力
          </FilterButton>
        </div>
      </form>

      {sakesQuery.isPending ? (
        <SakeListSkeleton />
      ) : sakesQuery.isError ? (
        <SakeListError
          onRetry={() => void sakesQuery.refetch()}
          isRetrying={sakesQuery.isFetching}
        />
      ) : items.length === 0 ? (
        <SakeListEmpty />
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {items.map((sake) => (
              <SakeListItemCard
                key={sake.id}
                sake={sake}
                canBookmark={Boolean(session)}
                isBookmarked={bookmarks.sakeIds.has(sake.id)}
                isBookmarkPending={pendingSakeId === sake.id}
                onToggleBookmark={() => toggle(sake.id, bookmarks.sakeIds.has(sake.id))}
              />
            ))}
          </ul>
          {sakesQuery.hasNextPage && (
            <Button
              variant="outline"
              size="lg"
              disabled={sakesQuery.isFetchingNextPage}
              onClick={() => void sakesQuery.fetchNextPage()}
            >
              {sakesQuery.isFetchingNextPage ? '読み込み中…' : 'もっと見る'}
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
  children,
}: {
  isSelected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={isSelected ? 'default' : 'outline'}
      aria-pressed={isSelected}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function SakeListItemCard({
  sake,
  canBookmark,
  isBookmarked,
  isBookmarkPending,
  onToggleBookmark,
}: {
  sake: SakeListItem;
  canBookmark: boolean;
  isBookmarked: boolean;
  isBookmarkPending: boolean;
  onToggleBookmark: () => void;
}) {
  return (
    <li className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 transition-colors focus-within:bg-muted/50 hover:bg-muted/50">
      <Link
        to="/sakes/$sakeId"
        params={{ sakeId: String(sake.id) }}
        className="flex min-w-0 flex-1 flex-col gap-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium break-words">{sake.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              No.{sake.breweryId} {sake.breweryName}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {sake.averageRating === null ? (
              <span className="text-xs text-muted-foreground">未評価</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <StarRating value={Math.round(sake.averageRating)} size="sm" />
                <span className="text-sm tabular-nums">{sake.averageRating.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {sake.type && <Badge variant="secondary">{sake.type}</Badge>}
          {sake.category !== '清酒' && <Badge variant="outline">{sake.category}</Badge>}
          {sake.isLimited && <Badge variant="destructive">限定</Badge>}
          <PaidTastingBadge price={sake.paidTastingPrice} />
          {sake.reviewCount > 0 && (
            <span className="text-xs text-muted-foreground">レビュー {sake.reviewCount} 件</span>
          )}
        </div>
      </Link>
      {canBookmark && (
        <BookmarkButton
          isBookmarked={isBookmarked}
          isPending={isBookmarkPending}
          onToggle={onToggleBookmark}
          className="shrink-0"
        />
      )}
    </li>
  );
}

function SakeListSkeleton() {
  return (
    <div role="status" aria-label="読み込み中" className="flex flex-col gap-3">
      {['w-2/3', 'w-1/2', 'w-3/5'].map((width) => (
        <Card key={width} className="h-24 p-4">
          <div className={cn('h-4 animate-pulse rounded-full bg-foreground/10', width)} />
        </Card>
      ))}
    </div>
  );
}

function SakeListEmpty() {
  return (
    <div className="rounded-xl border border-dashed border-border py-12 text-center">
      <p className="text-sm font-medium">該当するお酒がありません</p>
      <p className="mt-1 text-sm text-muted-foreground">
        キーワードや区分を変えて探してみてください。
      </p>
    </div>
  );
}

function SakeListError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-border py-10 pl-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">お酒の一覧を読み込めませんでした</p>
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
