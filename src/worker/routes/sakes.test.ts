import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { z } from 'zod';
import { type AuthUser } from '../auth';
import { type AuthEnv } from '../auth/middleware';
import { breweries, sakes } from '../db/schema';
import { app } from '../index';
import { insertTestUser, resetDatabase, testDb, withSession } from '../test/database';
import sakesRoute from './sakes';

const listSchema = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      type: z.string().nullable(),
      category: z.string(),
      isLimited: z.boolean(),
      paidTastingPrice: z.number().nullable(),
      breweryId: z.number(),
      breweryName: z.string(),
      reviewCount: z.number(),
      averageRating: z.number().nullable(),
    }),
  ),
  nextCursor: z.number().nullable(),
});

const reviewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  sakeId: z.number(),
  rating: z.number(),
  tags: z.array(z.string()),
  comment: z.string().nullable(),
});

const detailSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string().nullable(),
  category: z.string(),
  isLimited: z.boolean(),
  paidTastingPrice: z.number().nullable(),
  brewery: z.object({ id: z.number(), name: z.string() }),
  reviewCount: z.number(),
  averageRating: z.number().nullable(),
  reviews: z.array(reviewSchema),
});

function authedApp(user: AuthUser) {
  return new Hono<AuthEnv>().use('*', withSession(user)).route('/sakes', sakesRoute);
}

