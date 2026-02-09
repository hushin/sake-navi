import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { desc, and, sql, lt } from 'drizzle-orm';
import type { AppEnv } from '../types';
import { reviews, users, sakes, breweries } from '../db/schema';

const app = new Hono<AppEnv>();

/**
 * GET /api/reviews - レビュー検索
 * クエリパラメータ:
 * - sort: 'rating' | 'latest'（デフォルト: 'latest'）
 * - tags: カンマ区切りのタグ（例: "甘口,辛口"）
 * - userId: ユーザーID
 * - cursor: createdAt値（ページネーション用）
 * - limit: 件数（デフォルト: 20）
 */
app.get('/', async (c) => {
  const db = c.get('db');

  // クエリパラメータを取得
  const sortParam = c.req.query('sort') || 'latest';
  const tagsParam = c.req.query('tags');
  const userIdParam = c.req.query('userId');
  const cursor = c.req.query('cursor');
  const limitParam = c.req.query('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  // ソート順の検証
  if (sortParam !== 'rating' && sortParam !== 'latest') {
    throw new HTTPException(400, { message: 'sortは"rating"または"latest"を指定してください' });
  }

  // タグフィルタのパース
  const tagFilters = tagsParam
    ? tagsParam
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // WHERE条件を構築
  const conditions = [];

  // カーソルベースのページネーション（createdAtベース）
  if (cursor) {
    conditions.push(lt(reviews.createdAt, cursor));
  }

  // ユーザーフィルタ
  if (userIdParam) {
    conditions.push(sql`${reviews.userId} = ${userIdParam}`);
  }

  // タグフィルタ（すべてのタグが含まれている必要がある）
  if (tagFilters.length > 0) {
    const tagConditions = tagFilters.map((tag) => {
      // JSON配列内に特定のタグが含まれているかチェック
      // SQLiteのjson_each関数を使用
      return sql`EXISTS (
        SELECT 1 FROM json_each(${reviews.tags})
        WHERE json_each.value = ${tag}
      )`;
    });
    conditions.push(and(...tagConditions));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // ソート順を決定
  const orderByClause =
    sortParam === 'rating'
      ? [desc(reviews.rating), desc(reviews.createdAt)] // 評価高い順、同率なら新しい順
      : [desc(reviews.createdAt)]; // 新しい順

  // レビューを取得（JOINでユーザー、お酒、酒蔵情報を取得）
  const results = await db
    .select({
      reviewId: reviews.reviewId,
      rating: reviews.rating,
      tags: reviews.tags,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      userId: users.userId,
      userName: users.name,
      sakeId: sakes.sakeId,
      sakeName: sakes.name,
      sakeType: sakes.type,
      breweryId: breweries.breweryId,
      breweryName: breweries.name,
    })
    .from(reviews)
    .innerJoin(users, sql`${reviews.userId} = ${users.userId}`)
    .innerJoin(sakes, sql`${reviews.sakeId} = ${sakes.sakeId}`)
    .innerJoin(breweries, sql`${sakes.breweryId} = ${breweries.breweryId}`)
    .where(whereClause)
    .orderBy(...orderByClause)
    .limit(limit + 1); // +1で次ページの有無を判定

  // 次のカーソルを決定
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].createdAt : null;

  // レスポンス形式に整形
  const reviewItems = items.map((row) => ({
    reviewId: row.reviewId,
    rating: row.rating,
    tags: (row.tags || []) as string[],
    comment: row.comment,
    createdAt: row.createdAt,
    user: {
      id: row.userId,
      name: row.userName,
    },
    sake: {
      id: row.sakeId,
      name: row.sakeName,
      type: row.sakeType,
    },
    brewery: {
      id: row.breweryId,
      name: row.breweryName,
    },
  }));

  return c.json({
    items: reviewItems,
    nextCursor,
  });
});

export default app;
