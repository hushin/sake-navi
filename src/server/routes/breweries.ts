import { Hono } from 'hono';
import { eq, sql, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { breweries, sakes, reviews, breweryNotes } from '../db/schema';
import { getCloudflareEnv } from '@/lib/db';
import { sendBreweryNoteNotification } from '../services/discord';
import { findUserOrThrow, findBreweryOrThrow } from '../helpers/validation';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

// GET /api/breweries - 酒蔵一覧（マップ表示用）
app.get('/', async (c) => {
  const db = c.var.db;
  const userId = c.req.header('X-User-Id');

  // 各酒蔵の平均評価を計算するため、LEFT JOIN を使用
  const result = await db
    .select({
      breweryId: breweries.breweryId,
      name: breweries.name,
      mapPositionX: breweries.mapPositionX,
      mapPositionY: breweries.mapPositionY,
      averageRating: sql<
        number | null
      >`AVG(CASE WHEN ${reviews.rating} IS NOT NULL THEN CAST(${reviews.rating} AS REAL) ELSE NULL END)`,
    })
    .from(breweries)
    .leftJoin(sakes, eq(sakes.breweryId, breweries.breweryId))
    .leftJoin(reviews, eq(reviews.sakeId, sakes.sakeId))
    .groupBy(breweries.breweryId, breweries.name, breweries.mapPositionX, breweries.mapPositionY);

  // ユーザーがログインしている場合、レビュー済みの酒蔵を判定
  let userReviewedBreweryIds = new Set<number>();
  if (userId) {
    const userReviews = await db
      .select({
        breweryId: sakes.breweryId,
      })
      .from(reviews)
      .innerJoin(sakes, eq(reviews.sakeId, sakes.sakeId))
      .where(eq(reviews.userId, userId))
      .groupBy(sakes.breweryId);

    userReviewedBreweryIds = new Set(userReviews.map((r) => r.breweryId));
  }

  return c.json(
    result.map((row) => ({
      breweryId: row.breweryId,
      name: row.name,
      mapPositionX: row.mapPositionX,
      mapPositionY: row.mapPositionY,
      averageRating: row.averageRating ?? null,
      hasUserReviewed: userReviewedBreweryIds.has(row.breweryId),
    })),
  );
});

// GET /api/breweries/:id - 酒蔵詳細
app.get('/:id', async (c) => {
  const db = c.var.db;
  const breweryId = parseInt(c.req.param('id'), 10);

  if (isNaN(breweryId)) {
    return c.json({ error: '無効な酒蔵IDです' }, 400);
  }

  const brewery = await findBreweryOrThrow(db, breweryId);

  // 出品酒一覧と各酒のレビューを取得
  const sakesData = await db.query.sakes.findMany({
    where: eq(sakes.breweryId, breweryId),
    with: {
      reviews: {
        with: {
          user: true,
        },
        orderBy: [desc(reviews.createdAt)],
      },
    },
  });

  // 各お酒の平均評価を計算
  const sakesWithReviews = sakesData.map((sake) => {
    const avgRating =
      sake.reviews.length > 0
        ? sake.reviews.reduce((sum, r) => sum + r.rating, 0) / sake.reviews.length
        : null;

    return {
      sakeId: sake.sakeId,
      name: sake.name,
      type: sake.type,
      isCustom: sake.isCustom,
      addedBy: sake.addedBy,
      isLimited: sake.isLimited,
      paidTastingPrice: sake.paidTastingPrice,
      category: sake.category,
      createdAt: sake.createdAt,
      averageRating: avgRating,
      reviews: sake.reviews.map((r) => ({
        id: r.reviewId,
        rating: r.rating,
        tags: r.tags,
        comment: r.comment,
        createdAt: r.createdAt,
        user: {
          id: r.user.userId,
          name: r.user.name,
        },
      })),
    };
  });

  return c.json({
    brewery: {
      breweryId: brewery.breweryId,
      name: brewery.name,
      mapPositionX: brewery.mapPositionX,
      mapPositionY: brewery.mapPositionY,
      area: brewery.area,
    },
    sakes: sakesWithReviews,
  });
});

// GET /api/breweries/:id/notes - 酒蔵ノート一覧
app.get('/:id/notes', async (c) => {
  const db = c.var.db;
  const breweryId = parseInt(c.req.param('id'), 10);

  if (isNaN(breweryId)) {
    return c.json({ error: '無効な酒蔵IDです' }, 400);
  }

  await findBreweryOrThrow(db, breweryId);

  // ノート一覧を新しい順に取得（ユーザー情報も含む）
  const notes = await db.query.breweryNotes.findMany({
    where: eq(breweryNotes.breweryId, breweryId),
    orderBy: [desc(breweryNotes.createdAt)],
    with: {
      user: true,
    },
  });

  return c.json(
    notes.map((note) => ({
      noteId: note.noteId,
      userId: note.userId,
      userName: note.user.name,
      breweryId: note.breweryId,
      comment: note.comment,
      createdAt: note.createdAt,
    })),
  );
});

// POST /api/breweries/:id/notes - 酒蔵ノート投稿
app.post('/:id/notes', async (c) => {
  const db = c.var.db;
  const breweryId = parseInt(c.req.param('id'), 10);
  const userId = c.req.header('X-User-Id');

  if (isNaN(breweryId)) {
    return c.json({ error: '無効な酒蔵IDです' }, 400);
  }

  if (!userId) {
    return c.json({ error: 'ユーザーIDが必要です' }, 401);
  }

  // リクエストボディの検証
  const body = await c.req.json();
  const { content } = body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return c.json({ error: 'コメントを入力してください' }, 400);
  }

  const brewery = await findBreweryOrThrow(db, breweryId);
  const user = await findUserOrThrow(db, userId);

  // ノートを作成
  const [newNote] = await db
    .insert(breweryNotes)
    .values({
      userId,
      breweryId,
      comment: content.trim(),
    })
    .returning();

  // Discord通知を送信（非同期）
  const env = await getCloudflareEnv();
  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  const baseUrl = env.BASE_URL;
  if (webhookUrl) {
    const notificationData = {
      breweryName: brewery.name,
      breweryId: brewery.breweryId,
      comment: content.trim(),
      userName: user.name,
    };

    await sendBreweryNoteNotification(notificationData, webhookUrl, baseUrl);
  }

  return c.json(
    {
      noteId: newNote.noteId,
      userId: newNote.userId,
      userName: user.name,
      breweryId: newNote.breweryId,
      comment: newNote.comment,
      createdAt: newNote.createdAt,
    },
    201,
  );
});

