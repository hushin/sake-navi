import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { z } from 'zod';
import { type AuthUser } from '../auth';
import { type AuthEnv } from '../auth/middleware';
import { breweries, reviews, sakes } from '../db/schema';
import { app } from '../index';
import { insertTestUser, resetDatabase, testDb, withSession } from '../test/database';
import reviewsRoute from './reviews';

const reviewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  rating: z.number(),
  tags: z.array(z.string()),
  comment: z.string().nullable(),
});

const reviewFeedSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      rating: z.number(),
      tags: z.array(z.string()),
      comment: z.string().nullable(),
      createdAt: z.string(),
      user: z.object({ id: z.string(), name: z.string(), image: z.string().nullable() }),
      sake: z.object({ id: z.number(), name: z.string() }),
      brewery: z.object({ id: z.number(), name: z.string() }),
    }),
  ),
  nextCursor: z.string().nullable(),
});

function authedApp(user: AuthUser) {
  return new Hono<AuthEnv>().use('*', withSession(user)).route('/reviews', reviewsRoute);
}

describe('reviews routes', () => {
  let owner: AuthUser;
  let other: AuthUser;
  let reviewId: string;

  beforeEach(async () => {
    await resetDatabase();
    const db = testDb();
    await db.insert(breweries).values({ id: 1, name: '関原酒造', mapColumn: 14, mapRow: 6 });
    await db.insert(sakes).values([
      { id: 1, breweryId: 1, name: '雪中貯蔵 純米生原酒' },
      {
        id: 2,
        breweryId: 1,
        name: '杜氏の挑戦 シャルドネ',
        type: 'リキュール',
        category: 'リキュール',
      },
    ]);
    owner = await insertTestUser(db, {
      id: 'user-owner',
      name: '新潟 花子',
      email: 'owner@example.com',
      role: 'owner',
    });
    other = await insertTestUser(db, {
      id: 'user-other',
      name: '長岡 太郎',
      email: 'taro@example.com',
    });

    const [created] = await db
      .insert(reviews)
      .values({
        id: 'review-owner',
        userId: owner.id,
        sakeId: 1,
        rating: 4,
        tags: ['濃醇'],
        comment: '好み',
        createdAt: new Date('2026-10-11T01:00:00Z'),
      })
      .returning();
    if (!created) {
      throw new Error('レビューの作成に失敗しました');
    }
    reviewId = created.id;
  });

  async function insertExtraReviews() {
    const db = testDb();
    await db.insert(reviews).values([
      {
        id: 'review-new',
        userId: other.id,
        sakeId: 2,
        rating: 5,
        tags: ['甘口', '濃醇'],
        comment: '華やか',
        createdAt: new Date('2026-10-11T03:00:00Z'),
      },
      {
        id: 'review-mid',
        userId: other.id,
        sakeId: 1,
        rating: 3,
        tags: ['甘口'],
        comment: null,
        createdAt: new Date('2026-10-11T02:00:00Z'),
      },
    ]);
  }

  it('PUT /api/reviews/:id は本人のレビューを更新する', async () => {
    const res = await authedApp(owner).request(
      `/reviews/${reviewId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5, tags: ['甘口'], comment: '飲み直した' }),
      },
      env,
    );

    expect(res.status).toBe(200);
    expect(reviewSchema.parse(await res.json())).toMatchObject({
      id: reviewId,
      rating: 5,
      tags: ['甘口'],
      comment: '飲み直した',
    });
  });

  it('PUT /api/reviews/:id は他人のレビューなら 403、未知の id は 404', async () => {
    const forbidden = await authedApp(other).request(
      `/reviews/${reviewId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 1, tags: [] }),
      },
      env,
    );
    expect(forbidden.status).toBe(403);

    const notFound = await authedApp(owner).request(
      '/reviews/unknown-id',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 1, tags: [] }),
      },
      env,
    );
    expect(notFound.status).toBe(404);
  });

  it('DELETE /api/reviews/:id は本人だけが削除できる', async () => {
    const forbidden = await authedApp(other).request(
      `/reviews/${reviewId}`,
      { method: 'DELETE' },
      env,
    );
    expect(forbidden.status).toBe(403);

    const deleted = await authedApp(owner).request(
      `/reviews/${reviewId}`,
      { method: 'DELETE' },
      env,
    );
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ id: reviewId });

    const rows = await testDb().select().from(reviews);
    expect(rows).toHaveLength(0);
  });

  it('未ログインなら 401', async () => {
    const anonApp = new Hono<AuthEnv>().use('*', withSession(null)).route('/reviews', reviewsRoute);

    const res = await anonApp.request(`/reviews/${reviewId}`, { method: 'DELETE' }, env);
    expect(res.status).toBe(401);
  });

  describe('GET /api/reviews', () => {
    it('未サインインでも新しい順で返す', async () => {
      await insertExtraReviews();

      const res = await app.request('/api/reviews?limit=2', {}, env);
      expect(res.status).toBe(200);

      const body = reviewFeedSchema.parse(await res.json());
      expect(body.items.map((item) => item.id)).toEqual(['review-new', 'review-mid']);
      expect(body.items[0]).toMatchObject({
        rating: 5,
        user: { id: other.id, name: '長岡 太郎' },
        sake: { id: 2, name: '杜氏の挑戦 シャルドネ' },
        brewery: { id: 1, name: '関原酒造' },
      });
      expect(body.nextCursor).not.toBeNull();

      const second = reviewFeedSchema.parse(
        await (
          await app.request(
            `/api/reviews?limit=2&cursor=${encodeURIComponent(body.nextCursor ?? '')}`,
            {},
            env,
          )
        ).json(),
      );
      expect(second.items.map((item) => item.id)).toEqual(['review-owner']);
      expect(second.nextCursor).toBeNull();
    });

    it('評価順で並べ、2 ページ目以降も取りこぼさない', async () => {
      await insertExtraReviews();

      const first = reviewFeedSchema.parse(
        await (await app.request('/api/reviews?sort=rating&limit=2', {}, env)).json(),
      );
      expect(first.items.map((item) => [item.id, item.rating])).toEqual([
        ['review-new', 5],
        ['review-owner', 4],
      ]);
      expect(first.nextCursor).not.toBeNull();

      const second = reviewFeedSchema.parse(
        await (
          await app.request(
            `/api/reviews?sort=rating&limit=2&cursor=${encodeURIComponent(first.nextCursor ?? '')}`,
            {},
            env,
          )
        ).json(),
      );
      expect(second.items.map((item) => item.id)).toEqual(['review-mid']);
      expect(second.nextCursor).toBeNull();
    });

    it('同評価・同時刻のレビューを評価順のカーソルで取りこぼさない', async () => {
      const sameMoment = new Date('2026-10-11T05:00:00Z');
      await testDb()
        .insert(reviews)
        .values([
          { id: 'c', userId: other.id, sakeId: 2, rating: 5, tags: [], createdAt: sameMoment },
          { id: 'b', userId: owner.id, sakeId: 2, rating: 5, tags: [], createdAt: sameMoment },
          { id: 'a', userId: other.id, sakeId: 1, rating: 5, tags: [], createdAt: sameMoment },
        ]);

      const first = reviewFeedSchema.parse(
        await (await app.request('/api/reviews?sort=rating&limit=2', {}, env)).json(),
      );
      expect(first.items.map((item) => item.id)).toEqual(['c', 'b']);

      const second = reviewFeedSchema.parse(
        await (
          await app.request(
            `/api/reviews?sort=rating&limit=2&cursor=${encodeURIComponent(first.nextCursor ?? '')}`,
            {},
            env,
          )
        ).json(),
      );
      // a（同評価・同時刻）のあとに、ベースのレビューが続く
      expect(second.items.map((item) => item.id)).toEqual(['a', 'review-owner']);
      expect(second.nextCursor).toBeNull();
    });

    it('タグは AND で絞り込み、未知のタグは無視する', async () => {
      await insertExtraReviews();

      const tagFiltered = reviewFeedSchema.parse(
        await (await app.request('/api/reviews?tags=%E6%BF%83%E9%86%87', {}, env)).json(),
      );
      expect(tagFiltered.items.map((item) => item.id)).toEqual(['review-new', 'review-owner']);

      const both = reviewFeedSchema.parse(
        await (
          await app.request('/api/reviews?tags=%E6%BF%83%E9%86%87,%E7%94%98%E5%8F%A3', {}, env)
        ).json(),
      );
      expect(both.items.map((item) => item.id)).toEqual(['review-new']);

      // 存在しないタグは無視される（500 にならない）
      const unknown = reviewFeedSchema.parse(
        await (
          await app.request(
            '/api/reviews?tags=%E6%BF%83%E9%86%87,%E5%AD%98%E5%9C%A8%E3%81%97%E3%81%AA%E3%81%84',
            {},
            env,
          )
        ).json(),
      );
      expect(unknown.items.map((item) => item.id)).toEqual(['review-new', 'review-owner']);
    });

    it('userId で自分のレビューだけに絞れる', async () => {
      await insertExtraReviews();

      const theirs = reviewFeedSchema.parse(
        await (await app.request(`/api/reviews?userId=${other.id}`, {}, env)).json(),
      );
      expect(theirs.items.map((item) => item.id)).toEqual(['review-new', 'review-mid']);

      const mine = reviewFeedSchema.parse(
        await (await app.request(`/api/reviews?userId=${owner.id}`, {}, env)).json(),
      );
      expect(mine.items.map((item) => item.id)).toEqual(['review-owner']);
    });

    it('未知の sort や範囲外の limit は 400、壊れたカーソルは最初のページ', async () => {
      expect((await app.request('/api/reviews?sort=random', {}, env)).status).toBe(400);
      expect((await app.request('/api/reviews?limit=0', {}, env)).status).toBe(400);

      const body = reviewFeedSchema.parse(
        await (await app.request('/api/reviews?cursor=broken', {}, env)).json(),
      );
      expect(body.items.map((item) => item.id)).toEqual(['review-owner']);
    });
  });
});
