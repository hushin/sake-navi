import Link from 'next/link';
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
  children: React.ReactNode;
  formatDate: (dateStr: string) => string;
};

const badgeConfig = {
  review: {
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600',
    label: 'レビュー',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-blue-600"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
  },
  note: {
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    iconColor: 'text-green-600',
    label: '酒蔵ノート',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-green-600"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
    ),
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
  children,
  formatDate,
}: TimelineCardProps) {
  const badge = badgeVariant ? badgeConfig[badgeVariant] : null;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-5">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-2">
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
        </div>
      )}

      {/* コンテンツ */}
      {children}
    </div>
  );
}
