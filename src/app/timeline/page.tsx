'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getTimeline,
  getBookmarks,
  addBookmark,
  removeBookmark,
  type TimelineItem,
} from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { UserMenu } from '@/components/UserMenu';
import { TimelineReviewCard } from '@/components/TimelineReviewCard';
import { TimelineNoteCard } from '@/components/TimelineNoteCard';

export default function TimelinePage() {
  const router = useRouter();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [bookmarkedSakes, setBookmarkedSakes] = useState<Set<number>>(new Set());

  // Intersection Observer 用の ref
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 未認証の場合は / へリダイレクト
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    fetchTimeline();

    // ブックマーク初期読み込み
    getBookmarks()
      .then((bms) => {
        setBookmarkedSakes(new Set(bms.map((b) => b.sake.sakeId)));
      })
      .catch(() => {});
  }, [router]);

  // 初回読み込み
  const fetchTimeline = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getTimeline();
      setItems(response.items);
      setNextCursor(response.nextCursor);
      setHasReachedEnd(response.nextCursor === null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タイムラインの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 追加読み込み
  const fetchMoreTimeline = useCallback(async () => {
    if (!nextCursor || isLoadingMore || hasReachedEnd) return;

    try {
      setIsLoadingMore(true);
      setError(null);
      const response = await getTimeline(nextCursor);
      setItems((prevItems) => [...prevItems, ...response.items]);
      setNextCursor(response.nextCursor);
      setHasReachedEnd(response.nextCursor === null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タイムラインの取得に失敗しました');
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, hasReachedEnd]);

  // Intersection Observer のセットアップ
  useEffect(() => {
    if (isLoading || hasReachedEnd) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMoreTimeline();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, hasReachedEnd, fetchMoreTimeline]);

  // ブックマークトグル
  const handleToggleBookmark = async (sakeId: number) => {
    const isBookmarked = bookmarkedSakes.has(sakeId);
    try {
      if (isBookmarked) {
        await removeBookmark(sakeId);
        setBookmarkedSakes((prev) => {
          const next = new Set(prev);
          next.delete(sakeId);
          return next;
        });
      } else {
        await addBookmark(sakeId);
        setBookmarkedSakes((prev) => new Set(prev).add(sakeId));
      }
    } catch (err) {
      console.error('ブックマーク操作エラー:', err);
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
          <UserMenu />
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
                <TimelineReviewCard
                  key={`review-${item.id}`}
                  item={item}
                  formatDate={formatDate}
                  isBookmarked={bookmarkedSakes.has(item.sakeId)}
                  onToggleBookmark={handleToggleBookmark}
                />
              ) : (
                <TimelineNoteCard key={`note-${item.id}`} item={item} formatDate={formatDate} />
              ),
            )}

            {/* 無限スクロール用のsentinel */}
            {!hasReachedEnd && (
              <div ref={loadMoreRef} className="flex items-center justify-center py-8">
                {isLoadingMore && (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                )}
              </div>
            )}

            {hasReachedEnd && items.length > 0 && (
              <p className="text-center text-slate-400 text-sm py-4">すべて読み込みました</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
