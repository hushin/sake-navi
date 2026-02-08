'use client';

import { useState } from 'react';
import { StarRating } from '@/components/StarRating';
import { TagSelector } from '@/components/TagSelector';

export default function ComponentsTestPage() {
  const [rating, setRating] = useState(3);
  const [selectedTags, setSelectedTags] = useState<string[]>(['甘口', '濃醇']);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">共通UIコンポーネント テスト</h1>
          <p className="text-gray-600">
            StarRating と TagSelector コンポーネントの動作確認用ページ
          </p>
        </div>

        {/* StarRating のテスト */}
        <section className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">StarRating</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                選択可能モード（現在の評価: {rating}）
              </h3>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                読み取り専用モード（評価: 4）
              </h3>
              <StarRating value={4} readonly />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">サイズバリエーション</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">small</p>
                  <StarRating value={5} readonly size="sm" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">medium (default)</p>
                  <StarRating value={5} readonly size="md" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">large</p>
                  <StarRating value={5} readonly size="lg" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">x-large</p>
                  <StarRating value={5} readonly size="xl" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">全評価パターン</h3>
              <div className="space-y-2">
                {[0, 1, 2, 3, 4, 5].map((value) => (
                  <div key={value} className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 w-16">{value}星:</span>
                    <StarRating value={value} readonly />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TagSelector のテスト */}
        <section className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">TagSelector</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">タグ選択（複数選択可能）</h3>
              <TagSelector selectedTags={selectedTags} onTagsChange={setSelectedTags} />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">選択されたタグ</h3>
              {selectedTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">タグが選択されていません</p>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">JSON形式（API送信用）</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                {JSON.stringify(selectedTags, null, 2)}
              </pre>
            </div>
          </div>
        </section>

        {/* 統合デモ */}
        <section className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">統合デモ: レビュー投稿フォーム風</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">評価 *</label>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                タグ（複数選択可）
              </label>
              <TagSelector selectedTags={selectedTags} onTagsChange={setSelectedTags} />
            </div>

            <div>
              <label htmlFor="comment" className="block text-sm font-semibold text-gray-700 mb-2">
                コメント
              </label>
              <textarea
                id="comment"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="このお酒の感想を自由に入力してください..."
              />
            </div>

            <button
              type="button"
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              レビューを投稿
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
