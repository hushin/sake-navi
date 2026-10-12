import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Star } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { client, throwApiError } from '@/react-app/shared/api';
import { CELL_HEIGHT, CELL_WIDTH, cn, mapPointFor, mapSize } from '@/react-app/shared/lib';
import { Button, Card } from '@/react-app/shared/ui';

/** 横スクロール位置を覚えておくキー（酒蔵詳細から戻ったときに同じ場所へ戻す） */
const MAP_SCROLL_STORAGE_KEY = 'map-scroll-x';

/**
 * 会場のフロアマップ。酒蔵バッジを絶対配置で重ねる。
 *
 * `?brewery=<id>` で来たときはその酒蔵までスクロールして強調する
 * （酒蔵詳細から「マップで見る」で戻ってくる導線）。
 */
export function MapPage({ breweryId }: { breweryId?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const breweriesQuery = useQuery({
    queryKey: ['breweries'],
    queryFn: async () => {
      const res = await client.api.breweries.$get();
      if (!res.ok) {
        throwApiError(res, '酒蔵の一覧を取得できませんでした');
      }
      return res.json();
    },
  });

  const items = breweriesQuery.data?.items;
  const size = mapSize(items ?? []);

  // 強調する酒蔵が決まっていたら、その位置までスクロールする
  // （`items` を依存に入れているのは、酒蔵の描画が終わってから実行するため）
  useEffect(() => {
    if (breweryId === undefined || items === undefined) {
      return;
    }
    // TanStack Router の Link は ref を転送しないので、DOM から直接引く
    containerRef.current
      ?.querySelector<HTMLElement>(`[data-map-brewery="${breweryId}"]`)
      ?.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
  }, [breweryId, items]);

  // スクロール位置を記録する
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const handleScroll = () => {
      sessionStorage.setItem(MAP_SCROLL_STORAGE_KEY, String(container.scrollLeft));
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 強調の指定が無いときは、前回のスクロール位置に戻す
  useEffect(() => {
    const container = containerRef.current;
    if (!container || breweryId !== undefined || items === undefined) {
      return;
    }

    const saved = sessionStorage.getItem(MAP_SCROLL_STORAGE_KEY);
    if (saved !== null && Number.isFinite(Number(saved))) {
      container.scrollLeft = Number(saved);
    }
  }, [breweryId, items]);

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">会場マップ</h1>
            <p className="text-sm text-muted-foreground">
              ブースの場所から酒蔵を探せます。横にスクロールできます。
            </p>
          </div>
          {breweryId !== undefined && (
            <Button variant="outline" size="sm" className="shrink-0" render={<Link to="/map" />}>
              強調を解除
            </Button>
          )}
        </div>
      </header>

      {breweriesQuery.isPending ? (
        <MapSkeleton />
      ) : breweriesQuery.isError ? (
        <MapError
          onRetry={() => void breweriesQuery.refetch()}
          isRetrying={breweriesQuery.isFetching}
        />
      ) : items === undefined || items.length === 0 ? (
        <MapEmpty />
      ) : (
        <div
          ref={containerRef}
          className="overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-muted/30"
        >
          <div className="relative mx-auto" style={{ width: size.width, height: size.height }}>
            {items.map((brewery) => {
              const point = mapPointFor(brewery.mapColumn, brewery.mapRow);
              const isFocused = brewery.id === breweryId;

              return (
                <Link
                  key={brewery.id}
                  to="/breweries/$breweryId"
                  params={{ breweryId: String(brewery.id) }}
                  // 強調のスクロール先を DOM から探せるようにする
                  data-map-brewery={brewery.id}
                  // 強調中の 1 件だけが「表示中の酒蔵」として読み上げられる
                  aria-current={isFocused ? 'true' : undefined}
                  className={cn(
                    'absolute -translate-x-1/2 -translate-y-1/2 rounded-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isFocused && 'z-10',
                  )}
                  style={{ left: point.x, top: point.y }}
                >
                  <span
                    className={cn(
                      'relative flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-1 text-center transition-transform',
                      isFocused
                        ? 'scale-110 border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/30 dark:bg-emerald-950'
                        : brewery.hasUserReviewed
                          ? 'border-primary/60 bg-primary/5'
                          : 'border-border bg-card',
                    )}
                    style={{ width: CELL_WIDTH, height: CELL_HEIGHT }}
                  >
                    {/* 強調中の 1 件は波紋を出して、マップのどこにいるか目で追えるようにする */}
                    {isFocused && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 animate-ping rounded-lg border-2 border-emerald-500 opacity-75 motion-reduce:animate-none"
                      />
                    )}
                    <span className="text-[9px] leading-none text-muted-foreground">
                      No.{brewery.id}
                    </span>
                    <span className="text-[11px] leading-tight font-semibold break-words">
                      {brewery.name}
                    </span>
                    {brewery.averageRating === null ? (
                      <span className="text-[10px] leading-none text-muted-foreground">未評価</span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[10px] leading-none tabular-nums">
                        <Star aria-hidden="true" className="size-3 fill-amber-400 text-amber-400" />
                        {brewery.averageRating.toFixed(1)}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">凡例</span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border-2 border-primary/60 bg-primary/5" />
          レビュー済み
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border-2 border-border bg-card" />
          未レビュー
        </span>
        <span className="flex items-center gap-1.5">
          <Star aria-hidden="true" className="size-3 fill-amber-400 text-amber-400" />
          平均評価
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950" />
          表示中の酒蔵
        </span>
      </div>
    </div>
  );
}

function MapSkeleton() {
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

function MapEmpty() {
  return (
    <div className="rounded-xl border border-dashed border-border py-12 text-center">
      <p className="text-sm font-medium">酒蔵がまだ登録されていません</p>
      <p className="mt-1 text-sm text-muted-foreground">
        マスタの登録が済むと、ここにブースが並びます。
      </p>
    </div>
  );
}

function MapError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-border py-10 pl-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">マップを読み込めませんでした</p>
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
