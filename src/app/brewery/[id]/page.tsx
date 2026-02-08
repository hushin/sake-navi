'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getBreweryDetail,
  getBreweryNotes,
  addCustomSake,
  createBreweryNote,
  type BreweryDetail,
  type BreweryNote,
  type Sake,
} from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { StarRating } from '@/components/StarRating';
import { UserMenu } from '@/components/UserMenu';

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
  const [isAddingSake, setIsAddingSake] = useState(false);
  const [addSakeError, setAddSakeError] = useState<string | null>(null);

  // ノート投稿モーダル用のstate
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [addNoteError, setAddNoteError] = useState<string | null>(null);

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
  }, [breweryId]);

  // お酒を追加
  const handleAddSake = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSakeName.trim()) {
      setAddSakeError('お酒の名前を入力してください');
      return;
    }

    setIsAddingSake(true);
    setAddSakeError(null);

    try {
      const newSake = await addCustomSake(breweryId, newSakeName.trim());

      // 酒蔵詳細を再取得（新しいお酒を含む）
      const updatedDetail = await getBreweryDetail(breweryId);
      setBreweryDetail(updatedDetail);

      // モーダルを閉じる
      setShowAddSakeModal(false);
      setNewSakeName('');
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
            {breweryDetail.brewery.boothNumber && (
              <p className="text-sm text-slate-600">
                ブース番号: {breweryDetail.brewery.boothNumber}
              </p>
            )}
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
            <div className="space-y-4">
              {breweryDetail.sakes.map((sake) => (
                <div
                  key={sake.sakeId}
                  className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{sake.name}</h3>
                      {sake.type && <p className="text-sm text-slate-600 mt-1">{sake.type}</p>}
                      {sake.isCustom && sake.addedBy && (
                        <p className="text-xs text-slate-400 mt-1">ユーザーによる追加</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {sake.averageRating !== null ? (
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500 text-lg">★</span>
                          <span className="font-semibold text-slate-800">
                            {sake.averageRating.toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">未評価</span>
                      )}
                      <Link
                        href={`/brewery/${breweryId}/sake/${sake.sakeId}/review`}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
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
                            className="bg-slate-50 rounded-lg p-3 text-sm border border-slate-100"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">
                                  {review.user.name}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  <StarRating value={review.rating} size="sm" readonly />
                                </div>
                              </div>
                              <span className="text-xs text-slate-500">
                                {formatDate(review.createdAt)}
                              </span>
                            </div>
                            {review.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {review.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
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
                    <span className="text-xs text-slate-500">{formatDate(note.createdAt)}</span>
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
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">お酒を追加</h3>
            <form onSubmit={handleAddSake} className="space-y-4">
              <div>
                <label
                  htmlFor="sake-name"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  お酒の名前
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
    </div>
  );
}
