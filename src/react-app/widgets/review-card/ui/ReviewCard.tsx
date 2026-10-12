import { Link } from '@tanstack/react-router';
import type { InferResponseType } from 'hono/client';
import { client } from '@/react-app/shared/api';
import { formatRelativeTime } from '@/react-app/shared/lib';
import { StarRating, TagBadge } from '@/react-app/shared/ui';

/** タイムラインとレビュー一覧が同じ形のフィードアイテムを返す */
export type ReviewCardItem = InferResponseType<
  (typeof client.api.timeline)['$get'],
  200
>['items'][number];

/**
 * 1 件のレビューカード。タイムラインとレビュー一覧で共有する
 * （`now` は呼び出し元が持っている取得時刻。render 中に `Date.now()` を呼ばないため）。
 */
export function ReviewCard({ item, now }: { item: ReviewCardItem; now: number }) {
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
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}
      {item.comment && (
        <p className="text-sm leading-6 break-words whitespace-pre-wrap">{item.comment}</p>
      )}
    </li>
  );
}
