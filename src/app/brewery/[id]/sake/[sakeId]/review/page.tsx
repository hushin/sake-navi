'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { StarRating } from '@/components/StarRating';
import { TagSelector } from '@/components/TagSelector';
import { UserMenu } from '@/components/UserMenu';
import { getBreweryDetail, createReview, ApiError } from '@/lib/api';
import { getAuth } from '@/lib/auth';

/**
 * レビュー投稿ページ
 * /brewery/[id]/sake/[sakeId]/review
 */
export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const breweryId = Number(params.id);
  const sakeId = Number(params.sakeId);

  // 認証状態
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // お酒情報
  const [sakeName, setSakeName] = useState<string>('');
  const [breweryName, setBreweryName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // フォーム入力値
  const [rating, setRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');

  // 送信状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 認証チェック
  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.replace('/');
      return;
    }
    setIsAuthChecked(true);
  }, [router]);

  // お酒情報を取得（酒蔵詳細から）
  useEffect(() => {
    if (!isAuthChecked) return;

    const fetchBreweryAndSake = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        // 酒蔵詳細を取得して、その中から該当のお酒を探す
        const breweryDetail = await getBreweryDetail(breweryId);
        const sake = breweryDetail.sakes.find((s) => s.sakeId === sakeId);

        if (!sake) {
          setLoadError('お酒が見つかりません');
          return;
        }

        setBreweryName(breweryDetail.brewery.name);
        setSakeName(sake.name);
      } catch (error) {
        console.error('Failed to fetch brewery and sake detail:', error);
        if (error instanceof ApiError) {
          setLoadError(error.message);
        } else {
          setLoadError('お酒の情報を取得できませんでした');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBreweryAndSake();
  }, [breweryId, sakeId, isAuthChecked]);

  // レビュー投稿処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setSubmitError('評価を選択してください');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await createReview(sakeId, {
        rating,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        comment: comment.trim() || undefined,
      });

      // 投稿成功 → 酒蔵詳細ページへ遷移
      router.push(`/brewery/${breweryId}`);
    } catch (error) {
      console.error('Failed to submit review:', error);
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError('レビューの投稿に失敗しました');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 認証チェック中は何も表示しない
  if (!isAuthChecked) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* ヘッダー */}
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 transition-colors"
            >
              <span className="text-xl">←</span>
              戻る
            </button>
            <UserMenu />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">レビューを投稿</h1>
        </header>

        {/* ローディング状態 */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        )}

        {/* エラー表示 */}
        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">{loadError}</p>
            <button
              onClick={() => router.back()}
              className="mt-3 text-red-600 hover:text-red-800 font-medium"
            >
              戻る
            </button>
          </div>
        )}

        {/* レビューフォーム */}
        {!isLoading && !loadError && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* お酒情報 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="space-y-2">
                {breweryName && <p className="text-sm text-gray-600">{breweryName}</p>}
                <h2 className="text-2xl font-bold text-gray-800">{sakeName}</h2>
              </div>
            </div>

            {/* 星評価 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <label className="block mb-4">
                <span className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  評価
                  <span className="text-red-500">*</span>
                </span>
                <span className="text-sm text-gray-600">タップして評価してください</span>
              </label>
              <div className="flex py-4">
                <StarRating value={rating} onChange={setRating} size="xl" />
              </div>
            </div>

            {/* タグ選択 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <label className="block mb-4">
                <span className="text-lg font-semibold text-gray-800 mb-2 block">タグ</span>
                <span className="text-sm text-gray-600">
                  お酒の特徴を選んでください（複数選択可）
                </span>
              </label>
              <TagSelector selectedTags={selectedTags} onTagsChange={setSelectedTags} />
            </div>

            {/* コメント入力 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <label className="block">
                <span className="text-lg font-semibold text-gray-800 mb-2 block">コメント</span>
                <span className="text-sm text-gray-600 mb-3 block">感想を自由に書いてください</span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="例: フルーティーで飲みやすい！後味がスッキリしていて好みでした。"
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <div className="mt-2 text-right text-sm text-gray-500">{comment.length} 文字</div>
              </label>
            </div>

            {/* エラー表示 */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">{submitError}</p>
              </div>
            )}

            {/* 投稿ボタン */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className={`
                  flex-1 px-6 py-4 font-semibold rounded-lg transition-all
                  ${
                    isSubmitting || rating === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  }
                `}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block animate-spin rounded-full h-5 w-5 border-3 border-white border-t-transparent"></span>
                    投稿中...
                  </span>
                ) : (
                  '投稿する'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
