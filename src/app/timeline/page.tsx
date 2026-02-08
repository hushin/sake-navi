'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTimeline, type TimelineItem } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { StarRating } from '@/components/StarRating';

export default function TimelinePage() {
  const router = useRouter();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 未認証の場合は / へリダイレクト
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    fetchTimeline();
  }, [router]);

  const fetchTimeline = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getTimeline();
      setItems(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タイムラインの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}時間前`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/map"
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            マップへ戻る
          </Link>
          <h1 className="text-xl font-bold text-slate-800">タイムライン</h1>
          <div className="w-20"></div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg mb-4">まだ投稿がありません</p>
            <Link
              href="/map"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              マップを見る
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) =>
              item.type === 'review' ? (
                <ReviewCard key={`review-${item.id}`} item={item} formatDate={formatDate} />
              ) : (
                <NoteCard key={`note-${item.id}`} item={item} formatDate={formatDate} />
              ),
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// レビューカードコンポーネント
function ReviewCard({
  item,
  formatDate,
}: {
  item: Extract<TimelineItem, { type: 'review' }>;
  formatDate: (dateStr: string) => string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {item.userName.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{item.userName}</p>
            <p className="text-sm text-slate-500">{formatDate(item.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-blue-600"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-sm font-medium text-blue-700">レビュー</span>
        </div>
      </div>

      {/* お酒情報 */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 mb-1">{item.sakeName}</h3>
        <Link
          href={`/brewery/${item.breweryId}`}
          className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          {item.breweryName} ({item.breweryId})
        </Link>
      </div>

      {/* 星評価 */}
      <div className="mb-3">
        <StarRating value={item.rating} readonly size="sm" />
      </div>

      {/* タグ */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* コメント */}
      {item.comment && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
            {item.comment}
          </p>
        </div>
      )}
    </div>
  );
}

// 酒蔵ノートカードコンポーネント
function NoteCard({
  item,
  formatDate,
}: {
  item: Extract<TimelineItem, { type: 'brewery_note' }>;
  formatDate: (dateStr: string) => string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
            {item.userName.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{item.userName}</p>
            <p className="text-sm text-slate-500">{formatDate(item.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-green-600"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          <span className="text-sm font-medium text-green-700">酒蔵ノート</span>
        </div>
      </div>

      {/* 酒蔵情報 */}
      <div className="mb-4">
        <Link
          href={`/brewery/${item.breweryId}`}
          className="text-lg font-bold text-slate-800 hover:text-blue-600 transition-colors"
        >
          {item.breweryName} ({item.breweryId})
        </Link>
      </div>

      {/* コメント */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
      </div>
    </div>
  );
}
