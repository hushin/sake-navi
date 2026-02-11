import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { bookmarks, sakes, breweries } from '../db/schema';
import { findUserOrThrow } from '../helpers/validation';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>()
  // GET /api/bookmarks - ブックマーク一覧（お酒・酒蔵情報付き）
  .get('/', async (c) => {
    const db = c.var.db;
    const userId = c.req.header('X-User-Id');

    if (!userId) {
      return c.json({ error: 'ユーザーIDが必要です' }, 401);
    }

    const result = await db
      .select({
        bookmarkId: bookmarks.bookmarkId,
        sakeId: sakes.sakeId,
        sakeName: sakes.name,
        sakeType: sakes.type,
        isLimited: sakes.isLimited,
        paidTastingPrice: sakes.paidTastingPrice,
        category: sakes.category,
        breweryId: breweries.breweryId,
        breweryName: breweries.name,
        createdAt: bookmarks.createdAt,
      })
      .from(bookmarks)
      .innerJoin(sakes, eq(bookmarks.sakeId, sakes.sakeId))
      .innerJoin(breweries, eq(sakes.breweryId, breweries.breweryId))
      .where(eq(bookmarks.userId, userId))
      .orderBy(bookmarks.createdAt);

    return c.json(
      result.map((row) => ({
        bookmarkId: row.bookmarkId,
        sake: {
          sakeId: row.sakeId,
          name: row.sakeName,
          type: row.sakeType,
          isLimited: row.isLimited,
          paidTastingPrice: row.paidTastingPrice,
          category: row.category,
        },
        brewery: {
          breweryId: row.breweryId,
          name: row.breweryName,
        },
        createdAt: row.createdAt,
      })),
    );
  })
  // POST /api/bookmarks - ブックマーク追加
  .post('/', async (c) => {
    const db = c.var.db;
    const userId = c.req.header('X-User-Id');

    if (!userId) {
      return c.json({ error: 'ユーザーIDが必要です' }, 401);
    }

    const body = await c.req.json();
    const { sakeId } = body;

    if (!sakeId || typeof sakeId !== 'number') {
      return c.json({ error: 'お酒IDが必要です' }, 400);
    }

    await findUserOrThrow(db, userId);

    // 重複チェック
    const existing = await db.query.bookmarks.findFirst({
      where: and(eq(bookmarks.userId, userId), eq(bookmarks.sakeId, sakeId)),
    });

    if (existing) {
      return c.json({ error: '既にブックマークしています' }, 409);
    }

    const [newBookmark] = await db.insert(bookmarks).values({ userId, sakeId }).returning();

    return c.json({ bookmarkId: newBookmark.bookmarkId, sakeId: newBookmark.sakeId }, 201);
  })
  // DELETE /api/bookmarks/:sakeId - ブックマーク削除
  .delete('/:sakeId', async (c) => {
    const db = c.var.db;
    const userId = c.req.header('X-User-Id');
    const sakeId = parseInt(c.req.param('sakeId'), 10);

    if (!userId) {
      return c.json({ error: 'ユーザーIDが必要です' }, 401);
    }

    if (isNaN(sakeId)) {
      return c.json({ error: '無効なお酒IDです' }, 400);
    }

    const existing = await db.query.bookmarks.findFirst({
      where: and(eq(bookmarks.userId, userId), eq(bookmarks.sakeId, sakeId)),
    });

    if (!existing) {
      return c.json({ error: 'ブックマークが見つかりません' }, 404);
    }

    await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.sakeId, sakeId)));

    return c.json({ success: true });
  });

export default app;
