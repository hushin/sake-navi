import { NoPrefetchLink as Link } from '@/components/NoPrefetchLink';
import { StarIcon, EditIcon } from '@/components/icons';
import { OpenMapLink } from './OpenMapLink';

type BadgeVariant = 'review' | 'note';

type TimelineCardProps = {
  userName: string;
  createdAt: string;
  breweryId?: number;
  breweryName?: string;
  sakeInfo?: React.ReactNode;
  badgeVariant?: BadgeVariant;
  showBadge?: boolean;
  bookmarkButton?: React.ReactNode;
  children: React.ReactNode;
  formatDate: (dateStr: string) => string;
};

const badgeConfig = {
  review: {
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600',
    label: 'レビュー',
    icon: <StarIcon className="h-4 w-4 text-blue-600" />,
  },
  note: {
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    iconColor: 'text-green-600',
    label: '酒蔵ノート',
    icon: <EditIcon className="h-4 w-4 text-green-600" />,
  },
};

export function TimelineCard({
  userName,
  createdAt,
  breweryId,
  breweryName,
  sakeInfo,
  badgeVariant = 'review',
  showBadge = true,
  bookmarkButton,
  children,
  formatDate,
}: TimelineCardProps) {
  const badge = badgeVariant ? badgeConfig[badgeVariant] : null;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <p className="font-semibold text-slate-800">{userName}</p>
          <p className="text-sm text-slate-500">{formatDate(createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {breweryId && <OpenMapLink breweryId={breweryId} />}
          {showBadge && badge && (
            <div className={`flex items-center gap-2 ${badge.bgColor} px-3 py-1 rounded-full`}>
              {badge.icon}
              <span className={`text-sm font-medium ${badge.textColor}`}>{badge.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* 酒蔵情報とお酒情報 */}
      {breweryId && breweryName && (
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <Link
            href={`/brewery/${breweryId}`}
            className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            {breweryName}
          </Link>
          {sakeInfo && (
            <>
              <span className="text-slate-400">/</span>
              {sakeInfo}
            </>
          )}
          {bookmarkButton && <div className="ml-auto">{bookmarkButton}</div>}
        </div>
      )}

      {/* コンテンツ */}
      {children}
    </div>
  );
}
