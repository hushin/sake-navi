import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import type { ReviewInput } from '@/shared/schemas/sake';
import type { Db } from '../db';
import { breweries, reviews, sakes, user } from '../db/schema';

export type Review = {
  id: string;
  userId: string;
  sakeId: number;
  rating: number;
  tags: string[];
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewWithUser = Review & {
  userName: string;
  userImage: string | null;
};

const reviewColumns = {
  id: reviews.id,
  userId: reviews.userId,
  sakeId: reviews.sakeId,
  rating: reviews.rating,
  tags: reviews.tags,
  comment: reviews.comment,
  createdAt: reviews.createdAt,
  updatedAt: reviews.updatedAt,
};

/** 新しい順。同日時の並びを安定させるため id も降順で見る */
export async function listReviewsForSake(db: Db, sakeId: number): Promise<ReviewWithUser[]> {
  return db
    .select({
      ...reviewColumns,
      // アプリ内の表示名はニックネームを優先する
      userName: sql<string>`coalesce(${user.nickname}, ${user.name})`,
      userImage: user.image,
    })
    .from(reviews)
    .innerJoin(user, eq(user.id, reviews.userId))
    .where(eq(reviews.sakeId, sakeId))
    .orderBy(desc(reviews.createdAt), desc(reviews.id));
}

export async function findReviewById(db: Db, reviewId: string): Promise<Review | null> {
  const [row] = await db.select(reviewColumns).from(reviews).where(eq(reviews.id, reviewId));
  return row ?? null;
}

export async function findReviewByUserAndSake(
  db: Db,
  userId: string,
  sakeId: number,
): Promise<Review | null> {
  const [row] = await db
    .select(reviewColumns)
    .from(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.sakeId, sakeId)));
  return row ?? null;
}

/** すでに同じ銘柄をレビュー済みなら null を返す（UNIQUE 制約違反を 500 にしない） */
export async function insertReview(
  db: Db,
  userId: string,
  sakeId: number,
  input: ReviewInput,
): Promise<Review | null> {
  const rows = await db
    .insert(reviews)
    .values({
      userId,
      sakeId,
      rating: input.rating,
      tags: input.tags,
      comment: input.comment ?? null,
    })
    .onConflictDoNothing()
    .returning();

  return rows[0] ?? null;
}

export async function updateReview(
  db: Db,
  reviewId: string,
  input: ReviewInput,
): Promise<Review | null> {
  const rows = await db
    .update(reviews)
    .set({
      rating: input.rating,
      tags: input.tags,
      comment: input.comment ?? null,
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, reviewId))
    .returning();

  return rows[0] ?? null;
}

export async function deleteReview(db: Db, reviewId: string): Promise<boolean> {
  const rows = await db.delete(reviews).where(eq(reviews.id, reviewId)).returning();
  return rows.length > 0;
}

export type TimelineItem = {
  id: string;
  rating: number;
  tags: string[];
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; image: string | null };
  sake: { id: number; name: string };
  brewery: { id: number; name: string };
};

/**
 * 複合カーソル。`created_at` はミリ秒精度だが、同一ミリ秒の投稿を取りこぼさないよう
 * id を第 2 キーにした `<epoch ミリ秒>_<review id>` を使う。
 */
function encodeTimelineCursor(item: { createdAt: Date; id: string }): string {
  return `${item.createdAt.getTime()}_${item.id}`;
}

function parseTimelineCursor(cursor: string): { createdAt: Date; id: string } | null {
  const separator = cursor.indexOf('_');
  if (separator <= 0) {
    return null;
  }

  const milliseconds = Number(cursor.slice(0, separator));
  const id = cursor.slice(separator + 1);
  if (!Number.isInteger(milliseconds) || id.length === 0) {
    return null;
  }

  return { createdAt: new Date(milliseconds), id };
}

/** 新着レビューの一覧（タイムライン）。古い方へ向かって辿る */
export async function listTimeline(
  db: Db,
  params: { cursor?: string; limit: number },
): Promise<{ items: TimelineItem[]; nextCursor: string | null }> {
  const cursor = params.cursor ? parseTimelineCursor(params.cursor) : null;
  const condition = cursor
    ? or(
        lt(reviews.createdAt, cursor.createdAt),
        and(eq(reviews.createdAt, cursor.createdAt), lt(reviews.id, cursor.id)),
      )
    : undefined;

  const rows = await db
    .select({
      ...reviewColumns,
      userId: reviews.userId,
      userName: sql<string>`coalesce(${user.nickname}, ${user.name})`,
      userImage: user.image,
      sakeId: sakes.id,
      sakeName: sakes.name,
      breweryId: breweries.id,
      breweryName: breweries.name,
    })
    .from(reviews)
    .innerJoin(user, eq(user.id, reviews.userId))
    .innerJoin(sakes, eq(sakes.id, reviews.sakeId))
    .innerJoin(breweries, eq(breweries.id, sakes.breweryId))
    .where(condition)
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(params.limit + 1);

  const page = rows.slice(0, params.limit);
  const items: TimelineItem[] = page.map((row) => ({
    id: row.id,
    rating: row.rating,
    tags: row.tags,
    comment: row.comment,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: { id: row.userId, name: row.userName, image: row.userImage },
    sake: { id: row.sakeId, name: row.sakeName },
    brewery: { id: row.breweryId, name: row.breweryName },
  }));

  const last = page.at(-1);
  const nextCursor = rows.length > params.limit && last ? encodeTimelineCursor(last) : null;

  return { items, nextCursor };
}
