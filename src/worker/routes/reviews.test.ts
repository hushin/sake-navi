import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { z } from 'zod';
import { type AuthUser } from '../auth';
import { type AuthEnv } from '../auth/middleware';
import { breweries, reviews, sakes } from '../db/schema';
import { insertTestUser, resetDatabase, testDb, withSession } from '../test/database';
import reviewsRoute from './reviews';

const reviewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  rating: z.number(),
  tags: z.array(z.string()),
  comment: z.string().nullable(),
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
    await db.insert(sakes).values({ id: 1, breweryId: 1, name: '雪中貯蔵 純米生原酒' });
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
      .values({ userId: owner.id, sakeId: 1, rating: 4, tags: ['濃醇'], comment: '好み' })
      .returning();
    if (!created) {
      throw new Error('レビューの作成に失敗しました');
    }
    reviewId = created.id;
  });

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
});