describe('sakes routes', () => {
  let owner: AuthUser;
  let member: AuthUser;

  beforeEach(async () => {
    await resetDatabase();
    const db = testDb();
    await db.insert(breweries).values([
      { id: 1, name: '関原酒造', mapColumn: 14, mapRow: 6, area: 'Lower Green' },
      { id: 82, name: '北雪酒造', mapColumn: 1, mapRow: 1, area: 'Upper Pink' },
    ]);
    await db.insert(sakes).values([
      {
        id: 1,
        breweryId: 1,
        name: '雪中貯蔵 純米生原酒',
        type: '純米酒',
        category: '清酒',
        isLimited: false,
        // 金額まで分かっている有料試飲
        paidTastingPrice: 500,
      },
      {
        id: 2,
        breweryId: 1,
        name: '杜氏の挑戦 シャルドネ',
        type: 'リキュール',
        category: 'リキュール',
        isLimited: true,
        // 有料試飲とだけ分かっていて金額が未入力（印の 7）
        paidTastingPrice: 7,
      },
      {
        id: 3,
        breweryId: 82,
        name: '北雪 大吟醸YK35',
        type: '大吟醸',
        category: '清酒',
        isLimited: false,
      },
    ]);
    owner = await insertTestUser(db, {
      id: 'user-owner',
      name: '新潟 花子',
      email: 'owner@example.com',
      role: 'owner',
    });
    member = await insertTestUser(db, {
      id: 'user-member',
      name: '長岡 太郎',
      email: 'taro@example.com',
    });
  });

  it('GET /api/sakes は酒蔵つきの一覧を id 順で返す', async () => {
    const res = await app.request('/api/sakes', {}, env);
    expect(res.status).toBe(200);

    const body = listSchema.parse(await res.json());
    expect(body.items.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(body.items[0]).toMatchObject({
      name: '雪中貯蔵 純米生原酒',
      breweryId: 1,
      breweryName: '関原酒造',
      reviewCount: 0,
      averageRating: null,
    });
    expect(body.nextCursor).toBeNull();
  });

  it('GET /api/sakes?q= は酒名と酒蔵名の両方に部分一致する', async () => {
    const byName = await app.request('/api/sakes?q=%E5%8C%97%E9%9B%AA', {}, env);
    expect(listSchema.parse(await byName.json()).items.map((item) => item.id)).toEqual([3]);

    const byBrewery = await app.request('/api/sakes?q=%E9%96%A2%E5%8E%9F', {}, env);
    expect(listSchema.parse(await byBrewery.json()).items.map((item) => item.id)).toEqual([1, 2]);
  });

  it('GET /api/sakes?category= と isLimited= で絞り込める', async () => {
    const byCategory = await app.request(
      `/api/sakes?category=${encodeURIComponent('リキュール')}`,
      {},
      env,
    );
    expect(listSchema.parse(await byCategory.json()).items.map((item) => item.id)).toEqual([2]);

    const limited = await app.request('/api/sakes?isLimited=true', {}, env);
    expect(listSchema.parse(await limited.json()).items.map((item) => item.id)).toEqual([2]);
  });

  it('GET /api/sakes?hasPaidTasting= と needsPrice= で絞り込める', async () => {
    const paid = await app.request('/api/sakes?hasPaidTasting=true', {}, env);
    expect(listSchema.parse(await paid.json()).items.map((item) => item.id)).toEqual([1, 2]);

    // 金額が未入力（7）のものだけ。金額が分かっているものは含めない
    const needsPrice = await app.request('/api/sakes?needsPrice=true', {}, env);
    expect(listSchema.parse(await needsPrice.json()).items.map((item) => item.id)).toEqual([2]);

    // `false` は「未入力も含む」ので意味がなく、受け付けない
    expect((await app.request('/api/sakes?hasPaidTasting=false', {}, env)).status).toBe(400);
  });

  it('GET /api/sakes はカーソルで次ページを返す', async () => {
    const first = listSchema.parse(await (await app.request('/api/sakes?limit=2', {}, env)).json());
    expect(first.items.map((item) => item.id)).toEqual([1, 2]);
    expect(first.nextCursor).toBe(2);

    const second = listSchema.parse(
      await (await app.request('/api/sakes?limit=2&cursor=2', {}, env)).json(),
    );
    expect(second.items.map((item) => item.id)).toEqual([3]);
    expect(second.nextCursor).toBeNull();
  });

  it('GET /api/sakes/:id はレビュー込みの詳細を返し、未知の id は 404', async () => {
    const res = await app.request('/api/sakes/1', {}, env);
    expect(res.status).toBe(200);
    const detail = detailSchema.parse(await res.json());
    expect(detail.brewery).toEqual({ id: 1, name: '関原酒造' });
    expect(detail.reviews).toEqual([]);

    expect((await app.request('/api/sakes/999', {}, env)).status).toBe(404);
    expect((await app.request('/api/sakes/abc', {}, env)).status).toBe(404);
  });

  it('POST /api/sakes/:id/reviews は未ログインなら 401', async () => {
    const res = await app.request(
      '/api/sakes/1/reviews',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 4 }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it('POST /api/sakes/:id/reviews はレビューを作成し、同じ銘柄への再投稿は 409', async () => {
    const created = await authedApp(owner).request(
      '/sakes/1/reviews',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5, tags: ['甘口', 'フルーティ'], comment: '華やか' }),
      },
      env,
    );
    expect(created.status).toBe(201);
    expect(reviewSchema.parse(await created.json())).toMatchObject({
      userId: 'user-owner',
      sakeId: 1,
      rating: 5,
      tags: ['甘口', 'フルーティ'],
      comment: '華やか',
    });

    const conflict = await authedApp(owner).request(
      '/sakes/1/reviews',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5, tags: ['甘口', 'フルーティ'], comment: '華やか' }),
      },
      env,
    );
    expect(conflict.status).toBe(409);

    // 詳細の集計にも反映される
    const detail = detailSchema.parse(await (await app.request('/api/sakes/1', {}, env)).json());
    expect(detail.reviewCount).toBe(1);
    expect(detail.averageRating).toBe(5);
    expect(detail.reviews).toHaveLength(1);
  });

  it('POST /api/sakes/:id/reviews は入力を検証し、未知の銘柄は 404', async () => {
    const invalid = await authedApp(owner).request(
      '/sakes/1/reviews',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 0 }),
      },
      env,
    );
    expect(invalid.status).toBe(400);

    const unknownSake = await authedApp(owner).request(
      '/sakes/999/reviews',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 3 }),
      },
      env,
    );
    expect(unknownSake.status).toBe(404);
  });

  it('PUT /api/sakes/:id はサインインしていれば誰でも銘柄を編集できる', async () => {
    const res = await authedApp(member).request(
      '/sakes/1',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '雪中貯蔵 純米生原酒（会場で確認）',
          type: '純米酒',
          category: '清酒',
          isLimited: true,
          paidTastingPrice: 500,
        }),
      },
      env,
    );

    expect(res.status).toBe(200);
    expect(detailSchema.parse(await res.json())).toMatchObject({
      name: '雪中貯蔵 純米生原酒（会場で確認）',
      isLimited: true,
      paidTastingPrice: 500,
    });

    // 一覧にも反映される
    const list = listSchema.parse(await (await app.request('/api/sakes?limit=1', {}, env)).json());
    expect(list.items[0]).toMatchObject({ isLimited: true, paidTastingPrice: 500 });
  });

  it('PUT /api/sakes/:id は金額と種類を未入力（null）に戻せる', async () => {
    const res = await authedApp(member).request(
      '/sakes/1',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '雪中貯蔵 純米生原酒',
          type: null,
          category: '清酒',
          isLimited: false,
          paidTastingPrice: null,
        }),
      },
      env,
    );

    expect(res.status).toBe(200);
    expect(detailSchema.parse(await res.json())).toMatchObject({
      type: null,
      isLimited: false,
      paidTastingPrice: null,
    });
  });

  it('PUT /api/sakes/:id は未ログインなら 401、未知の id は 404、入力を検証する', async () => {
    const body = JSON.stringify({
      name: '雪中貯蔵 純米生原酒',
      type: null,
      category: '清酒',
      isLimited: false,
      paidTastingPrice: null,
    });
    const headers = { 'Content-Type': 'application/json' };

    const anonymous = await app.request('/api/sakes/1', { method: 'PUT', headers, body }, env);
    expect(anonymous.status).toBe(401);

    const notFound = await authedApp(member).request(
      '/sakes/999',
      { method: 'PUT', headers, body },
      env,
    );
    expect(notFound.status).toBe(404);

    const invalid = await authedApp(member).request(
      '/sakes/1',
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: '',
          type: null,
          category: '清酒',
          isLimited: false,
          paidTastingPrice: -1,
        }),
      },
      env,
    );
    expect(invalid.status).toBe(400);
  });
});
