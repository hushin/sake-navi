'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getReviewById, type ReviewDetail } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { StarRating } from '@/components/StarRating';
import { UserMenu } from '@/components/UserMenu';
import { getTagColorClass } from '@/lib/tagColors';

export default function ReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reviewId = parseInt(params.id as string);

  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 未認証の場合は / へリダイレクト
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    if (isNaN(reviewId)) {
      setError('無効なレビューIDです');
      setIsLoading(false);
      return;
    }

    fetchReview();
  }, [router, reviewId]);

  const fetchReview = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getReviewById(reviewId);
      setReview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レビューの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
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
            戻る
          </button>
          <h1 className="text-xl font-bold text-slate-800">レビュー詳細</h1>
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
        ) : review ? (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* ユーザー情報・日時 */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-sm text-slate-500">投稿者</p>
                <p className="text-lg font-semibold text-slate-800">{review.user.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">投稿日時</p>
                <p className="text-sm text-slate-700">{formatDate(review.createdAt)}</p>
              </div>
            </div>

            {/* 酒蔵・お酒情報 */}
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500 mb-1">酒蔵</p>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/brewery/${review.brewery.id}`}
                    className="text-xl font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    No.{review.brewery.id}: {review.brewery.name}
                  </Link>
                  <Link
                    href={`/map?brewery=${review.brewery.id}`}
                    className="text-slate-400 hover:text-blue-600 transition-colors"
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
                  </Link>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">お酒</p>
                <p className="text-2xl font-bold text-slate-800">{review.sake.name}</p>
                {review.sake.type && (
                  <p className="text-sm text-slate-600 mt-1">{review.sake.type}</p>
                )}
              </div>
            </div>

            {/* 評価 */}
            <div className="bg-slate-50 rounded-lg p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">評価</p>
                <StarRating value={review.rating} readonly size="lg" />
              </div>

              {/* タグ */}
              {review.tags && review.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">タグ</p>
                  <div className="flex flex-wrap gap-2">
                    {review.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getTagColorClass(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* コメント */}
              {review.comment && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">コメント</p>
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {review.comment}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* アクション */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Link
                href={`/brewery/${review.brewery.id}`}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                酒蔵ページへ
              </Link>
              <Link
                href={`/map?brewery=${review.brewery.id}`}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                マップで見る
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
