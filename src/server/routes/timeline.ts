import { Hono } from 'hono';
import { desc, eq, lt } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

type TimelineItem = {
  type: 'review' | 'brewery_note';
  id: number;
  userName: string;
  createdAt: string;
  breweryId: number;
  sakeName?: string;
  breweryName?: string;
  rating?: number;
  tags?: string[];
  comment?: string;
  content?: string;
  isLimited?: boolean;
  paidTastingPrice?: number;
};

// GET /api/timeline - cursor-basedページネーション対応のタイムライン取得
app.get('/', async (c) => {
  const db = c.var.db;

  // クエリパラメータから cursor と limit を取得
  const cursor = c.req.query('cursor'); // createdAt の値
  const limitParam = c.req.query('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  // limit + 1 件取得して、次のページがあるか判定
  const fetchLimit = limit + 1;

  // レビュー取得（JOIN: users, sakes, breweries）
  const reviewsData = await db
    .select({
      reviewId: schema.reviews.reviewId,
      userName: schema.users.name,
      createdAt: schema.reviews.createdAt,
      breweryId: schema.breweries.breweryId,
      sakeName: schema.sakes.name,
      breweryName: schema.breweries.name,
      rating: schema.reviews.rating,
      tags: schema.reviews.tags,
      comment: schema.reviews.comment,
      isLimited: schema.sakes.isLimited,
      paidTastingPrice: schema.sakes.paidTastingPrice,
    })
    .from(schema.reviews)
    .innerJoin(schema.users, eq(schema.users.userId, schema.reviews.userId))
    .innerJoin(schema.sakes, eq(schema.sakes.sakeId, schema.reviews.sakeId))
    .innerJoin(schema.breweries, eq(schema.breweries.breweryId, schema.sakes.breweryId))
    .where(cursor ? lt(schema.reviews.createdAt, cursor) : undefined)
    .orderBy(desc(schema.reviews.createdAt))
    .limit(fetchLimit);

  // 酒蔵ノート取得（JOIN: users, breweries）
  const notesData = await db
    .select({
      noteId: schema.breweryNotes.noteId,
      userName: schema.users.name,
      createdAt: schema.breweryNotes.createdAt,
      breweryId: schema.breweries.breweryId,
      breweryName: schema.breweries.name,
      content: schema.breweryNotes.comment,
    })
    .from(schema.breweryNotes)
    .innerJoin(schema.users, eq(schema.users.userId, schema.breweryNotes.userId))
    .innerJoin(schema.breweries, eq(schema.breweries.breweryId, schema.breweryNotes.breweryId))
    .where(cursor ? lt(schema.breweryNotes.createdAt, cursor) : undefined)
    .orderBy(desc(schema.breweryNotes.createdAt))
    .limit(fetchLimit);

  // タイムラインアイテムに変換
  const reviewItems: TimelineItem[] = reviewsData.map((review) => ({
    type: 'review' as const,
    id: review.reviewId,
    userName: review.userName,
    createdAt: review.createdAt,
    breweryId: review.breweryId,
    sakeName: review.sakeName,
    breweryName: review.breweryName,
    rating: review.rating,
    tags: review.tags ?? [],
    comment: review.comment ?? undefined,
    isLimited: review.isLimited,
    paidTastingPrice: review.paidTastingPrice ?? undefined,
  }));

  const noteItems: TimelineItem[] = notesData.map((note) => ({
    type: 'brewery_note' as const,
    id: note.noteId,
    userName: note.userName,
    createdAt: note.createdAt,
    breweryId: note.breweryId,
    breweryName: note.breweryName,
    content: note.content,
  }));

  // マージして作成日時の新しい順にソート
  const allItems = [...reviewItems, ...noteItems].sort((a, b) => {
    return b.createdAt.localeCompare(a.createdAt);
  });

  // limit + 1 件取得した場合、最後の1件があれば次のページがある
  const hasMore = allItems.length > limit;
  const items = hasMore ? allItems.slice(0, limit) : allItems;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].createdAt : null;

  return c.json({ items, nextCursor });
});

export default app;
