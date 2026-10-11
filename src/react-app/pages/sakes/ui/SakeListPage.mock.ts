import type { InferResponseType } from 'hono/client';
import type { RequestHandler } from 'msw';
import { HttpResponse, http } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { client } from '@/react-app/shared/api';
import { createHandler } from '@/react-app/shared/lib';

export type SakeListItem = InferResponseType<
  (typeof client.api.sakes)['$get'],
  200
>['items'][number];

export const sakeFixtures: SakeListItem[] = [
  {
    id: 3,
    name: '八海山 純米大吟醸',
    type: '純米大吟醸',
    category: '清酒',
    isLimited: false,
    paidTastingPrice: 500,
    breweryId: 3,
    breweryName: '八海醸造',
    reviewCount: 2,
    averageRating: 4.5,
  },
  {
    id: 12,
    name: '北雪 大吟醸YK35',
    type: '大吟醸',
    category: '清酒',
    isLimited: true,
    paidTastingPrice: null,
    breweryId: 82,
    breweryName: '北雪酒造',
    reviewCount: 0,
    averageRating: null,
  },
  {
    id: 30,
    name: '杜氏の挑戦 シャルドネ',
    type: 'リキュール',
    category: 'リキュール',
    isLimited: false,
    paidTastingPrice: null,
    breweryId: 1,
    breweryName: '関原酒造',
    reviewCount: 1,
    averageRating: 3,
  },
];

/** 「もっと見る」の動きを確認するため、1 ページ 2 件で返す */
const PAGE_SIZE = 2;

let sakes: SakeListItem[] = [...sakeFixtures];

/** story ごとにストアを初期化する（`beforeEach` から呼ぶ） */
export function resetSakes(initialSakes: SakeListItem[] = sakeFixtures): void {
  sakes = [...initialSakes];
}

const successHandlers = [
  createHandler({ path: '/api/sakes', method: '$get' })(({ input }) => {
    const { q, category, isLimited, cursor } = input.query;
    // クエリ文字列なのでカーソルも文字列で届く
    const cursorValue = Array.isArray(cursor) ? cursor[0] : cursor;
    const after = cursorValue === undefined ? 0 : Number(cursorValue);

    const filtered = sakes.filter((sake) => {
      if (q && !sake.name.includes(q) && !sake.breweryName.includes(q)) {
        return false;
      }
      if (category && sake.category !== category) {
        return false;
      }
      if (isLimited === 'true' && !sake.isLimited) {
        return false;
      }
      return sake.id > after;
    });

    const items = filtered.slice(0, PAGE_SIZE);
    const nextCursor = filtered.length > PAGE_SIZE ? (items[items.length - 1]?.id ?? null) : null;

    return { status: 200, output: { items, nextCursor } };
  }),
];

/** レスポンスが返らないケース（ローディング表示の確認用） */
const loadingHandlers = [
  createHandler({ path: '/api/sakes', method: '$get' })(async () => {
    await delay('infinite');
    return { status: 200, output: { items: [], nextCursor: null } };
  }),
];

/** route の型に存在しない status を返すため、ここだけは msw の http をそのまま使う */
const errorHandlers = [http.get('/api/sakes', () => new HttpResponse(null, { status: 500 }))];

/** story から使うハンドラ一式 */
export const sakeListHandlers = {
  success: successHandlers,
  loading: loadingHandlers,
  error: errorHandlers,
} as const satisfies Record<string, RequestHandler[]>;
