import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { type AuthUser } from '../auth';
import { type AuthEnv } from '../auth/middleware';
import { breweries, breweryNotes, reviews, sakes, user as userTable } from '../db/schema';
import { app } from '../index';
import { insertTestUser, resetDatabase, testDb, withSession } from '../test/database';
import breweriesRoute from './breweries';

const listSchema = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      mapColumn: z.number(),
      mapRow: z.number(),
      area: z.string().nullable(),
      reviewCount: z.number(),
      averageRating: z.number().nullable(),
      hasUserReviewed: z.boolean(),
    }),
  ),
});

function authedApp(user: AuthUser) {
  return new Hono<AuthEnv>().use('*', withSession(user)).route('/breweries', breweriesRoute);
}

const detailSchema = z.object({
  brewery: z.object({
    id: z.number(),
    name: z.string(),
    mapColumn: z.number(),
    mapRow: z.number(),
    area: z.string().nullable(),
  }),
  sakes: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      type: z.string().nullable(),
      category: z.string(),
      isLimited: z.boolean(),
      paidTastingPrice: z.number().nullable(),
      reviewCount: z.number(),
      averageRating: z.number().nullable(),
      myReviewId: z.string().nullable(),
    }),
  ),
});

const notesSchema = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      userId: z.string(),
      userName: z.string(),
      breweryId: z.number(),
      comment: z.string(),
      createdAt: z.string(),
    }),
  ),
});

const noteSchema = notesSchema.shape.items.element;

const createdSakeSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string().nullable(),
  category: z.string(),
  isLimited: z.boolean(),
  paidTastingPrice: z.number().nullable(),
  brewery: z.object({ id: z.number(), name: z.string() }),
  reviewCount: z.number(),
  averageRating: z.number().nullable(),
});

