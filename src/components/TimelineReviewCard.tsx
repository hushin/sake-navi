import { TimelineCard } from './TimelineCard';
import { StarRating } from './StarRating';
import { getTagColorClass } from '@/lib/tagColors';
import type { TimelineReviewItem, ReviewSearchItem } from '@/lib/api';

type TimelineReviewCardProps = {
  item: TimelineReviewItem | ReviewSearchItem;
  formatDate: (dateStr: string) => string;
  showBadge?: boolean;
};

// TimelineReviewItem か ReviewSearchItem かを判定する型ガード
function isTimelineReviewItem(
  item: TimelineReviewItem | ReviewSearchItem,
): item is TimelineReviewItem {
  return 'sakeName' in item;
}

export function TimelineReviewCard({
  item,
  formatDate,
  showBadge = true,
}: TimelineReviewCardProps) {
  // TimelineReviewItem と ReviewSearchItem で異なるフィールド名を統一
  const userName = isTimelineReviewItem(item) ? item.userName : item.user.name;
  const breweryId = isTimelineReviewItem(item) ? item.breweryId : item.brewery.id;
  const breweryName = isTimelineReviewItem(item) ? item.breweryName : item.brewery.name;
  const sakeName = isTimelineReviewItem(item) ? item.sakeName : item.sake.name;
  const sakeType = isTimelineReviewItem(item) ? undefined : item.sake.type;
  const rating = isTimelineReviewItem(item) ? item.rating : item.rating;
  const tags = isTimelineReviewItem(item) ? item.tags : item.tags;
  const comment = isTimelineReviewItem(item) ? item.comment : item.comment;
  const isLimited = isTimelineReviewItem(item) ? item.isLimited : item.sake.isLimited;
  const paidTastingPrice = isTimelineReviewItem(item)
    ? item.paidTastingPrice
    : item.sake.paidTastingPrice;

  return (
    <TimelineCard
      userName={userName}
      createdAt={item.createdAt}
      breweryId={breweryId}
      breweryName={breweryName}
      sakeInfo={
        <>
          <span className="font-bold text-slate-800">{sakeName}</span>
          {sakeType && <span className="text-sm text-slate-500">{sakeType}</span>}
          {isLimited && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300">
              限定
            </span>
          )}
          {paidTastingPrice != null && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
              有料 ¥{paidTastingPrice}
            </span>
          )}
        </>
      }
      badgeVariant="review"
      showBadge={showBadge}
      formatDate={formatDate}
    >
      {/* 星評価とタグ */}
      <div className="flex items-center gap-4 mb-3">
        <StarRating value={rating} readonly size="sm" />
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTagColorClass(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* コメント */}
      {comment && (
        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-200">
          {comment}
        </p>
      )}
    </TimelineCard>
  );
}
