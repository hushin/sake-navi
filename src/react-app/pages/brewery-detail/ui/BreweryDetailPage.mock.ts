import type { InferResponseType } from 'hono/client';
import type { RequestHandler } from 'msw';
import { HttpResponse, http } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { client } from '@/react-app/shared/api';
import { createHandler, signedInSessionWithNickname } from '@/react-app/shared/lib';

export type BreweryDetail = InferResponseType<(typeof client.api.breweries)[':id']['$get'], 200>;
export type BrewerySake = BreweryDetail['sakes'][number];
export type BreweryNote = InferResponseType<
  (typeof client.api.breweries)[':id']['notes']['$get'],
  200
>['items'][number];
export type BrewerySakeDetail = InferResponseType<
  (typeof client.api.breweries)[':id']['sakes']['$post'],
  201
>;

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

/** ログイン中のユーザー（`signedInSessionWithNickname`）のノートと、他の人のノート */
export const noteFixtures: BreweryNote[] = [
  {
    id: 2,
    userId: signedInSessionWithNickname.user.id,
    userName: 'はなこ',
    breweryId: 3,
    comment: '列が長い。今なら空いている。',
    createdAt: '2026-10-11T06:00:00.000Z',
  },
  {
    id: 1,
    userId: 'user-2',
    userName: '長岡 太郎',
    breweryId: 3,
    comment: '14 時時点で売り切れ。',
    createdAt: '2026-10-11T05:00:00.000Z',
  },
];

let notes: BreweryNote[] = [...noteFixtures];
let nextNoteId = 100;
let nextSakeId = 100;

/** story ごとにストアを初期化する（`beforeEach` から呼ぶ） */
export function resetBreweryDetail(
  initialSakes: BrewerySake[] = sakeFixtures,
  initialNotes: BreweryNote[] = noteFixtures,
): void {
  sakes = [...initialSakes];
  notes = [...initialNotes];
  nextNoteId = 100;
  nextSakeId = 100;
}

const successHandlers = [
  createHandler({ path: '/api/breweries/:id', method: '$get' })(() => ({
    status: 200,
    output: { brewery, sakes },
  })),

  createHandler({ path: '/api/breweries/:id/notes', method: '$get' })(() => ({
    status: 200,
    output: { items: notes },
  })),

  createHandler({ path: '/api/breweries/:id/notes', method: '$post' })(({ input }) => {
    const note: BreweryNote = {
      id: nextNoteId++,
      userId: signedInSessionWithNickname.user.id,
      userName: signedInSessionWithNickname.user.nickname,
      breweryId: brewery.id,
      comment: input.json.comment,
      createdAt: '2026-10-11T06:30:00.000Z',
    };
    notes = [note, ...notes];
    return { status: 201, output: note };
  }),

  createHandler({ path: '/api/breweries/:id/notes/:noteId', method: '$put' })(({ input }) => {
    const existing = notes.find((note) => note.id === Number(input.param.noteId));
    if (!existing) {
      return { status: 404, output: { error: 'Not Found' } };
    }

    const updated = { ...existing, comment: input.json.comment };
    notes = notes.map((note) => (note.id === updated.id ? updated : note));
    return { status: 200, output: updated };
  }),

  createHandler({ path: '/api/breweries/:id/notes/:noteId', method: '$delete' })(({ input }) => {
    const noteId = Number(input.param.noteId);
    if (!notes.some((note) => note.id === noteId)) {
      return { status: 404, output: { error: 'Not Found' } };
    }

    notes = notes.filter((note) => note.id !== noteId);
    return { status: 200, output: { id: noteId } };
  }),

  createHandler({ path: '/api/breweries/:id/sakes', method: '$post' })(({ input }) => {
    const created: BrewerySakeDetail = {
      id: nextSakeId++,
      name: input.json.name,
      type: input.json.type,
      category: input.json.category,
      isLimited: input.json.isLimited,
      paidTastingPrice: input.json.paidTastingPrice,
      brewery,
      reviewCount: 0,
      averageRating: null,
    };
    sakes = [...sakes, { ...created, myReviewId: null }];
    return { status: 201, output: created };
  }),
];

/** レスポンスが返らないケース（ローディング表示の確認用） */
const loadingHandlers = [
  createHandler({ path: '/api/breweries/:id', method: '$get' })(async () => {
    await delay('infinite');
    return { status: 200, output: { brewery, sakes } };
  }),
  createHandler({ path: '/api/breweries/:id/notes', method: '$get' })(async () => {
    await delay('infinite');
    return { status: 200, output: { items: notes } };
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
  http.get('/api/breweries/:id/notes', () => new HttpResponse(null, { status: 500 })),
];

/** story から使うハンドラ一式 */
export const breweryDetailHandlers = {
  success: successHandlers,
  loading: loadingHandlers,
  notFound: notFoundHandlers,
  error: errorHandlers,
} as const satisfies Record<string, RequestHandler[]>;