describe('breweries routes', () => {
  let member: AuthUser;
  let other: AuthUser;

  beforeEach(async () => {
    await resetDatabase();
    const db = testDb();
    await db.insert(breweries).values([
      { id: 1, name: '関原酒造', mapColumn: 14, mapRow: 6, area: 'Lower Green' },
      // 出品酒が 1 件も無い酒蔵（集計が null になる）
      { id: 5, name: '休憩所', mapColumn: 7, mapRow: 3, area: null },
      { id: 82, name: '北雪酒造', mapColumn: 1, mapRow: 1, area: 'Upper Pink' },
    ]);
    await db.insert(sakes).values([
      { id: 1, breweryId: 1, name: '雪中貯蔵 純米生原酒', type: '純米酒', category: '清酒' },
      {
        id: 2,
        breweryId: 1,
        name: '杜氏の挑戦 シャルドネ',
        type: 'リキュール',
        category: 'リキュール',
        isLimited: true,
      },
      { id: 3, breweryId: 82, name: '北雪 大吟醸YK35', type: '大吟醸', category: '清酒' },
    ]);
    member = await insertTestUser(db, {
      id: 'user-member',
      name: '長岡 太郎',
      email: 'taro@example.com',
    });
    other = await insertTestUser(db, {
      id: 'user-other',
      name: '魚沼 次郎',
      email: 'jiro@example.com',
    });
    await db.insert(reviews).values([
      { id: 'review-1', userId: member.id, sakeId: 1, rating: 5, tags: [] },
      { id: 'review-2', userId: member.id, sakeId: 2, rating: 3, tags: [] },
      { id: 'review-3', userId: other.id, sakeId: 3, rating: 4, tags: [] },
    ]);
    await db.insert(breweryNotes).values([
      {
        id: 1,
        userId: other.id,
        breweryId: 1,
        comment: '列が長い。',
        createdAt: new Date('2026-10-11T02:00:00Z'),
      },
      {
        id: 2,
        userId: member.id,
        breweryId: 1,
        comment: '売り切れ間近。',
        createdAt: new Date('2026-10-11T03:00:00Z'),
      },
    ]);
  });

  it('GET / はブース番号順に酒蔵を返し、未サインインでも hasUserReviewed は false', async () => {
    const res = await app.request('/api/breweries', {}, env);
    expect(res.status).toBe(200);

    const body = listSchema.parse(await res.json());
    expect(body.items.map((item) => item.id)).toEqual([1, 5, 82]);
    expect(body.items[0]).toMatchObject({
      id: 1,
      name: '関原酒造',
      mapColumn: 14,
      mapRow: 6,
      area: 'Lower Green',
      reviewCount: 2,
      averageRating: 4,
      hasUserReviewed: false,
    });
  });

  it('GET / は出品酒が無い酒蔵も 0 件・未評価で返す', async () => {
    const body = listSchema.parse(await (await app.request('/api/breweries', {}, env)).json());
    expect(body.items[1]).toMatchObject({
      id: 5,
      name: '休憩所',
      area: null,
      reviewCount: 0,
      averageRating: null,
      hasUserReviewed: false,
    });
  });

  it('GET / の hasUserReviewed は自分のレビューだけを見る', async () => {
    const mine = listSchema.parse(
      await (await authedApp(member).request('/breweries', {}, env)).json(),
    );
    expect(mine.items.map((item) => [item.id, item.hasUserReviewed])).toEqual([
      [1, true],
      [5, false],
      [82, false],
    ]);

    const theirs = listSchema.parse(
      await (await authedApp(other).request('/breweries', {}, env)).json(),
    );
    expect(theirs.items.map((item) => [item.id, item.hasUserReviewed])).toEqual([
      [1, false],
      [5, false],
      [82, true],
    ]);
  });

  it('GET /:id は酒蔵と出品酒（レビュー件数・平均評価つき）を返す', async () => {
    const res = await authedApp(member).request('/breweries/1', {}, env);
    expect(res.status).toBe(200);

    const body = detailSchema.parse(await res.json());
    expect(body.brewery).toEqual({
      id: 1,
      name: '関原酒造',
      mapColumn: 14,
      mapRow: 6,
      area: 'Lower Green',
    });
    expect(
      body.sakes.map((sake) => [
        sake.id,
        sake.name,
        sake.type,
        sake.isLimited,
        sake.reviewCount,
        sake.averageRating,
        sake.myReviewId,
      ]),
    ).toEqual([
      [1, '雪中貯蔵 純米生原酒', '純米酒', false, 1, 5, 'review-1'],
      [2, '杜氏の挑戦 シャルドネ', 'リキュール', true, 1, 3, 'review-2'],
    ]);
  });

  it('GET /:id の myReviewId は自分のレビューだけを指し、集計は誰でも同じ', async () => {
    const anonymous = detailSchema.parse(
      await (await app.request('/api/breweries/1', {}, env)).json(),
    );
    expect(anonymous.sakes.map((sake) => sake.myReviewId)).toEqual([null, null]);

    // 他の人がレビューしていても、自分のレビューではないので null
    const theirs = detailSchema.parse(
      await (await authedApp(other).request('/breweries/1', {}, env)).json(),
    );
    expect(theirs.sakes.map((sake) => sake.myReviewId)).toEqual([null, null]);
    expect(theirs.sakes.map((sake) => sake.averageRating)).toEqual([5, 3]);

    // 他人の酒蔵でも、自分のレビューがあれば id が入る
    const otherBrewery = detailSchema.parse(
      await (await authedApp(other).request('/breweries/82', {}, env)).json(),
    );
    expect(otherBrewery.sakes.map((sake) => sake.myReviewId)).toEqual(['review-3']);
  });

  it('GET /:id は出品酒が無い酒蔵なら空配列、未知の id は 404', async () => {
    const empty = detailSchema.parse(await (await app.request('/api/breweries/5', {}, env)).json());
    expect(empty.brewery.name).toBe('休憩所');
    expect(empty.sakes).toEqual([]);

    expect((await app.request('/api/breweries/999', {}, env)).status).toBe(404);
    expect((await app.request('/api/breweries/abc', {}, env)).status).toBe(404);
  });

  it('GET /:id/notes はノートを新しい順に返し、未サインインでも読める', async () => {
    const res = await app.request('/api/breweries/1/notes', {}, env);
    expect(res.status).toBe(200);

    const body = notesSchema.parse(await res.json());
    expect(body.items.map((note) => [note.id, note.comment])).toEqual([
      [2, '売り切れ間近。'],
      [1, '列が長い。'],
    ]);
    // 表示名は新潟 花子ではなくニックネームを優先する
    await testDb().update(userTable).set({ nickname: 'はなこ' });
    const renamed = notesSchema.parse(
      await (await app.request('/api/breweries/1/notes', {}, env)).json(),
    );
    expect(renamed.items[0]?.userName).toBe('はなこ');

    // 出品酒もノートも無い酒蔵は空配列、未知の id は 404
    expect(
      notesSchema.parse(await (await app.request('/api/breweries/5/notes', {}, env)).json()).items,
    ).toEqual([]);
    expect((await app.request('/api/breweries/999/notes', {}, env)).status).toBe(404);
    expect((await app.request('/api/breweries/abc/notes', {}, env)).status).toBe(404);
  });

  it('POST /:id/notes はサインインが要り、投稿したノートを返す', async () => {
    const guest = new Hono<AuthEnv>()
      .use('*', withSession(null))
      .route('/breweries', breweriesRoute);
    expect(
      (
        await guest.request(
          '/breweries/1/notes',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: '混雑なし' }),
          },
          env,
        )
      ).status,
    ).toBe(401);

    const res = await authedApp(member).request(
      '/breweries/1/notes',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: '  今なら空いている  ' }),
      },
      env,
    );
    expect(res.status).toBe(201);

    const note = noteSchema.parse(await res.json());
    expect(note).toMatchObject({
      userId: member.id,
      userName: member.name,
      breweryId: 1,
      // 前後の空白は落とす
      comment: '今なら空いている',
    });
    expect(
      notesSchema.parse(await (await app.request('/api/breweries/1/notes', {}, env)).json())
        .items[0]?.id,
    ).toBe(note.id);

    // 空のコメントは zod が弾く
    expect(
      (
        await authedApp(member).request(
          '/breweries/1/notes',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: '   ' }),
          },
          env,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await authedApp(member).request(
          '/breweries/999/notes',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: '混雑なし' }),
          },
          env,
        )
      ).status,
    ).toBe(404);
  });

  it('PUT /:id/notes/:noteId は本人だけが編集でき、別の酒蔵のノートは 404', async () => {
    const res = await authedApp(member).request(
      '/breweries/1/notes/2',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: '完売しました' }),
      },
      env,
    );
    expect(res.status).toBe(200);
    expect(noteSchema.parse(await res.json())).toMatchObject({
      id: 2,
      userId: member.id,
      comment: '完売しました',
    });

    // 他人のノートは編集できない
    expect(
      (
        await authedApp(member).request(
          '/breweries/1/notes/1',
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: '書き換え' }),
          },
          env,
        )
      ).status,
    ).toBe(403);

    // 自分のノートでも、URL の酒蔵が違えば404
    expect(
      (
        await authedApp(member).request(
          '/breweries/82/notes/2',
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: '書き換え' }),
          },
          env,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await authedApp(member).request(
          '/breweries/1/notes/999',
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: '書き換え' }),
          },
          env,
        )
      ).status,
    ).toBe(404);
    // ノート id が数値でない場合も 404
    expect(
      (
        await authedApp(member).request(
          '/breweries/1/notes/abc',
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: '書き換え' }),
          },
          env,
        )
      ).status,
    ).toBe(404);
  });

  it('DELETE /:id/notes/:noteId は本人だけが削除できる', async () => {
    expect(
      (await authedApp(member).request('/breweries/1/notes/1', { method: 'DELETE' }, env)).status,
    ).toBe(403);

    const res = await authedApp(member).request('/breweries/1/notes/2', { method: 'DELETE' }, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 2 });

    const remaining = notesSchema.parse(
      await (await app.request('/api/breweries/1/notes', {}, env)).json(),
    );
    expect(remaining.items.map((note) => note.id)).toEqual([1]);
    expect(
      (await authedApp(member).request('/breweries/1/notes/2', { method: 'DELETE' }, env)).status,
    ).toBe(404);
  });

  it('POST /:id/sakes はサインインしていれば銘柄を追加できる', async () => {
    const guest = new Hono<AuthEnv>()
      .use('*', withSession(null))
      .route('/breweries', breweriesRoute);
    expect(
      (
        await guest.request(
          '/breweries/1/sakes',
          { method: 'POST', body: JSON.stringify({ name: '限定酒' }) },
          env,
        )
      ).status,
    ).toBe(401);

    const res = await authedApp(member).request(
      '/breweries/1/sakes',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '  しぼりたて生原酒  ',
          type: '純米',
          category: '清酒',
          isLimited: true,
          paidTastingPrice: 7,
        }),
      },
      env,
    );
    expect(res.status).toBe(201);

    const sake = createdSakeSchema.parse(await res.json());
    expect(sake).toMatchObject({
      name: 'しぼりたて生原酒',
      type: '純米',
      category: '清酒',
      isLimited: true,
      paidTastingPrice: 7,
      brewery: { id: 1, name: '関原酒造' },
      reviewCount: 0,
      averageRating: null,
    });

    // 追加者と「ユーザー投稿の銘柄」であることが残る
    const [row] = await testDb()
      .select({ isCustom: sakes.isCustom, addedBy: sakes.addedBy })
      .from(sakes)
      .where(eq(sakes.id, sake.id));
    expect(row).toEqual({ isCustom: true, addedBy: member.id });

    // 酒蔵の出品酒一覧にも出る
    const detail = detailSchema.parse(
      await (await authedApp(member).request('/breweries/1', {}, env)).json(),
    );
    expect(detail.sakes.map((item) => item.id)).toContain(sake.id);

    // 未知の酒蔵は 404、区分が変なら 400
    expect(
      (
        await authedApp(member).request(
          '/breweries/999/sakes',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: '限定酒',
              type: null,
              category: '清酒',
              isLimited: false,
              paidTastingPrice: null,
            }),
          },
          env,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await authedApp(member).request(
          '/breweries/1/sakes',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: '限定酒',
              type: null,
              category: 'ビール',
              isLimited: false,
              paidTastingPrice: null,
            }),
          },
          env,
        )
      ).status,
    ).toBe(400);
  });
});
