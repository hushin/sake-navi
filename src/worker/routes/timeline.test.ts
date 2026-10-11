import { env } from 'cloudflare:test';
import { z } from 'zod';
import { breweries, reviews, sakes } from '../db/schema';
import { app } from '../index';
import { insertTestUser, resetDatabase, testDb } from '../test/database';

const timelineSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      rating: z.number(),
      tags: z.array(z.string()),
      comment: z.string().nullable(),
      createdAt: z.string(),
      user: z.object({ id: z.string(), name: z.string() }),
      sake: z.object({ id: z.number(), name: z.string() }),
      brewery: z.object({ id: z.number(), name: z.string() }),
    }),
  ),
  nextCursor: z.string().nullable(),
});

async function insertReview(input: {
  id: string;
  userId?: string;
  sakeId: number;
  rating: number;
  createdAt: Date;
}) {
  await testDb()
    .insert(reviews)
    .values({
      id: input.id,
      userId: input.userId ?? 'user-1',
      sakeId: input.sakeId,
      rating: input.rating,
      tags: [],
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    });
}

describe('timeline route', () => {
  beforeEach(async () => {
    await resetDatabase();
    const db = testDb();
    await db.insert(breweries).values([
      { id: 1, name: '関原酒造', mapColumn: 14, mapRow: 6 },
      { id: 82, name: '北雪酒造', mapColumn: 1, mapRow: 1 },
    ]);
    await db.insert(sakes).values([
      { id: 1, breweryId: 1, name: '雪中貯蔵 純米生原酒' },
      { id: 2, breweryId: 82, name: '北雪 大吟醸YK35' },
    ]);
    await insertTestUser(db, { id: 'user-1', name: '新潟 花子', email: 'hanako@example.com' });
    await insertTestUser(db, { id: 'user-2', name: '長岡 太郎', email: 'taro@example.com' });
  });

  it('GET /api/timeline は新しい順に返す', async () => {
    await insertReview({
      id: 'a',
      sakeId: 1,
      rating: 5,
      createdAt: new Date('2026-10-11T01:00:00Z'),
    });
    await insertReview({
      id: 'b',
      sakeId: 2,
      rating: 3,
      createdAt: new Date('2026-10-11T03:00:00Z'),
    });

    const res = await app.request('/api/timeline', {}, env);
    expect(res.status).toBe(200);

    const body = timelineSchema.parse(await res.json());
    expect(body.items.map((item) => item.id)).toEqual(['b', 'a']);
    expect(body.items[0]).toMatchObject({
      rating: 3,
      user: { id: 'user-1', name: '新潟 花子' },
      sake: { id: 2, name: '北雪 大吟醸YK35' },
      brewery: { id: 82, name: '北雪酒造' },
    });
    expect(body.nextCursor).toBeNull();
  });

  it('カーソルで続きを取得でき、同一時刻のレビューも取りこぼさない', async () => {
    // createdAt が同一ミリ秒の 2 件（単純な時刻カーソルだと 2 ページ目で落ちる）。
    // 1 人 1 銘柄 1 件の制約があるので、別のユーザーで投稿する
    const sameMoment = new Date('2026-10-11T02:00:00.000Z');
    await insertReview({ id: 'a', sakeId: 1, rating: 1, createdAt: sameMoment });
    await insertReview({ id: 'b', userId: 'user-2', sakeId: 1, rating: 2, createdAt: sameMoment });
    await insertReview({
      id: 'c',
      userId: 'user-2',
      sakeId: 2,
      rating: 3,
      createdAt: new Date('2026-10-11T01:00:00Z'),
    });

    const first = timelineSchema.parse(
      await (await app.request('/api/timeline?limit=2', {}, env)).json(),
    );
    expect(first.items.map((item) => item.id)).toEqual(['b', 'a']);
    expect(first.nextCursor).not.toBeNull();

    const second = timelineSchema.parse(
      await (
        await app.request(
          `/api/timeline?limit=2&cursor=${encodeURIComponent(first.nextCursor ?? '')}`,
          {},
          env,
        )
      ).json(),
    );
    expect(second.items.map((item) => item.id)).toEqual(['c']);
    expect(second.nextCursor).toBeNull();
  });

  it('壊れたカーソルは最初のページとして扱う', async () => {
    await insertReview({
      id: 'a',
      sakeId: 1,
      rating: 5,
      createdAt: new Date('2026-10-11T01:00:00Z'),
    });

    const res = await app.request('/api/timeline?cursor=broken', {}, env);
    const body = timelineSchema.parse(await res.json());
    expect(body.items.map((item) => item.id)).toEqual(['a']);
  });
});
