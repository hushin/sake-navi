import type { InferResponseType } from 'hono/client';
import type { RequestHandler } from 'msw';
import { HttpResponse, http } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { client } from '@/react-app/shared/api';
import { createHandler, signedInSession } from '@/react-app/shared/lib';
import { PAID_TASTING_PRICE_UNDETERMINED } from '@/shared/schemas/sake';

export type SakeDetail = InferResponseType<(typeof client.api.sakes)[':id']['$get'], 200>;
export type SakeReview = SakeDetail['reviews'][number];
export type SavedReview = InferResponseType<
  (typeof client.api.sakes)[':id']['reviews']['$post'],
  201
>;

const sakeBase = {
  id: 3,
  name: '八海山 純米大吟醸',
  type: '純米大吟醸',
  category: '清酒',
  isLimited: true,
  paidTastingPrice: PAID_TASTING_PRICE_UNDETERMINED,
  brewery: { id: 3, name: '八海醸造', mapColumn: 12, mapRow: 6 },
};

/** 自分（user-1）以外のレビュー。自分のレビューがある状態は story 側で足す */
export const otherReviewFixtures: SakeReview[] = [
  {
    id: 'review-2',
    userId: 'user-2',
    sakeId: 3,
    rating: 5,
    tags: ['甘口', 'フルーティ'],
    comment: '華やかで飲みやすい。最後にもう一度飲みたい。',
    createdAt: '2026-10-11T05:30:00.000Z',
    updatedAt: '2026-10-11T05:30:00.000Z',
    userName: '長岡 太郎',
    userImage: null,
  },
  {
    id: 'review-3',
    userId: 'user-3',
    sakeId: 3,
    rating: 4,
    tags: ['淡麗'],
    comment: null,
    createdAt: '2026-10-11T04:00:00.000Z',
    updatedAt: '2026-10-11T04:00:00.000Z',
    userName: '魚沼 次郎',
    userImage: null,
  },
];

const myReviewFixture: SakeReview = {
  id: 'review-1',
  userId: signedInSession.user.id,
  sakeId: 3,
  // 0.25 刻みの評価を保存済みの状態（編集でスライダーにそのまま入る）
  rating: 4.25,
  tags: ['濃醇'],
  comment: '香りがしっかりしていて好み。',
  createdAt: '2026-10-11T06:00:00.000Z',
  updatedAt: '2026-10-11T06:00:00.000Z',
  userName: signedInSession.user.name,
  userImage: null,
};

function buildDetail(reviews: SakeReview[]): SakeDetail {
  const average =
    reviews.length === 0
      ? null
      : reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;

  return { ...sakeBase, reviewCount: reviews.length, averageRating: average, reviews };
}

let detail: SakeDetail = buildDetail(otherReviewFixtures);
let savedCount = 0;

/** story ごとにストアを初期化する（`beforeEach` から呼ぶ） */
export function resetSakeDetail(reviews: SakeReview[] = otherReviewFixtures): void {
  detail = buildDetail(reviews);
  savedCount = 0;
}

/** すでに自分がレビューを書いている状態にする */
export function includeMyReview(): void {
  resetSakeDetail([myReviewFixture, ...otherReviewFixtures]);
}

const successHandlers = [
  createHandler({ path: '/api/sakes/:id', method: '$get' })(() => ({
    status: 200,
    output: detail,
  })),

  createHandler({ path: '/api/sakes/:id', method: '$put' })(({ input }) => {
    detail = {
      ...detail,
      name: input.json.name,
      type: input.json.type,
      category: input.json.category,
      isLimited: input.json.isLimited,
      paidTastingPrice: input.json.paidTastingPrice,
    };
    return { status: 200, output: detail };
  }),

  createHandler({ path: '/api/sakes/:id/reviews', method: '$post' })(({ input }) => {
    savedCount += 1;
    const timestamp = `2026-10-11T07:0${savedCount}:00.000Z`;
    const created: SavedReview = {
      id: `review-new-${savedCount}`,
      userId: signedInSession.user.id,
      sakeId: detail.id,
      rating: input.json.rating,
      tags: input.json.tags ?? [],
      comment: input.json.comment ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    detail = buildDetail([
      { ...created, userName: signedInSession.user.name, userImage: null },
      ...detail.reviews,
    ]);
    return { status: 201, output: created };
  }),

  createHandler({ path: '/api/reviews/:id', method: '$put' })(({ input }) => {
    const existing = detail.reviews.find((review) => review.id === input.param.id);
    if (!existing) {
      return { status: 404, output: { error: 'Not Found' } };
    }

    const timestamp = '2026-10-11T08:00:00.000Z';
    const updated: SavedReview = {
      id: existing.id,
      userId: existing.userId,
      sakeId: existing.sakeId,
      rating: input.json.rating,
      tags: input.json.tags ?? [],
      comment: input.json.comment ?? null,
      createdAt: existing.createdAt,
      updatedAt: timestamp,
    };
    detail = buildDetail([
      { ...existing, ...updated },
      ...detail.reviews.filter((review) => review.id !== existing.id),
    ]);
    return { status: 200, output: updated };
  }),

  createHandler({ path: '/api/reviews/:id', method: '$delete' })(({ input }) => {
    const { id } = input.param;
    if (!detail.reviews.some((review) => review.id === id)) {
      return { status: 404, output: { error: 'Not Found' } };
    }

    detail = buildDetail(detail.reviews.filter((review) => review.id !== id));
    return { status: 200, output: { id } };
  }),
];

/** レスポンスが返らないケース（ローディング表示の確認用） */
const loadingHandlers = [
  createHandler({ path: '/api/sakes/:id', method: '$get' })(async () => {
    await delay('infinite');
    return { status: 200, output: detail };
  }),
];

const notFoundHandlers = [
  createHandler({ path: '/api/sakes/:id', method: '$get' })(() => ({
    status: 404,
    output: { error: 'Not Found' },
  })),
];

/** route の型に存在しない status を返すため、ここだけは msw の http をそのまま使う */
const errorHandlers = [http.get('/api/sakes/:id', () => new HttpResponse(null, { status: 500 }))];

/** story から使うハンドラ一式 */
export const sakeDetailHandlers = {
  success: successHandlers,
  loading: loadingHandlers,
  notFound: notFoundHandlers,
  error: errorHandlers,
} as const satisfies Record<string, RequestHandler[]>;
