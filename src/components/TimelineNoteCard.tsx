import { TimelineCard } from './TimelineCard';
import type { TimelineNoteItem } from '@/lib/api';

type TimelineNoteCardProps = {
  item: TimelineNoteItem;
  formatDate: (dateStr: string) => string;
  showBadge?: boolean;
};

export function TimelineNoteCard({ item, formatDate, showBadge = true }: TimelineNoteCardProps) {
  return (
    <TimelineCard
      userName={item.userName}
      createdAt={item.createdAt}
      breweryId={item.breweryId}
      breweryName={item.breweryName}
      badgeVariant="note"
      showBadge={showBadge}
      formatDate={formatDate}
    >
      {/* コメント */}
      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-200">
        {item.content}
      </p>
    </TimelineCard>
  );
}
