import { Link } from '@tanstack/react-router';
import { useBookmarkToggle, useBookmarks } from '@/react-app/shared/api';
import { cn } from '@/react-app/shared/lib';
import { Badge, BookmarkButton, Button, Card, PaidTastingBadge } from '@/react-app/shared/ui';

/** 自分のブックマーク一覧。解除はこの画面からもできる（保存済みなのでトグルは解除だけ） */
export function BookmarksPage() {
  const bookmarks = useBookmarks();
  const { toggle, pendingSakeId, error } = useBookmarkToggle();

  const items = bookmarks.data?.items ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">ブックマーク</h1>
        <p className="text-sm text-muted-foreground">
          気になった銘柄を保存して、会場でもあとからでも見返せます。
        </p>
      </header>

      {bookmarks.isPending ? (
        <BookmarksSkeleton />
      ) : bookmarks.isError ? (
        <BookmarksError
          onRetry={() => void bookmarks.refetch()}
          isRetrying={bookmarks.isFetching}
        />
      ) : items.length === 0 ? (
        <BookmarksEmpty />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((bookmark) => (
            <li
              key={bookmark.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <Link
                    to="/sakes/$sakeId"
                    params={{ sakeId: String(bookmark.sakeId) }}
                    className="font-medium break-words hover:underline"
                  >
                    {bookmark.sake.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    No.{bookmark.brewery.id} {bookmark.brewery.name}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {bookmark.sake.type && <Badge variant="secondary">{bookmark.sake.type}</Badge>}
                  {bookmark.sake.category !== '清酒' && (
                    <Badge variant="outline">{bookmark.sake.category}</Badge>
                  )}
                  {bookmark.sake.isLimited && <Badge variant="destructive">限定</Badge>}
                  <PaidTastingBadge price={bookmark.sake.paidTastingPrice} />
                </div>
              </div>
              <BookmarkButton
                isBookmarked
                isPending={pendingSakeId === bookmark.sakeId}
                onToggle={() => toggle(bookmark.sakeId, true)}
              />
            </li>
          ))}
        </ul>
      )}

      {error instanceof Error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}

function BookmarksSkeleton() {
  return (
    <div role="status" aria-label="読み込み中" className="flex flex-col gap-3">
      {['w-2/3', 'w-1/2'].map((width) => (
        <Card key={width} className="h-24 p-4">
          <div className={cn('h-4 animate-pulse rounded-full bg-foreground/10', width)} />
        </Card>
      ))}
    </div>
  );
}

function BookmarksEmpty() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-12 text-center">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">ブックマークはまだありません</p>
        <p className="text-sm text-muted-foreground">
          気になった銘柄のブックマークボタンで、ここに保存できます。
        </p>
      </div>
      <Button variant="outline" size="sm" render={<Link to="/sakes" />}>
        お酒を探す
      </Button>
    </div>
  );
}

function BookmarksError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-border py-10 pl-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">ブックマークを読み込めませんでした</p>
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
