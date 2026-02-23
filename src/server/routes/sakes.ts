import { Hono } from 'hono';
import { eq, desc, sql, and, gt, like } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import * as schema from '../db/schema';
import { getCloudflareEnv } from '@/lib/db';
import { sendReviewNotification } from '../services/discord';
import { findUserOrThrow, findSakeOrThrow } from '../helpers/validation';
import { VALID_TAGS } from '../constants';
import type { AppEnv } from '../types';

// リクエストボディのバリデーションスキーマ
const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5, '評価は1-5の範囲で指定してください'),
  tags: z.array(z.string()).default([]),
  comment: z.string().optional(),
});

const app = new Hono<AppEnv>()
  // GET /api/sakes - 酒検索
  .get('/', async (c) => {
    const db = c.var.db;

    const q = c.req.query('q');
    const category = c.req.query('category');
    const isLimited = c.req.query('isLimited');
    const hasPaidTasting = c.req.query('hasPaidTasting');
    const cursor = c.req.query('cursor');
    const limitParam = c.req.query('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 30;

    const conditions = [];

    // テキスト検索（酒名 or 酒蔵名）
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        sql`(${like(schema.sakes.name, pattern)} OR ${like(schema.breweries.name, pattern)})`,
      );
    }

    // カテゴリフィルタ
    if (category) {
      conditions.push(eq(schema.sakes.category, category));
    }

    // 限定品フィルタ
    if (isLimited === 'true') {
      conditions.push(eq(schema.sakes.isLimited, true));
    }

    // 有料試飲フィルタ
    if (hasPaidTasting === 'true') {
      conditions.push(sql`${schema.sakes.paidTastingPrice} IS NOT NULL`);
    }

    // カーソルベースのページネーション（sakeId昇順）
    if (cursor) {
      const cursorId = parseInt(cursor, 10);
      if (!isNaN(cursorId)) {
        conditions.push(gt(schema.sakes.sakeId, cursorId));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        sakeId: schema.sakes.sakeId,
        name: schema.sakes.name,
        type: schema.sakes.type,
        category: schema.sakes.category,
        isLimited: schema.sakes.isLimited,
        paidTastingPrice: schema.sakes.paidTastingPrice,
        breweryId: schema.breweries.breweryId,
        breweryName: schema.breweries.name,
      })
      .from(schema.sakes)
      .innerJoin(schema.breweries, eq(schema.sakes.breweryId, schema.breweries.breweryId))
      .where(whereClause)
      .orderBy(schema.sakes.sakeId)
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore && items.length > 0 ? String(items[items.length - 1].sakeId) : null;

    return c.json({
      items: items.map((row) => ({
        sakeId: row.sakeId,
        name: row.name,
        type: row.type,
        category: row.category,
        isLimited: row.isLimited,
        paidTastingPrice: row.paidTastingPrice,
        brewery: {
          breweryId: row.breweryId,
          name: row.breweryName,
        },
      })),
      nextCursor,
    });
  })
  // GET /api/sakes/:id - お酒詳細
  .get('/:id', async (c) => {
    const db = c.var.db;
    const sakeId = parseInt(c.req.param('id'));

    if (isNaN(sakeId)) {
      return c.json({ error: '無効なお酒IDです' }, 400);
    }

    const sake = await findSakeOrThrow(db, sakeId);

    // レビュー一覧を取得（新しい順、ユーザー名を含める）
    const reviewsData = await db
      .select({
        reviewId: schema.reviews.reviewId,
        rating: schema.reviews.rating,
        tags: schema.reviews.tags,
        comment: schema.reviews.comment,
        createdAt: schema.reviews.createdAt,
        userName: schema.users.name,
        userId: schema.users.userId,
      })
      .from(schema.reviews)
      .innerJoin(schema.users, eq(schema.reviews.userId, schema.users.userId))
      .where(eq(schema.reviews.sakeId, sakeId))
      .orderBy(desc(schema.reviews.createdAt));

    // 平均評価を計算
    const avgRatingResult = await db
      .select({
        avgRating: sql<number>`CAST(AVG(${schema.reviews.rating}) AS REAL)`,
      })
      .from(schema.reviews)
      .where(eq(schema.reviews.sakeId, sakeId));

    const avgRating = reviewsData.length > 0 ? (avgRatingResult[0]?.avgRating ?? null) : null;

    // レスポンス（camelCaseに変換）
    return c.json({
      id: sake.sakeId,
      breweryId: sake.breweryId,
      name: sake.name,
      type: sake.type,
      isCustom: sake.isCustom,
      addedBy: sake.addedBy,
      createdAt: sake.createdAt,
      avgRating,
      reviews: reviewsData.map((r) => ({
        id: r.reviewId,
        rating: r.rating,
        tags: r.tags,
        comment: r.comment,
        createdAt: r.createdAt,
        user: {
          id: r.userId,
          name: r.userName,
        },
      })),
    });
  })
  // POST /api/sakes/:id/reviews - レビュー投稿
  .post('/:id/reviews', zValidator('json', createReviewSchema), async (c) => {
    const db = c.var.db;
    const sakeId = parseInt(c.req.param('id'));
    const userId = c.req.header('X-User-Id');

    if (isNaN(sakeId)) {
      return c.json({ error: '無効なお酒IDです' }, 400);
    }

    if (!userId) {
      return c.json({ error: 'ユーザーIDが指定されていません' }, 401);
    }

    const { rating, tags, comment } = c.req.valid('json');

    // タグのバリデーション
    const invalidTags = tags.filter((tag) => !VALID_TAGS.includes(tag));
    if (invalidTags.length > 0) {
      return c.json({ error: `無効なタグが含まれています: ${invalidTags.join(', ')}` }, 400);
    }

    const user = await findUserOrThrow(db, userId);

    // お酒と酒蔵情報を取得（通知用に酒蔵名とIDも必要）
    const sakeWithBrewery = await db
      .select({
        sakeId: schema.sakes.sakeId,
        name: schema.sakes.name,
        type: schema.sakes.type,
        isLimited: schema.sakes.isLimited,
        paidTastingPrice: schema.sakes.paidTastingPrice,
        breweryName: schema.breweries.name,
        breweryId: schema.breweries.breweryId,
      })
      .from(schema.sakes)
      .innerJoin(schema.breweries, eq(schema.sakes.breweryId, schema.breweries.breweryId))
      .where(eq(schema.sakes.sakeId, sakeId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!sakeWithBrewery) {
      return c.json({ error: 'お酒が見つかりません' }, 404);
    }

    // レビュー作成
    const newReview = await db
      .insert(schema.reviews)
      .values({
        userId,
        sakeId,
        rating,
        tags,
        comment: comment || null,
      })
      .returning();

    if (!newReview[0]) {
      return c.json({ error: 'レビューの作成に失敗しました' }, 500);
    }

    // Discord通知（非同期）
    const env = await getCloudflareEnv();
    const webhookUrl = env.DISCORD_WEBHOOK_URL;
    const baseUrl = env.BASE_URL;
    if (webhookUrl) {
      const notificationData = {
        sakeName: sakeWithBrewery.name,
        sakeType: sakeWithBrewery.type,
        isLimited: sakeWithBrewery.isLimited,
        paidTastingPrice: sakeWithBrewery.paidTastingPrice,
        breweryName: sakeWithBrewery.breweryName || '不明',
        breweryId: sakeWithBrewery.breweryId,
        rating,
        tags,
        comment,
        userName: user.name,
      };

      await sendReviewNotification(notificationData, webhookUrl, baseUrl);
    }

    return c.json(
      {
        id: newReview[0].reviewId,
        userId: newReview[0].userId,
        sakeId: newReview[0].sakeId,
        rating: newReview[0].rating,
        tags: newReview[0].tags,
        comment: newReview[0].comment,
        createdAt: newReview[0].createdAt,
      },
      201,
    );
  })
  // PUT /api/sakes/:id/reviews/:reviewId - レビュー編集
  .put(
    '/:id/reviews/:reviewId',
    zValidator('json', createReviewSchema),
    async (c) => {
      const db = c.var.db;
      const sakeId = parseInt(c.req.param('id'));
      const reviewId = parseInt(c.req.param('reviewId'));
      const userId = c.req.header('X-User-Id');

      if (isNaN(sakeId) || isNaN(reviewId)) {
        return c.json({ error: '無効なIDです' }, 400);
      }

      if (!userId) {
        return c.json({ error: 'ユーザーIDが指定されていません' }, 401);
      }

      // レビューの存在確認と所有者確認
      const review = await db.query.reviews.findFirst({
        where: and(eq(schema.reviews.reviewId, reviewId), eq(schema.reviews.sakeId, sakeId)),
      });

      if (!review) {
        return c.json({ error: 'レビューが見つかりません' }, 404);
      }

      if (review.userId !== userId) {
        return c.json({ error: '自分のレビューのみ編集できます' }, 403);
      }

      const { rating, tags, comment } = c.req.valid('json');

      const invalidTags = tags.filter((tag) => !VALID_TAGS.includes(tag));
      if (invalidTags.length > 0) {
        return c.json({ error: `無効なタグが含まれています: ${invalidTags.join(', ')}` }, 400);
      }

      const [updated] = await db
        .update(schema.reviews)
        .set({ rating, tags, comment: comment || null })
        .where(eq(schema.reviews.reviewId, reviewId))
        .returning();

      return c.json({
        id: updated.reviewId,
        rating: updated.rating,
        tags: updated.tags,
        comment: updated.comment,
        createdAt: updated.createdAt,
      });
    },
  )
  // DELETE /api/sakes/:id/reviews/:reviewId - レビュー削除
  .delete('/:id/reviews/:reviewId', async (c) => {
    const db = c.var.db;
    const sakeId = parseInt(c.req.param('id'));
    const reviewId = parseInt(c.req.param('reviewId'));
    const userId = c.req.header('X-User-Id');

    if (isNaN(sakeId) || isNaN(reviewId)) {
      return c.json({ error: '無効なIDです' }, 400);
    }

    if (!userId) {
      return c.json({ error: 'ユーザーIDが指定されていません' }, 401);
    }

    const review = await db.query.reviews.findFirst({
      where: and(eq(schema.reviews.reviewId, reviewId), eq(schema.reviews.sakeId, sakeId)),
    });

    if (!review) {
      return c.json({ error: 'レビューが見つかりません' }, 404);
    }

    if (review.userId !== userId) {
      return c.json({ error: '自分のレビューのみ削除できます' }, 403);
    }

    await db.delete(schema.reviews).where(eq(schema.reviews.reviewId, reviewId));

    return c.json({ success: true });
  })
  // PUT /api/sakes/:id - お酒編集
  .put(
    '/:id',
    zValidator(
      'json',
      z.object({
        name: z.string().trim().min(1, 'お酒の名前を入力してください'),
        type: z.string().trim().optional(),
        isLimited: z.boolean().optional(),
        paidTastingPrice: z
          .number()
          .int()
          .positive('有料試飲価格は正の整数で入力してください')
          .optional(),
        category: z.enum(['清酒', 'リキュール', 'みりん', 'その他']).optional(),
      }),
    ),
    async (c) => {
      const db = c.var.db;
      const sakeId = parseInt(c.req.param('id'));
      const userId = c.req.header('X-User-Id');

      if (isNaN(sakeId)) {
        return c.json({ error: '無効なお酒IDです' }, 400);
      }

      if (!userId) {
        return c.json({ error: 'ユーザーIDが指定されていません' }, 401);
      }

      // お酒の存在確認
      const sake = await findSakeOrThrow(db, sakeId);

      const { name, type, isLimited, paidTastingPrice, category } = c.req.valid('json');

      // お酒を更新
      const [updated] = await db
        .update(schema.sakes)
        .set({
          name,
          type: type || null,
          isLimited: isLimited ?? sake.isLimited,
          paidTastingPrice: paidTastingPrice ?? sake.paidTastingPrice,
          category: category ?? sake.category,
        })
        .where(eq(schema.sakes.sakeId, sakeId))
        .returning();

      return c.json({
        sakeId: updated.sakeId,
        breweryId: updated.breweryId,
        name: updated.name,
        type: updated.type,
        isCustom: updated.isCustom,
        addedBy: updated.addedBy,
        isLimited: updated.isLimited,
        paidTastingPrice: updated.paidTastingPrice,
        category: updated.category,
        createdAt: updated.createdAt,
      });
    },
  );

export default app;