// PUT /api/breweries/:id/notes/:noteId - 酒蔵ノート編集
app.put('/:id/notes/:noteId', async (c) => {
  const db = c.var.db;
  const breweryId = parseInt(c.req.param('id'), 10);
  const noteId = parseInt(c.req.param('noteId'), 10);
  const userId = c.req.header('X-User-Id');

  if (isNaN(breweryId) || isNaN(noteId)) {
    return c.json({ error: '無効なIDです' }, 400);
  }

  if (!userId) {
    return c.json({ error: 'ユーザーIDが必要です' }, 401);
  }

  const note = await db.query.breweryNotes.findFirst({
    where: and(eq(breweryNotes.noteId, noteId), eq(breweryNotes.breweryId, breweryId)),
  });

  if (!note) {
    return c.json({ error: 'ノートが見つかりません' }, 404);
  }

  if (note.userId !== userId) {
    return c.json({ error: '自分のノートのみ編集できます' }, 403);
  }

  const body = await c.req.json();
  const { content } = body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return c.json({ error: 'コメントを入力してください' }, 400);
  }

  const [updated] = await db
    .update(breweryNotes)
    .set({ comment: content.trim() })
    .where(eq(breweryNotes.noteId, noteId))
    .returning();

  const user = await findUserOrThrow(db, userId);

  return c.json({
    noteId: updated.noteId,
    userId: updated.userId,
    userName: user.name,
    breweryId: updated.breweryId,
    comment: updated.comment,
    createdAt: updated.createdAt,
  });
});

// DELETE /api/breweries/:id/notes/:noteId - 酒蔵ノート削除
app.delete('/:id/notes/:noteId', async (c) => {
  const db = c.var.db;
  const breweryId = parseInt(c.req.param('id'), 10);
  const noteId = parseInt(c.req.param('noteId'), 10);
  const userId = c.req.header('X-User-Id');

  if (isNaN(breweryId) || isNaN(noteId)) {
    return c.json({ error: '無効なIDです' }, 400);
  }

  if (!userId) {
    return c.json({ error: 'ユーザーIDが必要です' }, 401);
  }

  const note = await db.query.breweryNotes.findFirst({
    where: and(eq(breweryNotes.noteId, noteId), eq(breweryNotes.breweryId, breweryId)),
  });

  if (!note) {
    return c.json({ error: 'ノートが見つかりません' }, 404);
  }

  if (note.userId !== userId) {
    return c.json({ error: '自分のノートのみ削除できます' }, 403);
  }

  await db.delete(breweryNotes).where(eq(breweryNotes.noteId, noteId));

  return c.json({ success: true });
});

// POST /api/breweries/:id/sakes - お酒追加（ユーザー自由入力）
app.post('/:id/sakes', async (c) => {
  const db = c.var.db;
  const breweryId = parseInt(c.req.param('id'), 10);
  const userId = c.req.header('X-User-Id');

  if (isNaN(breweryId)) {
    return c.json({ error: '無効な酒蔵IDです' }, 400);
  }

  if (!userId) {
    return c.json({ error: 'ユーザーIDが必要です' }, 401);
  }

  // zodバリデーションスキーマ
  const addSakeSchema = z.object({
    name: z.string().trim().min(1, 'お酒の名前を入力してください'),
    type: z.string().trim().optional(),
    isLimited: z.boolean().optional().default(false),
    paidTastingPrice: z
      .number()
      .int()
      .positive('有料試飲価格は正の整数で入力してください')
      .optional(),
    category: z.enum(['清酒', 'リキュール', 'みりん', 'その他']).optional().default('清酒'),
  });

  // リクエストボディの検証
  const body = await c.req.json();
  const validationResult = addSakeSchema.safeParse(body);

  if (!validationResult.success) {
    const errorMessages = validationResult.error.issues.map((e) => e.message).join(', ');
    return c.json({ error: errorMessages }, 400);
  }

  const { name, type, isLimited, paidTastingPrice, category } = validationResult.data;

  await findBreweryOrThrow(db, breweryId);
  await findUserOrThrow(db, userId);

  // お酒を追加（is_custom=true）
  const [newSake] = await db
    .insert(sakes)
    .values({
      breweryId,
      name,
      type: type || null,
      isCustom: true,
      addedBy: userId,
      isLimited,
      paidTastingPrice: paidTastingPrice || null,
      category,
    })
    .returning();

  return c.json(
    {
      sakeId: newSake.sakeId,
      breweryId: newSake.breweryId,
      name: newSake.name,
      type: newSake.type,
      isCustom: newSake.isCustom,
      addedBy: newSake.addedBy,
      isLimited: newSake.isLimited,
      paidTastingPrice: newSake.paidTastingPrice,
      category: newSake.category,
      createdAt: newSake.createdAt,
    },
    201,
  );
});

export default app;
