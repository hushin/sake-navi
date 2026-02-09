'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getReviews, type ReviewSearchItem } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { StarRating } from '@/components/StarRating';
import { UserMenu } from '@/components/UserMenu';
import { getTagColorClass } from '@/lib/tagColors';

const ALL_TAGS = [
  '甘口',
  '辛口',
  '濃醇',
  '淡麗',
  'にごり',
  '酸味',
  '旨味',
  '熟成',
  '苦味',
  '渋味',
  '発泡',
];

export default function ReviewsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReviewSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);

  // フィルタ
  const [sort, setSort] = useState<'latest' | 'rating'>('latest');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Intersection Observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchReviews = async (resetList = true) => {
    try {
      if (resetList) {
        setIsLoading(true);
        setItems([]);
        setNextCursor(null);
        setHasReachedEnd(false);
      }
      setError(null);
      const response = await getReviews({
        sort,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });
      setItems(response.items);
      setNextCursor(response.nextCursor);
      setHasReachedEnd(response.nextCursor === null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レビューの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore || hasReachedEnd) return;

    try {
      setIsLoadingMore(true);
      const response = await getReviews({
        sort,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        cursor: nextCursor,
      });
      setItems((prev) => [...prev, ...response.items]);
      setNextCursor(response.nextCursor);
      setHasReachedEnd(response.nextCursor === null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レビューの取得に失敗しました');
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, hasReachedEnd, sort, selectedTags]);

  // Intersection Observer
  useEffect(() => {
    if (isLoading || hasReachedEnd) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMore();
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
  }, [isLoading, hasReachedEnd, fetchMore]);

  const handleSearch = () => {
    fetchReviews(true);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
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
          <h1 className="text-xl font-bold text-slate-800">レビュー一覧</h1>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* フィルタ */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center gap-4 mb-3">
            <label className="text-sm font-medium text-slate-700">並び順:</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'latest' | 'rating')}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="latest">新着順</option>
              <option value="rating">評価順</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="text-sm font-medium text-slate-700 block mb-2">タグ絞り込み:</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-500 text-white border-blue-600'
                      : getTagColorClass(tag)
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors cursor-pointer text-sm"
          >
            検索
          </button>
        </div>

        {/* 結果 */}
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
            <p className="text-slate-500 text-lg">該当するレビューがありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.reviewId}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-5"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-slate-800">{item.user.name}</p>
                    <p className="text-sm text-slate-500">{formatDate(item.createdAt)}</p>
                  </div>
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <Link
                    href={`/brewery/${item.brewery.id}`}
                    className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    {item.brewery.name}
                  </Link>
                  <span className="text-slate-400">/</span>
                  <span className="font-bold text-slate-800">{item.sake.name}</span>
                  {item.sake.type && (
                    <span className="text-sm text-slate-500">{item.sake.type}</span>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <StarRating value={item.rating} readonly size="sm" />
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
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

                {item.comment && (
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-200">
                    {item.comment}
                  </p>
                )}

                <div className="pt-3 border-t border-slate-200 mt-3">
                  <Link
                    href={`/review/${item.reviewId}`}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    詳細を見る
                  </Link>
                </div>
              </div>
            ))}

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
