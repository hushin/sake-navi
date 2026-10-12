import { formatJstDateTime } from '@/react-app/shared/lib';
import { StarRating, TagBadge } from '@/react-app/shared/ui';
import { formatRating } from '@/shared/schemas/sake';

export type ReviewListItem = {
  id: string;
  userName: string;
  rating: number;
  /** DB の JSON 列由来なので `string[]`。表示には絞り込みは要らない */
  tags: string[];
  comment: string | null;
  createdAt: string;
};

export function ReviewList({ reviews }: { reviews: ReviewListItem[] }) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        まだレビューはありません。最初の 1 件を書いてみましょう。
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border border-t border-border">
      {reviews.map((review) => (
        <li key={review.id} className="flex flex-col gap-1.5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{review.userName}</span>
            {/* 星だけだと 4.25 と 4.5 の区別が付かないので数値も出す */}
            <span className="flex items-center gap-1.5">
              <StarRating value={review.rating} size="sm" />
              <span className="text-sm tabular-nums">{formatRating(review.rating)}</span>
            </span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {formatJstDateTime(review.createdAt)}
            </span>
          </div>
          {review.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {review.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          )}
          {review.comment && (
            <p className="text-sm leading-6 break-words whitespace-pre-wrap">{review.comment}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
