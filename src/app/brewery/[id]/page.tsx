'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getBreweryDetail,
  getBreweryNotes,
  getBookmarks,
  addBookmark,
  removeBookmark,
  type BreweryDetail,
  type BreweryNote,
} from '@/lib/api';
import { getAuth, isAuthenticated } from '@/lib/auth';
import { OpenMapLink } from '@/components/OpenMapLink';
import { StarRating } from '@/components/StarRating';
import { UserMenu } from '@/components/UserMenu';
import { getTagColorClass } from '@/lib/tagColors';
import { useAddSakeModal } from '@/hooks/useAddSakeModal';
import { useAddBreweryNoteModal } from '@/hooks/useAddBreweryNoteModal';
import { useEditReviewModal } from '@/hooks/useEditReviewModal';
import { useDeleteReviewModal } from '@/hooks/useDeleteReviewModal';
import { useEditBreweryNoteModal } from '@/hooks/useEditBreweryNoteModal';
import { useDeleteBreweryNoteModal } from '@/hooks/useDeleteBreweryNoteModal';
import { useEditSakeModal } from '@/hooks/useEditSakeModal';

export default function BreweryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const breweryId = Number(params.id);

  const [breweryDetail, setBreweryDetail] = useState<BreweryDetail | null>(null);
  const [breweryNotes, setBreweryNotes] = useState<BreweryNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ブックマーク用のstate (sakeId -> bookmarked)
  const [bookmarkedSakes, setBookmarkedSakes] = useState<Set<number>>(new Set());

  // 未認証の場合はトップページへリダイレクト
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
    }
  }, [router]);

  // 酒蔵詳細とノートを取得
  useEffect(() => {
    if (!breweryId || isNaN(breweryId)) {
      setError('無効な酒蔵IDです');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [detail, notes] = await Promise.all([
          getBreweryDetail(breweryId),
          getBreweryNotes(breweryId),
        ]);
        setBreweryDetail(detail);
        setBreweryNotes(notes);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('データの取得に失敗しました');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // ブックマーク初期読み込み
    getBookmarks()
      .then((bms) => {
        setBookmarkedSakes(new Set(bms.map((b) => b.sake.sakeId)));
      })
      .catch(() => {});
  }, [breweryId]);

  // モーダルフック
  const [renderAddSakeModal, openAddSakeModal] = useAddSakeModal({
    breweryId,
    onSuccess: async () => {
      const updatedDetail = await getBreweryDetail(breweryId);
      setBreweryDetail(updatedDetail);
    },
  });

  const [renderAddBreweryNoteModal, openAddBreweryNoteModal] = useAddBreweryNoteModal({
    breweryId,
    onSuccess: (newNote) => {
      setBreweryNotes([newNote, ...breweryNotes]);
    },
  });

  const [renderEditReviewModal, openEditReviewModal] = useEditReviewModal({
    onSuccess: async () => {
      const updatedDetail = await getBreweryDetail(breweryId);
      setBreweryDetail(updatedDetail);
    },
  });

  const [renderDeleteReviewModal, openDeleteReviewModal] = useDeleteReviewModal({
    onSuccess: async () => {
      const updatedDetail = await getBreweryDetail(breweryId);
      setBreweryDetail(updatedDetail);
    },
  });

  const [renderEditBreweryNoteModal, openEditBreweryNoteModal] = useEditBreweryNoteModal({
    breweryId,
    onSuccess: (updatedNote) => {
      setBreweryNotes(breweryNotes.map((n) => (n.noteId === updatedNote.noteId ? updatedNote : n)));
    },
  });

  const [renderDeleteBreweryNoteModal, openDeleteBreweryNoteModal] = useDeleteBreweryNoteModal({
    breweryId,
    onSuccess: (deletedNoteId) => {
      setBreweryNotes(breweryNotes.filter((n) => n.noteId !== deletedNoteId));
    },
  });

  const [renderEditSakeModal, openEditSakeModal] = useEditSakeModal({
    onSuccess: async () => {
      const updatedDetail = await getBreweryDetail(breweryId);
      setBreweryDetail(updatedDetail);
    },
  });

  const currentUserId = getAuth()?.userId;

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

  // 日時フォーマット関数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">読み込み中...</div>
      </div>
    );
  }

  // エラー
  if (error || !breweryDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'データが見つかりません'}</p>
          <Link href="/map" className="text-blue-600 hover:underline">
            マップに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/map" className="text-blue-600 hover:text-blue-700 transition-colors">
            ← マップ
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800">{breweryDetail.brewery.name}</h1>
          </div>
          <OpenMapLink breweryId={breweryId} />
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* 出品酒一覧セクション */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">出品酒</h2>
            <button
              onClick={openAddSakeModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              + 酒を追加
            </button>
          </div>

          {breweryDetail.sakes.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-slate-500">
              まだお酒が登録されていません
            </div>
          ) : (
            <div className="space-y-3">
              {breweryDetail.sakes.map((sake) => (
                <div
                  key={sake.sakeId}
                  className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{sake.name}</h3>
                      {sake.type && (
                        <span className="text-sm text-slate-600 whitespace-nowrap">
                          {sake.type}
                        </span>
                      )}
                      {sake.isLimited && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded border border-red-200">
                          限定
                        </span>
                      )}
                      {sake.category && sake.category !== '清酒' && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded border border-purple-200">
                          {sake.category}
                        </span>
                      )}
                      {sake.paidTastingPrice != null && (
                        <span className="text-xs text-amber-700 whitespace-nowrap">
                          有料 ¥{sake.paidTastingPrice}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditSakeModal(sake)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition-colors cursor-pointer"
                        title="お酒を編集"
                      >
                        編集
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {sake.isCustom && sake.addedBy && (
                        <div className="relative group">
                          <button
                            type="button"
                            className="flex items-center justify-center w-5 h-5 bg-slate-100 text-slate-500 text-xs font-semibold rounded border border-slate-300 hover:bg-slate-200 focus:bg-slate-200 focus:outline-none transition-colors cursor-pointer"
                            title="ユーザーによる追加"
                          >
                            U
                          </button>
                          <div className="invisible group-hover:visible group-focus-within:visible absolute top-full left-1/2 -translate-x-1/2 mt-1 z-10 pointer-events-none">
                            <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                              ユーザーによる追加
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-transparent border-b-slate-800"></div>
                            </div>
                          </div>
                        </div>
                      )}
                      {sake.averageRating !== null ? (
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span className="font-semibold text-slate-800">
                            {sake.averageRating.toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 whitespace-nowrap">未評価</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(sake.sakeId)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          bookmarkedSakes.has(sake.sakeId)
                            ? 'text-amber-500 hover:text-amber-600'
                            : 'text-slate-300 hover:text-amber-400'
                        }`}
                        title={
                          bookmarkedSakes.has(sake.sakeId) ? 'ブックマーク解除' : 'ブックマーク'
                        }
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                      </button>
                    </div>
                    <div>
                      {(() => {
                        const myReview = sake.reviews.find((r) => r.user.id === currentUserId);
                        if (myReview) {
                          return (
                            <button
                              type="button"
                              onClick={() => openEditReviewModal(sake.sakeId, myReview)}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                            >
                              レビュー編集
                            </button>
                          );
                        }
                        return (
                          <Link
                            href={`/brewery/${breweryId}/sake/${sake.sakeId}/review`}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                          >
                            レビュー投稿
                          </Link>
                        );
                      })()}
                    </div>
                  </div>

                  {/* レビュー一覧 */}
                  {sake.reviews.length > 0 && (
                    <div className="border-t border-slate-200 pt-3 space-y-2">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">
                        レビュー ({sake.reviews.length})
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {sake.reviews.map((review) => (
                          <div
                            key={review.id}
                            className="bg-slate-50 rounded-lg p-2.5 text-sm border border-slate-100"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                                <span className="font-semibold text-slate-800 whitespace-nowrap">
                                  {review.user.name}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  <StarRating value={review.rating} size="sm" readonly />
                                </div>
                                {review.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {review.tags.map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className={`px-2 py-0.5 text-xs rounded-full border ${getTagColorClass(tag)}`}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {currentUserId === review.user.id && (
                                  <button
                                    type="button"
                                    onClick={() => openDeleteReviewModal(sake.sakeId, review.id)}
                                    className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                                  >
                                    削除
                                  </button>
                                )}
                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                  {formatDate(review.createdAt)}
                                </span>
                              </div>
                            </div>
                            {review.comment && (
                              <p className="text-slate-700 whitespace-pre-wrap">{review.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 酒蔵ノートセクション */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">酒蔵ノート</h2>
            <button
              onClick={openAddBreweryNoteModal}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              + ノートを投稿
            </button>
          </div>

          {breweryNotes.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-slate-500">
              まだノートが投稿されていません
            </div>
          ) : (
            <div className="space-y-3">
              {breweryNotes.map((note) => (
                <div key={note.noteId} className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-slate-800">{note.userName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{formatDate(note.createdAt)}</span>
                      {currentUserId === note.userId && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openEditBreweryNoteModal(note)}
                            className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteBreweryNoteModal(note)}
                            className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                          >
                            削除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap">{note.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* モーダル */}
      {renderAddSakeModal()}
      {renderAddBreweryNoteModal()}
      {renderEditReviewModal()}
      {renderDeleteReviewModal()}
      {renderEditBreweryNoteModal()}
      {renderDeleteBreweryNoteModal()}
      {renderEditSakeModal()}
    </div>
  );
}
