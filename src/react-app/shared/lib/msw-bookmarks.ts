import type { InferResponseType } from 'hono/client';
import type { RequestHandler } from 'msw';
import { HttpResponse, http } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { client } from '@/react-app/shared/api';
import { createHandler } from './msw-hono';

export type BookmarkItem = InferResponseType<
  (typeof client.api.bookmarks)['$get'],
  200
>['items'][number];

/**
 * ブックマークの MSW ハンドラ。
 *
 * ブックマークは「銘柄一覧・銘柄詳細のトグル」と「ブックマーク画面の一覧」の
 * 3 つの画面から同じ API を叩くので、ページごとの `*.mock.ts` に置かず
 * `msw-session.ts` と同じく shared に置く（story 側は `resetBookmarks()` で初期化する）。
 */
export const bookmarkFixtures: BookmarkItem[] = [
  {
    id: 1,
    sakeId: 3,
    createdAt: '2026-10-11T05:00:00.000Z',
    sake: {
      id: 3,
      name: '八海山 純米大吟醸',
      type: '純米大吟醸',
      category: '清酒',
      isLimited: false,
      paidTastingPrice: 500,
    },
    brewery: { id: 3, name: '八海醸造' },
  },
  {
    id: 2,
    sakeId: 12,
    createdAt: '2026-10-11T06:00:00.000Z',
    sake: {
      id: 12,
      name: '北雪 大吟醸YK35',
      type: '大吟醸',
      category: '清酒',
      isLimited: true,
      paidTastingPrice: null,
    },
    brewery: { id: 82, name: '北雪酒造' },
  },
];

let bookmarks: BookmarkItem[] = [...bookmarkFixtures];
let nextId = bookmarkFixtures.length + 1;

/** story ごとにストアを初期化する（`beforeEach` から呼ぶ） */
export function resetBookmarks(initialBookmarks: BookmarkItem[] = bookmarkFixtures): void {
  bookmarks = [...initialBookmarks];
  nextId = bookmarks.length + 1;
}

/**
 * `POST /api/bookmarks` は銘柄 id しか受け取らないので、一覧に足す項目の酒の情報は
 * 分からない。トグルを確認する story（銘柄一覧・銘柄詳細）は一覧の中身を見ないため、
 * ここでは id だけが意味を持つ最小の項目を作る。
 */
function bookmarkFromSakeId(sakeId: number): BookmarkItem {
  return {
    id: nextId,
    sakeId,
    createdAt: '2026-10-11T07:00:00.000Z',
    sake: {
      id: sakeId,
      name: '',
      type: null,
      category: '清酒',
      isLimited: false,
      paidTastingPrice: null,
    },
    brewery: { id: 0, name: '' },
  };
}

const successHandlers = [
  createHandler({ path: '/api/bookmarks', method: '$get' })(() => ({
    status: 200,
    output: { items: bookmarks },
  })),

  createHandler({ path: '/api/bookmarks', method: '$post' })(({ input }) => {
    const { sakeId } = input.json;
    if (bookmarks.some((item) => item.sakeId === sakeId)) {
      return { status: 409, output: { error: 'Conflict' } };
    }

    const created = bookmarkFromSakeId(sakeId);
    nextId += 1;
    bookmarks = [...bookmarks, created];

    return { status: 201, output: { id: created.id, sakeId, createdAt: created.createdAt } };
  }),

  createHandler({ path: '/api/bookmarks/:sakeId', method: '$delete' })(({ input }) => {
    const sakeId = Number(input.param.sakeId);
    if (!bookmarks.some((item) => item.sakeId === sakeId)) {
      return { status: 404, output: { error: 'Not Found' } };
    }

    bookmarks = bookmarks.filter((item) => item.sakeId !== sakeId);
    return { status: 200, output: { sakeId } };
  }),
];

/** レスポンスが返らないケース（ローディング表示の確認用） */
const loadingHandlers = [
  createHandler({ path: '/api/bookmarks', method: '$get' })(async () => {
    await delay('infinite');
    return { status: 200, output: { items: bookmarks } };
  }),
];

/** route の型に存在しない status を返すため、ここだけは msw の http をそのまま使う */
const errorHandlers = [http.get('/api/bookmarks', () => new HttpResponse(null, { status: 500 }))];

/** story から使うハンドラ一式 */
export const bookmarkHandlers = {
  success: successHandlers,
  loading: loadingHandlers,
  error: errorHandlers,
} as const satisfies Record<string, RequestHandler[]>;
