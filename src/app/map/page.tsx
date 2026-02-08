'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBreweries, type BreweryWithRating } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

/**
 * フロアマップページ
 * - 横スクロール対応のフロアマップ表示
 * - 酒蔵バッジを position: absolute でオーバーレイ
 * - 各酒蔵バッジに平均評価を表示（★表示）
 * - 未認証の場合は / へリダイレクト
 */
export default function MapPage() {
  const router = useRouter();
  const [breweries, setBreweries] = useState<BreweryWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 未認証の場合はトップページへリダイレクト
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    // 酒蔵一覧を取得
    const fetchBreweries = async () => {
      try {
        const data = await getBreweries();
        setBreweries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '酒蔵データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchBreweries();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">会場マップ</h1>
          <Link
            href="/timeline"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            タイムライン
          </Link>
        </div>
      </header>

      {/* フロアマップ */}
      <main className="overflow-x-auto">
        <div className="relative inline-block min-w-full" style={{ minHeight: '600px' }}>
          {/* マップ画像 */}
          <img
            src="/floor-map.png"
            alt="会場フロアマップ"
            className="w-full h-auto"
            style={{ minWidth: '1200px' }}
          />

          {/* 酒蔵バッジオーバーレイ */}
          {breweries.map((brewery) => (
            <Link
              key={brewery.breweryId}
              href={`/brewery/${brewery.breweryId}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
              style={{
                left: `${brewery.mapPositionX * 93 - 1}%`,
                top: `${brewery.mapPositionY * 59 + 6}%`,
              }}
            >
              <div className="bg-white rounded-lg w-[80px] h-[60px] border-2 border-transparent hover:border-blue-500 group-hover:scale-110">
                {/* 酒蔵名 */}
                <div className="font-semibold text-sm text-gray-900 mb-1 text-center">
                  {brewery.name}
                </div>

                {/* 平均評価 */}
                {brewery.averageRating !== null ? (
                  <div className="flex items-center justify-center gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold text-slate-800">
                        {brewery.averageRating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 text-center">未評価</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* 凡例 */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border-2 border-blue-500 rounded"></div>
              <span>酒蔵ブース</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">★★★★★</span>
              <span>平均評価</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
