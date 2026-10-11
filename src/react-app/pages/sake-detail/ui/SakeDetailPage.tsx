import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { client, useBookmarkToggle, useBookmarks, useSession } from '@/react-app/shared/api';
import {
  Badge,
  BookmarkButton,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StarRating,
} from '@/react-app/shared/ui';
import { filterReviewTags, type ReviewInput, type SakeUpdateInput } from '@/shared/schemas/sake';
import { ReviewForm } from './ReviewForm';
import { SakeEditForm } from './SakeEditForm';
import { ReviewList } from './ReviewList';

/** Hono RPC のレスポンスから、status のリテラル型に依存せずエラーだけ見るための最小の形 */
function ensureOk(
  response: { ok: boolean; status: number },
  message: string,
  conflictMessage: string,
): void {
  if (response.status === 409) {
    throw new Error(conflictMessage);
  }
  if (!response.ok) {
    throw new Error(message);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

export function SakeDetailPage({ sakeId }: { sakeId: number }) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);

  // 未サインインだと 401 になるので、セッションがあるときだけブックマークを取る
  const bookmarks = useBookmarks({ enabled: Boolean(session) });
  const { toggle, pendingSakeId } = useBookmarkToggle();
  const isBookmarked = bookmarks.sakeIds.has(sakeId);

  const sakeQuery = useQuery({
    queryKey: ['sake', sakeId],
    queryFn: async () => {
      const res = await client.api.sakes[':id'].$get({ param: { id: String(sakeId) } });
      if (res.status === 404) {
        throw new Error('お酒が見つかりませんでした');
      }
      if (!res.ok) {
        throw new Error('お酒の情報を取得できませんでした');
      }
      return res.json();
    },
  });

  const saveReview = useMutation({
    mutationFn: async ({ reviewId, input }: { reviewId: string | null; input: ReviewInput }) => {
      if (reviewId) {
        const res = await client.api.reviews[':id'].$put({
          param: { id: reviewId },
          json: input,
        });
        ensureOk(res, 'レビューを保存できませんでした', 'レビューを保存できませんでした');
        return res.json();
      }

      const res = await client.api.sakes[':id'].reviews.$post({
        param: { id: String(sakeId) },
        json: input,
      });
      ensureOk(res, 'レビューを保存できませんでした', 'このお酒にはすでにレビューを投稿しています');
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sake', sakeId] });
      void queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const res = await client.api.reviews[':id'].$delete({ param: { id: reviewId } });
      ensureOk(res, 'レビューを削除できませんでした', 'レビューを削除できませんでした');
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sake', sakeId] });
      void queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });

  /** 銘柄マスタの更新（身内で使うアプリなので誰でも編集できる） */
  const updateSake = useMutation({
    mutationFn: async (input: SakeUpdateInput) => {
      const res = await client.api.sakes[':id'].$put({
        param: { id: String(sakeId) },
        json: input,
      });
      ensureOk(res, 'お酒の情報を保存できませんでした', 'お酒の情報を保存できませんでした');
      return res.json();
    },
    onSuccess: (updated) => {
      // 詳細は同じ形で返ってくるので、そのまま差し替える
      queryClient.setQueryData(['sake', sakeId], updated);
      void queryClient.invalidateQueries({ queryKey: ['sakes'] });
      setIsEditing(false);
    },
  });

  if (sakeQuery.isPending) {
    return <SakeDetailSkeleton />;
  }

  if (sakeQuery.isError) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4">
        <p className="text-sm font-medium">{errorMessage(sakeQuery.error)}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void sakeQuery.refetch()}
            disabled={sakeQuery.isFetching}
          >
            {sakeQuery.isFetching ? '再試行中…' : '再試行'}
          </Button>
          <Button variant="ghost" size="sm" render={<Link to="/sakes" />}>
            お酒一覧へ
          </Button>
        </div>
      </div>
    );
  }

  const sake = sakeQuery.data;
  const myReview = session
    ? (sake.reviews.find((review) => review.userId === session.user.id) ?? null)
    : null;
  const mutationError =
    errorMessage(saveReview.error) ||
    errorMessage(deleteReview.error) ||
    errorMessage(updateSake.error);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <Link to="/sakes" className="text-sm text-muted-foreground hover:text-foreground">
        ← お酒一覧
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm text-muted-foreground">
              No.{sake.brewery.id}{' '}
              <Link
                to="/breweries/$breweryId"
                params={{ breweryId: String(sake.brewery.id) }}
                className="hover:text-foreground hover:underline"
              >
                {sake.brewery.name}
              </Link>
            </p>
            <h1 className="text-2xl font-semibold tracking-tight break-words">{sake.name}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {session && (
              <BookmarkButton
                isBookmarked={isBookmarked}
                isPending={pendingSakeId === sakeId}
                onToggle={() => toggle(sakeId, isBookmarked)}
              />
            )}
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                編集
              </Button>
            )}
          </div>
        </div>

        {isEditing ? (
          <SakeEditForm
            sake={sake}
            isSubmitting={updateSake.isPending}
            onCancel={() => setIsEditing(false)}
            onSubmit={async (input) => {
              await updateSake.mutateAsync(input);
            }}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {sake.type && <Badge variant="secondary">{sake.type}</Badge>}
            {sake.category !== '清酒' && <Badge variant="outline">{sake.category}</Badge>}
            {sake.isLimited && <Badge variant="destructive">限定</Badge>}
            {sake.paidTastingPrice === null ? (
              <span className="text-sm text-muted-foreground">有料試飲 未入力</span>
            ) : (
              <Badge variant="secondary">有料試飲 ¥{sake.paidTastingPrice}</Badge>
            )}
            {sake.averageRating === null ? (
              <span className="text-sm text-muted-foreground">未評価</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <StarRating value={Math.round(sake.averageRating)} size="sm" />
                <span className="text-sm tabular-nums">
                  {sake.averageRating.toFixed(1)}（{sake.reviewCount} 件）
                </span>
              </span>
            )}
          </div>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-base font-semibold">
              {myReview ? 'あなたのレビュー' : 'レビューを投稿'}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {session ? (
            <ReviewForm
              // レビューの有無が変わったら入力値を初期化する
              key={myReview?.id ?? 'new-review'}
              initialValues={{
                rating: myReview?.rating ?? 0,
                tags: filterReviewTags(myReview?.tags ?? []),
                comment: myReview?.comment ?? '',
              }}
              submitLabel={myReview ? '更新する' : '投稿する'}
              isSubmitting={saveReview.isPending}
              isDeleting={deleteReview.isPending}
              onSubmit={async (values) => {
                const comment = (values.comment ?? '').trim();
                await saveReview.mutateAsync({
                  reviewId: myReview?.id ?? null,
                  input: {
                    rating: values.rating,
                    tags: values.tags,
                    comment: comment.length > 0 ? comment : undefined,
                  },
                });
              }}
              onDelete={
                myReview
                  ? () => {
                      deleteReview.mutate(myReview.id);
                    }
                  : undefined
              }
            />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                レビューを投稿するにはサインインが必要です。
              </p>
              <Button size="lg" render={<Link to="/sign-in" />}>
                サインイン
              </Button>
            </div>
          )}
          {mutationError.length > 0 && <p className="text-sm text-destructive">{mutationError}</p>}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">みんなのレビュー（{sake.reviewCount}）</h2>
        <ReviewList reviews={sake.reviews} />
      </section>
    </div>
  );
}

function SakeDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="読み込み中"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6"
    >
      <div className="h-4 w-24 animate-pulse rounded-full bg-foreground/10" />
      <div className="h-8 w-2/3 animate-pulse rounded-full bg-foreground/10" />
      <div className="h-40 animate-pulse rounded-xl bg-foreground/10" />
    </div>
  );
}
