'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NoPrefetchLink as Link } from '@/components/NoPrefetchLink';
import { isAuthenticated } from '@/lib/auth';
import { OpenMapLink } from '@/components/OpenMapLink';
import { UserMenu } from '@/components/UserMenu';
import { Toast } from '@/components/Toast';
import { useBookmarks } from '@/hooks/useBookmarks';
import { BackIcon, BookmarkIcon } from '@/components/icons';

export default function BookmarksPage() {
  const router = useRouter();
  const { bookmarks, isLoading, error, toggleBookmark } = useBookmarks();
  const [toast, setToast] = useState<{ message: string; sakeId: number; sakeName: string } | null>(
    null,
  );

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
  }, [router]);

  const handleRemoveBookmark = async (sakeId: number, sakeName: string) => {
    try {
      await toggleBookmark(sakeId);
      setToast({ message: `「${sakeName}」を削除しました`, sakeId, sakeName });
    } catch (err) {
      console.error('ブックマーク削除エラー:', err);
    }
  };

  const handleUndoRemove = async () => {
    if (!toast) return;

    try {
      await toggleBookmark(toast.sakeId);
      setToast(null);
    } catch (err) {
      console.error('ブックマーク復元エラー:', err);
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
            {error instanceof Error ? error.message : 'ブックマークの取得に失敗しました'}
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
                    <h3 className="font-semibold text-slate-800 truncate">{bookmark.sake.name}</h3>
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
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/brewery/${bookmark.brewery.breweryId}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {bookmark.brewery.name}
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <OpenMapLink breweryId={bookmark.brewery.breweryId} />
                  <button
                    type="button"
                    onClick={() => handleRemoveBookmark(bookmark.sake.sakeId, bookmark.sake.name)}
                    className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                    title="ブックマークを解除"
                  >
                    <BookmarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          onUndo={handleUndoRemove}
          onClose={() => setToast(null)}
          duration={5000}
        />
      )}
    </div>
  );
}
