'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getBreweries, type BreweryWithRating } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

/**
 * フロアマップページのメインコンテンツ
 * - 横スクロール対応のフロアマップ表示
 * - 酒蔵バッジを position: absolute でオーバーレイ
 * - 各酒蔵バッジに平均評価を表示（★表示）
 * - 未認証の場合は / へリダイレクト
 */
function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [breweries, setBreweries] = useState<BreweryWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedBreweryId, setFocusedBreweryId] = useState<number | null>(null);
  const breweryRefs = useRef<Map<number, HTMLAnchorElement>>(new Map());

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

  // URLパラメータから酒蔵IDを取得してフォーカス
  useEffect(() => {
    const breweryParam = searchParams.get('brewery');
    if (breweryParam) {
      const breweryId = Number(breweryParam);
      if (!isNaN(breweryId)) {
        setFocusedBreweryId(breweryId);
      }
    }
  }, [searchParams]);

  // フォーカス対象の酒蔵にスクロール
  useEffect(() => {
    if (focusedBreweryId && breweries.length > 0) {
      // データ読み込み完了後、少し遅延させてからスクロール
      const timer = setTimeout(() => {
        const element = breweryRefs.current.get(focusedBreweryId);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center',
          });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [focusedBreweryId, breweries]);

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

  const handleClearFocus = () => {
    setFocusedBreweryId(null);
    router.replace('/map');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">会場マップ</h1>
          <div className="flex items-center gap-2">
            {focusedBreweryId && (
              <button
                onClick={handleClearFocus}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                フォーカス解除
              </button>
            )}
            <Link
              href="/timeline"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              タイムライン
            </Link>
          </div>
        </div>
      </header>

      {/* フロアマップ */}
      <main className="overflow-x-auto">
        <div className="relative w-[1640px] min-h-[500px] mx-auto my-10">
          {/* マップ画像 */}
          <img src="/floor-map.png" alt="会場フロアマップ" className="block w-full h-auto" />

          {/* 酒蔵バッジオーバーレイレイヤー（画像と同サイズ） */}
          <div className="absolute inset-0 pointer-events-none">
            {breweries.map((brewery) => {
              const START_X = 90;
              const START_Y = 53;
              const CELL_W = 80;
              const CELL_H = 64;
              const GAP_X = 55;
              const GAP_X_LARGE = 105;
              const GAP_Y = 20;

              const col = brewery.mapPositionX; // 1-based
              const row = brewery.mapPositionY; // 1-based

              const COL_GAPS = [
                { after: 2, size: GAP_X }, // 2-3 の間
                { after: 4, size: GAP_X_LARGE }, // 4-5 の間（広い）
                { after: 6, size: GAP_X },
                { after: 8, size: GAP_X },
                { after: 10, size: GAP_X_LARGE },
                { after: 12, size: GAP_X },
              ];

              const ROW_GAPS = [
                { after: 2, size: GAP_Y },
                { after: 4, size: GAP_Y },
              ];

              const extraX = COL_GAPS.filter((g) => col > g.after).reduce(
                (sum, g) => sum + g.size,
                0,
              );

              const extraY = ROW_GAPS.filter((g) => row > g.after).reduce(
                (sum, g) => sum + g.size,
                0,
              );

              const left = (col - 1) * CELL_W + extraX + START_X;
              const top = (row - 1) * CELL_H + extraY + START_Y;

              const isFocused = focusedBreweryId === brewery.breweryId;

              return (
                <Link
                  key={brewery.breweryId}
                  ref={(el) => {
                    if (el) {
                      breweryRefs.current.set(brewery.breweryId, el);
                    } else {
                      breweryRefs.current.delete(brewery.breweryId);
                    }
                  }}
                  href={`/brewery/${brewery.breweryId}`}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group pointer-events-auto"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                  }}
                >
                  <div className="relative">
                    {/* フォーカス時のアニメーション枠線 */}
                    {isFocused && (
                      <div
                        className="absolute inset-0 rounded-lg border-2 border-green-500 animate-ping opacity-75"
                        style={{
                          width: CELL_W,
                          height: CELL_H,
                        }}
                      />
                    )}

                    {/* 実際のコンテンツ */}
                    <div
                      className={`relative bg-white rounded-lg border-2 hover:border-blue-500 group-hover:scale-110 transition-all ${
                        isFocused
                          ? 'border-green-500 shadow-lg shadow-green-200 scale-110'
                          : 'border-gray-300'
                      }`}
                      style={{
                        width: CELL_W,
                        height: CELL_H,
                      }}
                    >
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
                  </div>
                </Link>
              );
            })}
          </div>
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
              <span className="text-yellow-500">★</span>
              <span>平均評価</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * フロアマップページ
 * - useSearchParams()を使用するため、Suspense境界でラップ
 */
export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      }
    >
      <MapPageContent />
    </Suspense>
  );
}
