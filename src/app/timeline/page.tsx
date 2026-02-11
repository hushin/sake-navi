'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { NoPrefetchLink as Link } from '@/components/NoPrefetchLink';
import { isAuthenticated } from '@/lib/auth';
import { UserMenu } from '@/components/UserMenu';
import { BackIcon } from '@/components/icons';
import { TimelineReviewCard } from '@/components/TimelineReviewCard';
import { TimelineNoteCard } from '@/components/TimelineNoteCard';
import { useTimeline } from '@/hooks/useTimeline';
import { useBookmarks } from '@/hooks/useBookmarks';

export default function TimelinePage() {
  const router = useRouter();
  const { items, isLoading, isValidating, isLoadingMore, hasReachedEnd, error, loadMore, refresh } =
    useTimeline();
  const { bookmarkedSakeIds, toggleBookmark } = useBookmarks();

  // Intersection Observer 用の ref
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 未認証の場合は / へリダイレクト
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
  }, [router]);

  const handleLoadMore = useCallback(() => {
    loadMore();
  }, [loadMore]);

  // Intersection Observer のセットアップ
  useEffect(() => {
    if (isLoading || hasReachedEnd) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
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
  }, [isLoading, hasReachedEnd, handleLoadMore]);

  // ブックマークトグル
  const handleToggleBookmark = async (sakeId: number) => {
    try {
      await toggleBookmark(sakeId);
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
            <BackIcon />
            マップへ戻る
          </Link>
          <h1 className="text-xl font-bold text-slate-800">タイムライン</h1>
          <UserMenu />
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 最新情報取得ボタン */}
        {!isLoading && items.length > 0 && (
          <div className="mb-4 flex justify-center">
            <button
              onClick={refresh}
              disabled={isValidating}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            >
              {isValidating ? '更新中...' : '最新情報を取得'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            {error instanceof Error ? error.message : 'タイムラインの取得に失敗しました'}
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
                  isBookmarked={bookmarkedSakeIds.has(item.sakeId)}
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
