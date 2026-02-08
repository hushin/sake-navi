'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createUser } from '@/lib/api';
import { saveAuth, isAuthenticated } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // すでにログイン済みの場合は自動的に/mapへリダイレクト
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/map');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // ユーザー登録API呼び出し
      const user = await createUser(name.trim());

      // localStorageに保存
      saveAuth(user.id, user.name);

      // /mapへ遷移
      router.push('/map');
    } catch (err) {
      // エラーハンドリング
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('登録に失敗しました。もう一度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">酒ナビ</h1>
            <p className="text-slate-600 text-sm">にいがた酒の陣 レビュー共有アプリ</p>
          </div>

          {/* 名前入力フォーム */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                お名前を入力してください
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: たなか"
                disabled={isLoading}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
                maxLength={20}
                data-1p-ignore
              />
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              {isLoading ? '登録中...' : 'はじめる'}
            </button>
          </form>

          {/* 注意事項 */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              入力した名前は他の参加者にも表示されます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
