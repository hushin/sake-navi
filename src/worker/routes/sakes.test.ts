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
      },
      {
        id: 2,
        breweryId: 1,
        name: '杜氏の挑戦 シャルドネ',
        type: 'リキュール',
        category: 'リキュール',
        isLimited: true,
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
});
