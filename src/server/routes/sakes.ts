import { Hono } from 'hono';
import { eq, desc, sql, and } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '../db/schema';
import { getCloudflareEnv } from '@/lib/db';
import { sendReviewNotification } from '../services/discord';
import { findUserOrThrow, findSakeOrThrow } from '../helpers/validation';
import { VALID_TAGS } from '../constants';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

// リクエストボディのバリデーションスキーマ
const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5, '評価は1-5の範囲で指定してください'),
  tags: z.array(z.string()).default([]),
  comment: z.string().optional(),
});

// GET /api/sakes/:id - お酒詳細
app.get('/:id', async (c) => {
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
});

// POST /api/sakes/:id/reviews - レビュー投稿
app.post('/:id/reviews', async (c) => {
  const db = c.var.db;
  const sakeId = parseInt(c.req.param('id'));
  const userId = c.req.header('X-User-Id');

  if (isNaN(sakeId)) {
    return c.json({ error: '無効なお酒IDです' }, 400);
  }

  if (!userId) {
    return c.json({ error: 'ユーザーIDが指定されていません' }, 401);
  }

  const body = await c.req.json();

  // バリデーション
  const parseResult = createReviewSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.issues[0].message }, 400);
  }

  const { rating, tags, comment } = parseResult.data;

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
});

// PUT /api/sakes/:id/reviews/:reviewId - レビュー編集
app.put('/:id/reviews/:reviewId', async (c) => {
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

  const body = await c.req.json();
  const parseResult = createReviewSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.issues[0].message }, 400);
  }

  const { rating, tags, comment } = parseResult.data;

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
});

// DELETE /api/sakes/:id/reviews/:reviewId - レビュー削除
app.delete('/:id/reviews/:reviewId', async (c) => {
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
});

// PUT /api/sakes/:id - お酒編集
app.put('/:id', async (c) => {
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

  // is_customのお酒のみ編集可能
  if (!sake.isCustom) {
    return c.json({ error: 'マスタデータのお酒は編集できません' }, 403);
  }

  // zodバリデーションスキーマ
  const updateSakeSchema = z.object({
    name: z.string().trim().min(1, 'お酒の名前を入力してください'),
    type: z.string().trim().optional(),
    isLimited: z.boolean().optional(),
    paidTastingPrice: z
      .number()
      .int()
      .positive('有料試飲価格は正の整数で入力してください')
      .optional(),
    category: z.enum(['清酒', 'リキュール', 'みりん', 'その他']).optional(),
  });

  // リクエストボディの検証
  const body = await c.req.json();
  const validationResult = updateSakeSchema.safeParse(body);

  if (!validationResult.success) {
    const errorMessages = validationResult.error.issues.map((e) => e.message).join(', ');
    return c.json({ error: errorMessages }, 400);
  }

  const { name, type, isLimited, paidTastingPrice, category } = validationResult.data;

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
});

export default app;
