import type { InferResponseType } from 'hono/client';
import type { RequestHandler } from 'msw';
import { HttpResponse, http } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { client } from '@/react-app/shared/api';
import { createHandler } from '@/react-app/shared/lib';

export type TimelineItem = InferResponseType<
  (typeof client.api.timeline)['$get'],
  200
>['items'][number];

/** story で相対時刻を安定させるための固定時刻（JST 2026-10-11 16:00） */
export const TIMELINE_NOW = '2026-10-11T07:00:00.000Z';

export const timelineFixtures: TimelineItem[] = [
  {
    id: 'review-1',
    rating: 5,
    tags: ['甘口', 'フルーティ'],
    comment: '華やかで飲みやすい。',
    createdAt: '2026-10-11T06:55:00.000Z',
    updatedAt: '2026-10-11T06:55:00.000Z',
    user: { id: 'user-1', name: '新潟 花子', image: null },
    sake: { id: 3, name: '八海山 純米大吟醸' },
    brewery: { id: 3, name: '八海醸造' },
  },
  {
    id: 'review-2',
    rating: 4,
    tags: ['淡麗'],
    comment: null,
    createdAt: '2026-10-11T06:00:00.000Z',
    updatedAt: '2026-10-11T05:00:00.000Z',
    user: { id: 'user-2', name: '長岡 太郎', image: null },
    sake: { id: 12, name: '北雪 大吟醸YK35' },
    brewery: { id: 82, name: '北雪酒造' },
  },
  {
    id: 'review-3',
    rating: 3,
    tags: [],
    comment: '好みが分かれそう。',
    createdAt: '2026-10-10T07:00:00.000Z',
    updatedAt: '2026-10-10T07:00:00.000Z',
    user: { id: 'user-3', name: '魚沼 次郎', image: null },
    sake: { id: 30, name: '杜氏の挑戦 シャルドネ' },
    brewery: { id: 1, name: '関原酒造' },
  },
];

/** 「もっと見る」の動きを確認するため、1 ページ 2 件で返す */
const PAGE_SIZE = 2;

let timeline: TimelineItem[] = [...timelineFixtures];

/** story ごとにストアを初期化する（`beforeEach` から呼ぶ） */
export function resetTimeline(initialTimeline: TimelineItem[] = timelineFixtures): void {
  timeline = [...initialTimeline];
}

function encodeCursor(item: TimelineItem): string {
  return `${new Date(item.createdAt).getTime()}_${item.id}`;
}

const successHandlers = [
  createHandler({ path: '/api/timeline', method: '$get' })(({ input }) => {
    const cursor = typeof input.query.cursor === 'string' ? input.query.cursor : undefined;
    const startIndex = cursor ? timeline.findIndex((item) => encodeCursor(item) === cursor) + 1 : 0;

    const items = timeline.slice(startIndex, startIndex + PAGE_SIZE);
    const hasMore = startIndex + PAGE_SIZE < timeline.length;
    const last = items[items.length - 1];

    return {
      status: 200,
      output: { items, nextCursor: hasMore && last ? encodeCursor(last) : null },
    };
  }),
];

/** レスポンスが返らないケース（ローディング表示の確認用） */
const loadingHandlers = [
  createHandler({ path: '/api/timeline', method: '$get' })(async () => {
    await delay('infinite');
    return { status: 200, output: { items: [], nextCursor: null } };
  }),
];

/** route の型に存在しない status を返すため、ここだけは msw の http をそのまま使う */
const errorHandlers = [http.get('/api/timeline', () => new HttpResponse(null, { status: 500 }))];

/** story から使うハンドラ一式 */
export const timelineHandlers = {
  success: successHandlers,
  loading: loadingHandlers,
  error: errorHandlers,
} as const satisfies Record<string, RequestHandler[]>;
