import type { InferResponseType } from 'hono/client';
import type { RequestHandler } from 'msw';
import { HttpResponse, http } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { client } from '@/react-app/shared/api';
import { createHandler, signedInSessionWithNickname } from '@/react-app/shared/lib';

export type ReviewFeedItem = InferResponseType<
  (typeof client.api.reviews)['$get'],
  200
>['items'][number];

/** 5 件あるので、1 ページ 2 件だと「もっと見る」が 2 回出る */
export const reviewFixtures: ReviewFeedItem[] = [
  {
    id: 'review-1',
    rating: 5,
    tags: ['甘口', 'フルーティ'],
    comment: '華やかで飲みやすい。',
    createdAt: '2026-10-11T06:00:00.000Z',
    updatedAt: '2026-10-11T06:00:00.000Z',
    user: { id: signedInSessionWithNickname.user.id, name: 'はなこ', image: null },
    sake: { id: 3, name: '八海山 純米大吟醸' },
    brewery: { id: 3, name: '八海醸造' },
  },
  {
    id: 'review-2',
    rating: 4,
    tags: ['淡麗'],
    comment: null,
    createdAt: '2026-10-11T05:00:00.000Z',
    updatedAt: '2026-10-11T05:00:00.000Z',
    user: { id: 'user-2', name: '長岡 太郎', image: null },
    sake: { id: 12, name: '北雪 大吟醸YK35' },
    brewery: { id: 82, name: '北雪酒造' },
  },
  {
    id: 'review-3',
    rating: 5,
    tags: ['甘口'],
    comment: '香りが強い。',
    createdAt: '2026-10-11T04:00:00.000Z',
    updatedAt: '2026-10-11T04:00:00.000Z',
    user: { id: 'user-3', name: '魚沼 次郎', image: null },
    sake: { id: 30, name: '杜氏の挑戦 シャルドネ' },
    brewery: { id: 1, name: '関原酒造' },
  },
  {
    id: 'review-4',
    // 0.25 刻みの評価。カーソル（評価順は `<rating>_<epoch ms>_<id>`）も小数のまま往復する
    rating: 3.25,
    tags: ['濃醇'],
    comment: null,
    createdAt: '2026-10-11T03:00:00.000Z',
    updatedAt: '2026-10-11T03:00:00.000Z',
    user: { id: 'user-2', name: '長岡 太郎', image: null },
    sake: { id: 5, name: '雪中貯蔵 純米生原酒' },
    brewery: { id: 1, name: '関原酒造' },
  },
  {
    id: 'review-5',
    rating: 1,
    tags: [],
    comment: '好みではなかった。',
    createdAt: '2026-10-11T02:00:00.000Z',
    updatedAt: '2026-10-11T02:00:00.000Z',
    user: { id: signedInSessionWithNickname.user.id, name: 'はなこ', image: null },
    sake: { id: 7, name: '越乃寒梅 特別本醸造' },
    brewery: { id: 5, name: '石本酒造' },
  },
];

const PAGE_SIZE = 2;

let reviews: ReviewFeedItem[] = [...reviewFixtures];

/** story ごとにストアを初期化する（`beforeEach` から呼ぶ） */
export function resetReviewFeed(initialReviews: ReviewFeedItem[] = reviewFixtures): void {
  reviews = [...initialReviews];
}

type Sort = 'latest' | 'rating';

function encodeCursor(item: ReviewFeedItem, sort: Sort): string {
  return sort === 'rating'
    ? `${item.rating}_${new Date(item.createdAt).getTime()}_${item.id}`
    : `${new Date(item.createdAt).getTime()}_${item.id}`;
}

function compare(a: ReviewFeedItem, b: ReviewFeedItem, sort: Sort): number {
  if (sort === 'rating' && a.rating !== b.rating) {
    return b.rating - a.rating;
  }
  const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  if (timeDiff !== 0) {
    return timeDiff;
  }
  return b.id.localeCompare(a.id);
}

const successHandlers = [
  createHandler({ path: '/api/reviews', method: '$get' })(({ input }) => {
    const sort: Sort = input.query.sort === 'rating' ? 'rating' : 'latest';
    const tags = (input.query.tags ?? '').split(',').filter(Boolean);
    const userId = input.query.userId;
    const cursor = input.query.cursor;

    const filtered = reviews
      .filter((item) => tags.every((tag) => item.tags.includes(tag)))
      .filter((item) => !userId || item.user.id === userId)
      .toSorted((a, b) => compare(a, b, sort));

    const startIndex = cursor
      ? filtered.findIndex((item) => encodeCursor(item, sort) === cursor) + 1
      : 0;
    const items = filtered.slice(startIndex, startIndex + PAGE_SIZE);
    const hasMore = startIndex + PAGE_SIZE < filtered.length;
    const last = items[items.length - 1];

    return {
      status: 200,
      output: { items, nextCursor: hasMore && last ? encodeCursor(last, sort) : null },
    };
  }),
];

/** レスポンスが返らないケース（ローディング表示の確認用） */
const loadingHandlers = [
  createHandler({ path: '/api/reviews', method: '$get' })(async () => {
    await delay('infinite');
    return { status: 200, output: { items: [], nextCursor: null } };
  }),
];

/** route の型に存在しない status を返すため、ここだけは msw の http をそのまま使う */
const errorHandlers = [http.get('/api/reviews', () => new HttpResponse(null, { status: 500 }))];

/** story から使うハンドラ一式 */
export const reviewListHandlers = {
  success: successHandlers,
  loading: loadingHandlers,
  error: errorHandlers,
} as const satisfies Record<string, RequestHandler[]>;
