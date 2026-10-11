import type { InferResponseType } from 'hono/client';
import type { RequestHandler } from 'msw';
import { HttpResponse, http } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { client } from '@/react-app/shared/api';
import { createHandler } from '@/react-app/shared/lib';

export type BreweryDetail = InferResponseType<(typeof client.api.breweries)[':id']['$get'], 200>;
export type BrewerySake = BreweryDetail['sakes'][number];

const brewery = {
  id: 3,
  name: '八海醸造',
  mapColumn: 5,
  mapRow: 3,
  area: 'Lower Green',
};

export const sakeFixtures: BrewerySake[] = [
  {
    id: 3,
    name: '八海山 純米大吟醸',
    type: '純米大吟醸',
    category: '清酒',
    isLimited: false,
    paidTastingPrice: 500,
    reviewCount: 2,
    averageRating: 4.5,
    myReviewId: 'review-1',
  },
  {
    id: 12,
    name: '八海山 普通酒',
    type: null,
    category: '清酒',
    isLimited: false,
    paidTastingPrice: null,
    reviewCount: 0,
    averageRating: null,
    myReviewId: null,
  },
  {
    id: 30,
    name: '杜氏の挑戦 シャルドネ',
    type: 'リキュール',
    category: 'リキュール',
    isLimited: true,
    paidTastingPrice: null,
    reviewCount: 1,
    averageRating: 3,
    myReviewId: null,
  },
];

let sakes: BrewerySake[] = [...sakeFixtures];

/** story ごとにストアを初期化する（`beforeEach` から呼ぶ） */
export function resetBreweryDetail(initialSakes: BrewerySake[] = sakeFixtures): void {
  sakes = [...initialSakes];
}

const successHandlers = [
  createHandler({ path: '/api/breweries/:id', method: '$get' })(() => ({
    status: 200,
    output: { brewery, sakes },
  })),
];

/** レスポンスが返らないケース（ローディング表示の確認用） */
const loadingHandlers = [
  createHandler({ path: '/api/breweries/:id', method: '$get' })(async () => {
    await delay('infinite');
    return { status: 200, output: { brewery, sakes } };
  }),
];

const notFoundHandlers = [
  createHandler({ path: '/api/breweries/:id', method: '$get' })(() => ({
    status: 404,
    output: { error: 'Not Found' },
  })),
];

/** route の型に存在しない status を返すため、ここだけは msw の http をそのまま使う */
const errorHandlers = [
  http.get('/api/breweries/:id', () => new HttpResponse(null, { status: 500 })),
];

/** story から使うハンドラ一式 */
export const breweryDetailHandlers = {
  success: successHandlers,
  loading: loadingHandlers,
  notFound: notFoundHandlers,
  error: errorHandlers,
} as const satisfies Record<string, RequestHandler[]>;
