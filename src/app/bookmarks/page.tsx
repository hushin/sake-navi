'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBookmarks, removeBookmark, type BookmarkedSake } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { UserMenu } from '@/components/UserMenu';

export default function BookmarksPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkedSake[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    fetchBookmarks();
  }, [router]);

  const fetchBookmarks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getBookmarks();
      setBookmarks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ブックマークの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveBookmark = async (sakeId: number) => {
    try {
      await removeBookmark(sakeId);
      setBookmarks(bookmarks.filter((b) => b.sake.sakeId !== sakeId));
    } catch (err) {
      console.error('ブックマーク削除エラー:', err);
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
          <h1 className="text-xl font-bold text-slate-800">ブックマーク</h1>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            {error}
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg mb-4">ブックマークはまだありません</p>
            <Link
              href="/map"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              マップを見る
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.bookmarkId}
                className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800 truncate">
                      {bookmark.sake.name}
                    </h3>
                    {bookmark.sake.type && (
                      <span className="text-sm text-slate-600 whitespace-nowrap">
                        {bookmark.sake.type}
                      </span>
                    )}
                    {bookmark.sake.isLimited && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded border border-red-200">
                        限定
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/brewery/${bookmark.brewery.breweryId}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {bookmark.brewery.name}
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveBookmark(bookmark.sake.sakeId)}
                  className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                  title="ブックマークを解除"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
