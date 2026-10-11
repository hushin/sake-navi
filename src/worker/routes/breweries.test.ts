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
      { id: 1, breweryId: 1, name: '雪中貯蔵 純米生原酒', category: '清酒' },
      { id: 2, breweryId: 1, name: '杜氏の挑戦 シャルドネ', category: 'リキュール' },
      { id: 3, breweryId: 82, name: '北雪 大吟醸YK35', category: '清酒' },
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
      { userId: member.id, sakeId: 1, rating: 5, tags: [] },
      { userId: member.id, sakeId: 2, rating: 3, tags: [] },
      { userId: other.id, sakeId: 3, rating: 4, tags: [] },
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
});
