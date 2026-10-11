import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { z } from 'zod';
import { type AuthUser } from '../auth';
import { type AuthEnv } from '../auth/middleware';
import { breweries, sakes } from '../db/schema';
import { app } from '../index';
import { insertTestUser, resetDatabase, testDb, withSession } from '../test/database';
import bookmarksRoute from './bookmarks';

const bookmarkSchema = z.object({
  id: z.number(),
  sakeId: z.number(),
  createdAt: z.string(),
  sake: z.object({
    id: z.number(),
    name: z.string(),
    type: z.string().nullable(),
    category: z.string(),
    isLimited: z.boolean(),
    paidTastingPrice: z.number().nullable(),
  }),
  brewery: z.object({ id: z.number(), name: z.string() }),
});

const listSchema = z.object({ items: z.array(bookmarkSchema) });

const createdSchema = z.object({
  id: z.number(),
  sakeId: z.number(),
  createdAt: z.string(),
});

function authedApp(user: AuthUser) {
  return new Hono<AuthEnv>().use('*', withSession(user)).route('/bookmarks', bookmarksRoute);
}

function postBookmark(user: AuthUser, sakeId: number) {
  return authedApp(user).request(
    '/bookmarks',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sakeId }),
    },
    env,
  );
}

describe('bookmarks routes', () => {
  let member: AuthUser;
  let other: AuthUser;

  beforeEach(async () => {
    await resetDatabase();
    const db = testDb();
    await db
      .insert(breweries)
      .values({ id: 1, name: '関原酒造', mapColumn: 14, mapRow: 6, area: 'Lower Green' });
    await db.insert(sakes).values([
      {
        id: 1,
        breweryId: 1,
        name: '雪中貯蔵 純米生原酒',
        type: '純米酒',
        category: '清酒',
        isLimited: false,
        paidTastingPrice: 500,
      },
      {
        id: 2,
        breweryId: 1,
        name: '杜氏の挑戦 シャルドネ',
        type: 'リキュール',
        category: 'リキュール',
        isLimited: true,
      },
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
  });

  it('未ログインなら一覧・登録・解除のどれも 401', async () => {
    expect((await app.request('/api/bookmarks', {}, env)).status).toBe(401);
    expect(
      (
        await app.request(
          '/api/bookmarks',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sakeId: 1 }),
          },
          env,
        )
      ).status,
    ).toBe(401);
    expect((await app.request('/api/bookmarks/1', { method: 'DELETE' }, env)).status).toBe(401);
  });

  it('POST / で登録し、GET / は酒と酒蔵つきで返す', async () => {
    const created = await postBookmark(member, 1);
    expect(created.status).toBe(201);
    expect(createdSchema.parse(await created.json())).toMatchObject({ sakeId: 1 });

    const list = listSchema.parse(
      await (await authedApp(member).request('/bookmarks', {}, env)).json(),
    );
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({
      sakeId: 1,
      sake: {
        id: 1,
        name: '雪中貯蔵 純米生原酒',
        type: '純米酒',
        category: '清酒',
        isLimited: false,
        paidTastingPrice: 500,
      },
      brewery: { id: 1, name: '関原酒造' },
    });
  });

  it('POST / は同じ銘柄の二重登録を 409、未知の銘柄を 404、壊れた入力を 400 にする', async () => {
    expect((await postBookmark(member, 1)).status).toBe(201);
    expect((await postBookmark(member, 1)).status).toBe(409);

    // 別のユーザーは同じ銘柄を登録できる（UNIQUE は user_id と sake_id の組）
    expect((await postBookmark(other, 1)).status).toBe(201);

    expect((await postBookmark(member, 999)).status).toBe(404);

    const invalid = await authedApp(member).request(
      '/bookmarks',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sakeId: 'abc' }),
      },
      env,
    );
    expect(invalid.status).toBe(400);
  });

  it('GET / には自分以外のブックマークが出ない', async () => {
    await postBookmark(member, 1);
    await postBookmark(other, 2);

    const mine = listSchema.parse(
      await (await authedApp(member).request('/bookmarks', {}, env)).json(),
    );
    expect(mine.items.map((item) => item.sakeId)).toEqual([1]);

    const theirs = listSchema.parse(
      await (await authedApp(other).request('/bookmarks', {}, env)).json(),
    );
    expect(theirs.items.map((item) => item.sakeId)).toEqual([2]);
  });

  it('DELETE /:sakeId で解除でき、無いものや他人のものは 404', async () => {
    await postBookmark(member, 1);
    await postBookmark(other, 2);

    const deleted = await authedApp(member).request('/bookmarks/1', { method: 'DELETE' }, env);
    expect(deleted.status).toBe(200);
    expect(z.object({ sakeId: z.number() }).parse(await deleted.json())).toEqual({ sakeId: 1 });

    const list = listSchema.parse(
      await (await authedApp(member).request('/bookmarks', {}, env)).json(),
    );
    expect(list.items).toEqual([]);

    // 二度目は 404
    expect(
      (await authedApp(member).request('/bookmarks/1', { method: 'DELETE' }, env)).status,
    ).toBe(404);
    // 他人のブックマークは消せない（消えたように見せない）
    expect(
      (await authedApp(member).request('/bookmarks/2', { method: 'DELETE' }, env)).status,
    ).toBe(404);
    // 数値でないパスパラメータも 404
    expect(
      (await authedApp(member).request('/bookmarks/abc', { method: 'DELETE' }, env)).status,
    ).toBe(404);
  });
});
