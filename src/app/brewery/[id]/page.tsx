'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getBreweryDetail,
  getBreweryNotes,
  addCustomSake,
  createBreweryNote,
  updateReview,
  deleteReview,
  updateBreweryNote,
  deleteBreweryNote,
  getBookmarks,
  addBookmark,
  removeBookmark,
  type BreweryDetail,
  type BreweryNote,
  type Sake,
  type Review,
} from '@/lib/api';
import { getAuth, isAuthenticated } from '@/lib/auth';
import { StarRating } from '@/components/StarRating';
import { TagSelector } from '@/components/TagSelector';
import { UserMenu } from '@/components/UserMenu';
import { getTagColorClass } from '@/lib/tagColors';

export default function BreweryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const breweryId = Number(params.id);

  const [breweryDetail, setBreweryDetail] = useState<BreweryDetail | null>(null);
  const [breweryNotes, setBreweryNotes] = useState<BreweryNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // お酒追加モーダル用のstate
  const [showAddSakeModal, setShowAddSakeModal] = useState(false);
  const [newSakeName, setNewSakeName] = useState('');
  const [newSakeType, setNewSakeType] = useState('');
  const [newSakeIsLimited, setNewSakeIsLimited] = useState(false);
  const [newSakePaidTastingPrice, setNewSakePaidTastingPrice] = useState('');
  const [newSakeCategory, setNewSakeCategory] = useState('清酒');
  const [isAddingSake, setIsAddingSake] = useState(false);
  const [addSakeError, setAddSakeError] = useState<string | null>(null);

  // ノート投稿モーダル用のstate
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [addNoteError, setAddNoteError] = useState<string | null>(null);

  // レビュー編集モーダル用のstate
  const [editingReview, setEditingReview] = useState<{
    sakeId: number;
    review: Review;
  } | null>(null);
  const [editReviewRating, setEditReviewRating] = useState(0);
  const [editReviewTags, setEditReviewTags] = useState<string[]>([]);
  const [editReviewComment, setEditReviewComment] = useState('');
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editReviewError, setEditReviewError] = useState<string | null>(null);

  // レビュー削除確認用
  const [deletingReview, setDeletingReview] = useState<{
    sakeId: number;
    reviewId: number;
  } | null>(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);

  // ノート編集モーダル用のstate
  const [editingNote, setEditingNote] = useState<BreweryNote | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNoteError, setEditNoteError] = useState<string | null>(null);

  // ノート削除確認用
  const [deletingNote, setDeletingNote] = useState<BreweryNote | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);

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

  // お酒を追加
  const handleAddSake = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSakeName.trim()) {
      setAddSakeError('お酒の名前を入力してください');
      return;
    }

    // 有料試飲価格のバリデーション
    const paidTastingPrice = newSakePaidTastingPrice.trim()
      ? parseInt(newSakePaidTastingPrice.trim(), 10)
      : undefined;

    if (
      newSakePaidTastingPrice.trim() &&
      (isNaN(paidTastingPrice!) || paidTastingPrice! <= 0)
    ) {
      setAddSakeError('有料試飲価格は正の整数で入力してください');
      return;
    }

    setIsAddingSake(true);
    setAddSakeError(null);

    try {
      const newSake = await addCustomSake(breweryId, {
        name: newSakeName.trim(),
        type: newSakeType.trim() || undefined,
        isLimited: newSakeIsLimited,
        paidTastingPrice,
        category: newSakeCategory,
      });

      // 酒蔵詳細を再取得（新しいお酒を含む）
      const updatedDetail = await getBreweryDetail(breweryId);
      setBreweryDetail(updatedDetail);

      // モーダルを閉じ、フォームをリセット
      setShowAddSakeModal(false);
      setNewSakeName('');
      setNewSakeType('');
      setNewSakeIsLimited(false);
      setNewSakePaidTastingPrice('');
      setNewSakeCategory('清酒');
    } catch (err) {
      if (err instanceof Error) {
        setAddSakeError(err.message);
      } else {
        setAddSakeError('お酒の追加に失敗しました');
      }
    } finally {
      setIsAddingSake(false);
    }
  };

  // ノートを投稿
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newNoteContent.trim()) {
      setAddNoteError('ノート内容を入力してください');
      return;
    }

    setIsAddingNote(true);
    setAddNoteError(null);

    try {
      const newNote = await createBreweryNote(breweryId, newNoteContent.trim());

      // ノート一覧を更新（新しいノートを先頭に追加）
      setBreweryNotes([newNote, ...breweryNotes]);

      // モーダルを閉じる
      setShowAddNoteModal(false);
      setNewNoteContent('');
    } catch (err) {
      if (err instanceof Error) {
        setAddNoteError(err.message);
      } else {
        setAddNoteError('ノートの投稿に失敗しました');
      }
    } finally {
      setIsAddingNote(false);
    }
  };

  const currentUserId = getAuth()?.userId;

  // レビュー編集開始
  const handleStartEditReview = (sakeId: number, review: Review) => {
    setEditingReview({ sakeId, review });
    setEditReviewRating(review.rating);
    setEditReviewTags(review.tags);
    setEditReviewComment(review.comment || '');
    setEditReviewError(null);
  };

  // レビュー編集保存
  const handleSaveEditReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;

    setIsEditingReview(true);
    setEditReviewError(null);

    try {
      await updateReview(editingReview.sakeId, editingReview.review.id, {
        rating: editReviewRating,
        tags: editReviewTags,
        comment: editReviewComment || undefined,
      });

      const updatedDetail = await getBreweryDetail(breweryId);
      setBreweryDetail(updatedDetail);
      setEditingReview(null);
    } catch (err) {
      setEditReviewError(err instanceof Error ? err.message : 'レビューの編集に失敗しました');
    } finally {
      setIsEditingReview(false);
    }
  };

  // レビュー削除
  const handleDeleteReview = async () => {
    if (!deletingReview) return;

    setIsDeletingReview(true);
    try {
      await deleteReview(deletingReview.sakeId, deletingReview.reviewId);

      const updatedDetail = await getBreweryDetail(breweryId);
      setBreweryDetail(updatedDetail);
      setDeletingReview(null);
    } catch (err) {
      console.error('レビュー削除エラー:', err);
    } finally {
      setIsDeletingReview(false);
    }
  };

  // ノート編集開始
  const handleStartEditNote = (note: BreweryNote) => {
    setEditingNote(note);
    setEditNoteContent(note.comment);
    setEditNoteError(null);
  };

  // ノート編集保存
  const handleSaveEditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    if (!editNoteContent.trim()) {
      setEditNoteError('コメントを入力してください');
      return;
    }

    setIsEditingNote(true);
    setEditNoteError(null);

    try {
      const updatedNote = await updateBreweryNote(
        breweryId,
        editingNote.noteId,
        editNoteContent.trim(),
      );

      setBreweryNotes(breweryNotes.map((n) => (n.noteId === editingNote.noteId ? updatedNote : n)));
      setEditingNote(null);
    } catch (err) {
      setEditNoteError(err instanceof Error ? err.message : 'ノートの編集に失敗しました');
    } finally {
      setIsEditingNote(false);
    }
  };

  // ノート削除
  const handleDeleteNote = async () => {
    if (!deletingNote) return;

    setIsDeletingNote(true);
    try {
      await deleteBreweryNote(breweryId, deletingNote.noteId);
      setBreweryNotes(breweryNotes.filter((n) => n.noteId !== deletingNote.noteId));
      setDeletingNote(null);
    } catch (err) {
      console.error('ノート削除エラー:', err);
    } finally {
      setIsDeletingNote(false);
    }
  };

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
          <Link
            href={`/map?brewery=${breweryId}`}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="マップで開く"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">マップで開く</span>
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* 出品酒一覧セクション */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">出品酒</h2>
            <button
              onClick={() => setShowAddSakeModal(true)}
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
                  <div className="flex items-center justify-between gap-3 mb-3">
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
                          bookmarkedSakes.has(sake.sakeId)
                            ? 'ブックマーク解除'
                            : 'ブックマーク'
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
                      <Link
                        href={`/brewery/${breweryId}/sake/${sake.sakeId}/review`}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                      >
                        レビュー投稿
                      </Link>
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
                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                  {formatDate(review.createdAt)}
                                </span>
                                {currentUserId === review.user.id && (
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStartEditReview(sake.sakeId, review)
                                      }
                                      className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                                    >
                                      編集
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeletingReview({
                                          sakeId: sake.sakeId,
                                          reviewId: review.id,
                                        })
                                      }
                                      className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                                    >
                                      削除
                                    </button>
                                  </div>
                                )}
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
              onClick={() => setShowAddNoteModal(true)}
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
                            onClick={() => handleStartEditNote(note)}
                            className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingNote(note)}
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

      {/* お酒追加モーダル */}
      {showAddSakeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4">お酒を追加</h3>
            <form onSubmit={handleAddSake} className="space-y-4">
              <div>
                <label
                  htmlFor="sake-name"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  お酒の名前 <span className="text-red-500">*</span>
                </label>
                <input
                  id="sake-name"
                  type="text"
                  value={newSakeName}
                  onChange={(e) => setNewSakeName(e.target.value)}
                  placeholder="例: 特別純米 しぼりたて"
                  disabled={isAddingSake}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                  maxLength={100}
                  autoFocus
                  data-1p-ignore
                />
              </div>

              <div>
                <label
                  htmlFor="sake-type"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  種類
                </label>
                <input
                  id="sake-type"
                  type="text"
                  value={newSakeType}
                  onChange={(e) => setNewSakeType(e.target.value)}
                  placeholder="例: 純米大吟醸"
                  disabled={isAddingSake}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                  maxLength={50}
                  data-1p-ignore
                />
              </div>

              <div>
                <label
                  htmlFor="sake-category"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  区分
                </label>
                <select
                  id="sake-category"
                  value={newSakeCategory}
                  onChange={(e) => setNewSakeCategory(e.target.value)}
                  disabled={isAddingSake}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="清酒">清酒</option>
                  <option value="リキュール">リキュール</option>
                  <option value="みりん">みりん</option>
                  <option value="その他">その他</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="sake-is-limited"
                  type="checkbox"
                  checked={newSakeIsLimited}
                  onChange={(e) => setNewSakeIsLimited(e.target.checked)}
                  disabled={isAddingSake}
                  className="w-5 h-5 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 text-blue-600 disabled:cursor-not-allowed"
                />
                <label
                  htmlFor="sake-is-limited"
                  className="text-sm font-medium text-slate-700 cursor-pointer select-none"
                >
                  限定酒
                </label>
              </div>

              <div>
                <label
                  htmlFor="sake-paid-tasting-price"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  有料試飲価格（円）
                </label>
                <input
                  id="sake-paid-tasting-price"
                  type="number"
                  value={newSakePaidTastingPrice}
                  onChange={(e) => setNewSakePaidTastingPrice(e.target.value)}
                  placeholder="例: 500"
                  disabled={isAddingSake}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                  min="1"
                  step="1"
                  data-1p-ignore
                />
              </div>

              {addSakeError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {addSakeError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSakeModal(false);
                    setNewSakeName('');
                    setNewSakeType('');
                    setNewSakeIsLimited(false);
                    setNewSakePaidTastingPrice('');
                    setNewSakeCategory('清酒');
                    setAddSakeError(null);
                  }}
                  disabled={isAddingSake}
                  className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isAddingSake || !newSakeName.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {isAddingSake ? '追加中...' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ノート投稿モーダル */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">酒蔵ノートを投稿</h3>
            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label
                  htmlFor="note-content"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  ノート内容
                </label>
                <textarea
                  id="note-content"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="例: ブースの雰囲気が良い。スタッフが親切。"
                  disabled={isAddingNote}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed resize-none"
                  rows={4}
                  maxLength={500}
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1 text-right">
                  {newNoteContent.length} / 500
                </p>
              </div>

              {addNoteError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {addNoteError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddNoteModal(false);
                    setNewNoteContent('');
                    setAddNoteError(null);
                  }}
                  disabled={isAddingNote}
                  className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isAddingNote || !newNoteContent.trim()}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {isAddingNote ? '投稿中...' : '投稿'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* レビュー編集モーダル */}
      {editingReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4">レビューを編集</h3>
            <form onSubmit={handleSaveEditReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">評価</label>
                <StarRating
                  value={editReviewRating}
                  onChange={setEditReviewRating}
                  size="lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">タグ</label>
                <TagSelector selectedTags={editReviewTags} onTagsChange={setEditReviewTags} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">コメント</label>
                <textarea
                  value={editReviewComment}
                  onChange={(e) => setEditReviewComment(e.target.value)}
                  disabled={isEditingReview}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 resize-none"
                  rows={3}
                  maxLength={500}
                />
              </div>

              {editReviewError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {editReviewError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  disabled={isEditingReview}
                  className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isEditingReview || editReviewRating === 0}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {isEditingReview ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* レビュー削除確認 */}
      {deletingReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">レビューを削除しますか？</h3>
            <p className="text-sm text-slate-600 mb-6">この操作は元に戻せません。</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingReview(null)}
                disabled={isDeletingReview}
                className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDeleteReview}
                disabled={isDeletingReview}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors"
              >
                {isDeletingReview ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ノート編集モーダル */}
      {editingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">ノートを編集</h3>
            <form onSubmit={handleSaveEditNote} className="space-y-4">
              <div>
                <textarea
                  value={editNoteContent}
                  onChange={(e) => setEditNoteContent(e.target.value)}
                  disabled={isEditingNote}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-slate-100 resize-none"
                  rows={4}
                  maxLength={500}
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1 text-right">
                  {editNoteContent.length} / 500
                </p>
              </div>

              {editNoteError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {editNoteError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  disabled={isEditingNote}
                  className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isEditingNote || !editNoteContent.trim()}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {isEditingNote ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ノート削除確認 */}
      {deletingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">ノートを削除しますか？</h3>
            <p className="text-sm text-slate-600 mb-6">この操作は元に戻せません。</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingNote(null)}
                disabled={isDeletingNote}
                className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDeleteNote}
                disabled={isDeletingNote}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors"
              >
                {isDeletingNote ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
