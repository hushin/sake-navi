import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { client } from '@/react-app/shared/api';
import { Badge, Button, Card, PaidTastingBadge, StarRating } from '@/react-app/shared/ui';

/** 酒蔵の詳細。出品酒をまとめて見て、お酒詳細（レビュー）へ進む */
export function BreweryDetailPage({ breweryId }: { breweryId: number }) {
  const breweryQuery = useQuery({
    queryKey: ['brewery', breweryId],
    queryFn: async () => {
      const res = await client.api.breweries[':id'].$get({ param: { id: String(breweryId) } });
      if (res.status === 404) {
        throw new Error('酒蔵が見つかりませんでした');
      }
      if (!res.ok) {
        throw new Error('酒蔵の情報を取得できませんでした');
      }
      return res.json();
    },
  });

  if (breweryQuery.isPending) {
    return <BreweryDetailSkeleton />;
  }

  if (breweryQuery.isError) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4">
        <p className="text-sm font-medium">
          {breweryQuery.error instanceof Error ? breweryQuery.error.message : ''}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void breweryQuery.refetch()}
            disabled={breweryQuery.isFetching}
          >
            {breweryQuery.isFetching ? '再試行中…' : '再試行'}
          </Button>
          <Button variant="ghost" size="sm" render={<Link to="/map" />}>
            マップへ
          </Button>
        </div>
      </div>
    );
  }

  const { brewery, sakes } = breweryQuery.data;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <Link
        to="/map"
        search={{ brewery: brewery.id }}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← マップ
      </Link>

      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">No.{brewery.id}</p>
          <h1 className="text-2xl font-semibold tracking-tight break-words">{brewery.name}</h1>
          {brewery.area && (
            <div>
              <Badge variant="outline">{brewery.area}</Badge>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          render={<Link to="/map" search={{ brewery: brewery.id }} />}
        >
          マップで見る
        </Button>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">出品酒（{sakes.length}）</h2>
        {sakes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <p className="text-sm font-medium">出品酒がまだ登録されていません</p>
            <p className="mt-1 text-sm text-muted-foreground">
              会場で確認したら、お酒の追加や編集ができます。
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {sakes.map((sake) => (
              <li key={sake.id}>
                <Link
                  to="/sakes/$sakeId"
                  params={{ sakeId: String(sake.id) }}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium break-words">{sake.name}</p>
                    <div className="shrink-0 text-right">
                      {sake.averageRating === null ? (
                        <span className="text-xs text-muted-foreground">未評価</span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <StarRating value={Math.round(sake.averageRating)} size="sm" />
                          <span className="text-sm tabular-nums">
                            {sake.averageRating.toFixed(1)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sake.type && <Badge variant="secondary">{sake.type}</Badge>}
                    {sake.category !== '清酒' && <Badge variant="outline">{sake.category}</Badge>}
                    {sake.isLimited && <Badge variant="destructive">限定</Badge>}
                    <PaidTastingBadge price={sake.paidTastingPrice} />
                    {sake.myReviewId !== null && <Badge>レビュー済み</Badge>}
                    {sake.reviewCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        レビュー {sake.reviewCount} 件
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BreweryDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="読み込み中"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6"
    >
      <div className="h-4 w-24 animate-pulse rounded-full bg-foreground/10" />
      <div className="h-8 w-1/2 animate-pulse rounded-full bg-foreground/10" />
      <Card className="h-40 p-4" />
    </div>
  );
}
