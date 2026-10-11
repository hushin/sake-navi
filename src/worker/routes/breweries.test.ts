import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { z } from 'zod';
import { type AuthUser } from '../auth';
import { type AuthEnv } from '../auth/middleware';
import { breweries, reviews, sakes } from '../db/schema';
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
});
