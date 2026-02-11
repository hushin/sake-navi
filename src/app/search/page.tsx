'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { NoPrefetchLink as Link } from '@/components/NoPrefetchLink';
import { searchSakes, type SakeSearchItem } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { UserMenu } from '@/components/UserMenu';
import { BackIcon } from '@/components/icons';

const CATEGORIES = ['清酒', 'リキュール', 'みりん', 'その他'] as const;

export default function SearchPage() {
  const router = useRouter();
  const [items, setItems] = useState<SakeSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);

  // フィルタ
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [isLimited, setIsLimited] = useState(false);
  const [hasPaidTasting, setHasPaidTasting] = useState(false);

  // 検索時のフィルタ値を保持（無限スクロールで使う）
  const appliedFiltersRef = useRef({
    q: '',
    category: '',
    isLimited: false,
    hasPaidTasting: false,
  });

  // Intersection Observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    fetchSakes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchSakes = async (resetList = true) => {
    try {
      if (resetList) {
        setIsLoading(true);
        setItems([]);
        setNextCursor(null);
        setHasReachedEnd(false);
      }
      setError(null);

      // 検索時のフィルタ値を保存
      appliedFiltersRef.current = {
        q: query,
        category,
        isLimited,
        hasPaidTasting,
      };

      const response = await searchSakes({
        q: query || undefined,
        category: category || undefined,
        isLimited: isLimited || undefined,
        hasPaidTasting: hasPaidTasting || undefined,
      });
      setItems(response.items);
      setNextCursor(response.nextCursor);
      setHasReachedEnd(response.nextCursor === null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'お酒の検索に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore || hasReachedEnd) return;

    try {
      setIsLoadingMore(true);
      const filters = appliedFiltersRef.current;
      const response = await searchSakes({
        q: filters.q || undefined,
        category: filters.category || undefined,
        isLimited: filters.isLimited || undefined,
        hasPaidTasting: filters.hasPaidTasting || undefined,
        cursor: nextCursor,
      });
      setItems((prev) => [...prev, ...response.items]);
      setNextCursor(response.nextCursor);
      setHasReachedEnd(response.nextCursor === null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'お酒の取得に失敗しました');
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, hasReachedEnd]);

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
    fetchSakes(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/map"
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 transition-colors"
          >
            <BackIcon />
            マップへ戻る
          </Link>
          <h1 className="text-xl font-bold text-slate-800">お酒検索</h1>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* フィルタ */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="mb-3">
            <label className="text-sm font-medium text-slate-700 block mb-1">
              酒名・酒蔵名で検索
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="キーワードを入力..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">カテゴリ</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">すべて</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer self-end pb-2">
              <input
                type="checkbox"
                checked={isLimited}
                onChange={(e) => setIsLimited(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              限定品のみ
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer self-end pb-2">
              <input
                type="checkbox"
                checked={hasPaidTasting}
                onChange={(e) => setHasPaidTasting(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              有料試飲あり
            </label>
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
            <p className="text-slate-500 text-lg">該当するお酒がありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <Link
                key={item.sakeId}
                href={`/brewery/${item.brewery.breweryId}`}
                className="block bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-800 truncate">{item.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{item.brewery.name}</p>
                    {item.type && <p className="text-xs text-slate-400 mt-0.5">{item.type}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1 shrink-0">
                    {item.isLimited && (
                      <span className="inline-block bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        限定
                      </span>
                    )}
                    {item.paidTastingPrice != null && (
                      <span className="inline-block bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        有料試飲 {item.paidTastingPrice}円
                      </span>
                    )}
                  </div>
                </div>
              </Link>
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
