import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { client, throwApiError, useSession } from '@/react-app/shared/api';
import { SakeForm } from '@/react-app/features/sake-form';
import { Badge, Button, Card, PaidTastingBadge, StarRating } from '@/react-app/shared/ui';
import type { SakeUpdateInput } from '@/shared/schemas/sake';
import { breweryQuery } from '../api';
import { BreweryNotes } from './BreweryNotes';

/** 酒蔵の詳細。出品酒をまとめて見て、お酒詳細（レビュー）へ進む */
export function BreweryDetailPage({ breweryId }: { breweryId: number }) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isAddingSake, setIsAddingSake] = useState(false);
  /** 追加した銘柄。一覧に反映したあと、レビューへ進む導線を出す */
  const [createdSake, setCreatedSake] = useState<{ id: number; name: string } | null>(null);

  const breweryResult = useQuery(breweryQuery(breweryId));

  /** マスタに無い銘柄（当日の限定酒など）をその場で追加する */
  const createSake = useMutation({
    mutationFn: async (input: SakeUpdateInput) => {
      const res = await client.api.breweries[':id'].sakes.$post({
        param: { id: String(breweryId) },
        json: input,
      });
      if (!res.ok) {
        throwApiError(res, 'お酒を追加できませんでした');
      }
      return res.json();
    },
    onSuccess: async (created) => {
      setIsAddingSake(false);
      setCreatedSake({ id: created.id, name: created.name });
      await queryClient.invalidateQueries({ queryKey: ['brewery', breweryId] });
      void queryClient.invalidateQueries({ queryKey: ['sakes'] });
    },
  });

  if (breweryResult.isPending) {
    return <BreweryDetailSkeleton />;
  }

  if (breweryResult.isError) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4">
        <p className="text-sm font-medium">
          {breweryResult.error instanceof Error ? breweryResult.error.message : ''}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void breweryResult.refetch()}
            disabled={breweryResult.isFetching}
          >
            {breweryResult.isFetching ? '再試行中…' : '再試行'}
          </Button>
          <Button variant="ghost" size="sm" render={<Link to="/map" />}>
            マップへ
          </Button>
        </div>
      </div>
    );
  }

  const { brewery, sakes } = breweryResult.data;

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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">出品酒（{sakes.length}）</h2>
          {session && !isAddingSake && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCreatedSake(null);
                setIsAddingSake(true);
              }}
            >
              酒を追加
            </Button>
          )}
        </div>
        {isAddingSake && (
          <SakeForm
            submitLabel="追加する"
            isSubmitting={createSake.isPending}
            onCancel={() => setIsAddingSake(false)}
            onSubmit={async (input) => {
              await createSake.mutateAsync(input);
            }}
          />
        )}
        {createSake.error instanceof Error && (
          <p className="text-sm text-destructive">{createSake.error.message}</p>
        )}
        {createdSake && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <p className="text-sm font-medium">{createdSake.name} を追加しました。</p>
            <Button
              size="sm"
              className="shrink-0"
              render={<Link to="/sakes/$sakeId" params={{ sakeId: String(createdSake.id) }} />}
            >
              レビューを書く
            </Button>
          </div>
        )}
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
                          <StarRating value={sake.averageRating} size="sm" />
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

      <BreweryNotes breweryId={breweryId} />
    </div>
  );
}

export function BreweryDetailSkeleton() {
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
