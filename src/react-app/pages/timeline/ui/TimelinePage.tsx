import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { InferResponseType } from 'hono/client';
import { client } from '@/react-app/shared/api';
import { formatRelativeTime } from '@/react-app/shared/lib';
import { Badge, Button, StarRating } from '@/react-app/shared/ui';

type TimelineItem = InferResponseType<(typeof client.api.timeline)['$get'], 200>['items'][number];

export function TimelinePage() {
  const timelineQuery = useInfiniteQuery({
    queryKey: ['timeline'],
    queryFn: async ({ pageParam }) => {
      const res = await client.api.timeline.$get({ query: { cursor: pageParam } });
      if (!res.ok) {
        throw new Error('タイムラインを取得できませんでした');
      }
      return res.json();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const items = timelineQuery.data?.pages.flatMap((page) => page.items) ?? [];
  // 相対時刻の基準は「最後に取得できた時刻」にする（render 中に Date.now() を呼ばない）
  const now = timelineQuery.dataUpdatedAt;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">タイムライン</h1>
        <p className="text-sm text-muted-foreground">みんなのレビューを新しい順に表示します。</p>
      </header>

      {timelineQuery.isPending ? (
        <TimelineSkeleton />
      ) : timelineQuery.isError ? (
        <TimelineError
          onRetry={() => void timelineQuery.refetch()}
          isRetrying={timelineQuery.isFetching}
        />
      ) : items.length === 0 ? (
        <TimelineEmpty />
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <TimelineCard key={item.id} item={item} now={now} />
            ))}
          </ul>
          {timelineQuery.hasNextPage && (
            <Button
              variant="outline"
              size="lg"
              disabled={timelineQuery.isFetchingNextPage}
              onClick={() => void timelineQuery.fetchNextPage()}
            >
              {timelineQuery.isFetchingNextPage ? '読み込み中…' : 'もっと見る'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function TimelineCard({ item, now }: { item: TimelineItem; now: number }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{item.user.name}</span>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(item.createdAt, now)}
        </span>
        <StarRating value={item.rating} size="sm" className="ml-auto" />
      </div>
      <div className="flex flex-col gap-0.5">
        <Link
          to="/sakes/$sakeId"
          params={{ sakeId: String(item.sake.id) }}
          className="text-sm font-medium hover:underline"
        >
          {item.sake.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          No.{item.brewery.id} {item.brewery.name}
        </p>
      </div>
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}
      {item.comment && (
        <p className="text-sm leading-6 break-words whitespace-pre-wrap">{item.comment}</p>
      )}
    </li>
  );
}

function TimelineSkeleton() {
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

function TimelineEmpty() {
  return (
    <div className="rounded-xl border border-dashed border-border py-12 text-center">
      <p className="text-sm font-medium">まだレビューがありません</p>
      <p className="mt-1 text-sm text-muted-foreground">
        お酒を選んで最初の 1 件を投稿してみましょう。
      </p>
    </div>
  );
}

function TimelineError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-border py-10 pl-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">タイムラインを読み込めませんでした</p>
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
