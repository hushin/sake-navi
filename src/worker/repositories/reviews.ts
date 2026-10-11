import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { parseReviewTags, type ReviewInput, type ReviewListQuery } from '@/shared/schemas/sake';
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

export type ReviewFeedItem = {
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

/** 一覧系（タイムライン・レビュー検索）で共通の選択列。user / sakes / breweries を join する */
const reviewFeedColumns = {
  ...reviewColumns,
  userName: sql<string>`coalesce(${user.nickname}, ${user.name})`,
  userImage: user.image,
  sakeName: sakes.name,
  breweryId: breweries.id,
  breweryName: breweries.name,
};

function reviewFeedQuery(db: Db) {
  return db
    .select(reviewFeedColumns)
    .from(reviews)
    .innerJoin(user, eq(user.id, reviews.userId))
    .innerJoin(sakes, eq(sakes.id, reviews.sakeId))
    .innerJoin(breweries, eq(breweries.id, sakes.breweryId));
}

type ReviewFeedRow = {
  id: string;
  userId: string;
  sakeId: number;
  rating: number;
  tags: string[];
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  userName: string;
  userImage: string | null;
  sakeName: string;
  breweryId: number;
  breweryName: string;
};

function toReviewFeedItem(row: ReviewFeedRow): ReviewFeedItem {
  return {
    id: row.id,
    rating: row.rating,
    tags: row.tags,
    comment: row.comment,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: { id: row.userId, name: row.userName, image: row.userImage },
    sake: { id: row.sakeId, name: row.sakeName },
    brewery: { id: row.breweryId, name: row.breweryName },
  };
}

/**
 * `created_at` はミリ秒精度だが、同一ミリ秒の投稿を取りこぼさないよう
 * id を第 2 キーにした `<epoch ミリ秒>_<review id>` を使う。
 */
function encodeLatestCursor(item: { createdAt: Date; id: string }): string {
  return `${item.createdAt.getTime()}_${item.id}`;
}

function parseLatestCursor(cursor: string): { createdAt: Date; id: string } | null {
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

function latestCursorCondition(cursor: { createdAt: Date; id: string }) {
  return or(
    lt(reviews.createdAt, cursor.createdAt),
    and(eq(reviews.createdAt, cursor.createdAt), lt(reviews.id, cursor.id)),
  );
}

/**
 * 評価順のカーソルは `rating DESC, created_at DESC, id DESC` に合わせた
 * `<rating>_<epoch ミリ秒>_<review id>`。旧実装は評価順でも created_at だけを見ていて
 * 2 ページ目以降が壊れていたので、ソートごとにカーソルの持ち方を変えている。
 */
function encodeRatingCursor(item: { rating: number; createdAt: Date; id: string }): string {
  return `${item.rating}_${item.createdAt.getTime()}_${item.id}`;
}

function parseRatingCursor(cursor: string): { rating: number; createdAt: Date; id: string } | null {
  const firstSeparator = cursor.indexOf('_');
  const secondSeparator = cursor.indexOf('_', firstSeparator + 1);
  if (firstSeparator <= 0 || secondSeparator <= firstSeparator + 1) {
    return null;
  }

  const rating = Number(cursor.slice(0, firstSeparator));
  const milliseconds = Number(cursor.slice(firstSeparator + 1, secondSeparator));
  const id = cursor.slice(secondSeparator + 1);
  if (!Number.isInteger(rating) || !Number.isInteger(milliseconds) || id.length === 0) {
    return null;
  }

  return { rating, createdAt: new Date(milliseconds), id };
}

function ratingCursorCondition(cursor: { rating: number; createdAt: Date; id: string }) {
  return or(
    lt(reviews.rating, cursor.rating),
    and(eq(reviews.rating, cursor.rating), lt(reviews.createdAt, cursor.createdAt)),
    and(
      eq(reviews.rating, cursor.rating),
      eq(reviews.createdAt, cursor.createdAt),
      lt(reviews.id, cursor.id),
    ),
  );
}

/** 新着レビューの一覧（タイムライン）。古い方へ向かって辿る */
export async function listTimeline(
  db: Db,
  params: { cursor?: string; limit: number },
): Promise<{ items: ReviewFeedItem[]; nextCursor: string | null }> {
  const cursor = params.cursor ? parseLatestCursor(params.cursor) : null;

  const rows = await reviewFeedQuery(db)
    .where(cursor ? latestCursorCondition(cursor) : undefined)
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(params.limit + 1);

  const page = rows.slice(0, params.limit);
  const last = page.at(-1);
  const nextCursor = rows.length > params.limit && last ? encodeLatestCursor(last) : null;

  return { items: page.map(toReviewFeedItem), nextCursor };
}

/**
 * 全レビューを横断して見る（並び替え・タグの AND 絞り込み・ユーザー絞り込み）。
 * 評価順の 2 ページ目以降も正しく辿れるよう、カーソルは並び順ごとに形式が違う。
 */
export async function listReviews(
  db: Db,
  query: ReviewListQuery,
): Promise<{ items: ReviewFeedItem[]; nextCursor: string | null }> {
  const conditions = [];

  // タグは AND（指定したタグをすべて含むレビューだけを返す）
  for (const tag of parseReviewTags(query.tags)) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM json_each(${reviews.tags}) WHERE json_each.value = ${tag})`,
    );
  }
  if (query.userId) {
    conditions.push(eq(reviews.userId, query.userId));
  }

  if (query.sort === 'rating') {
    const cursor = query.cursor ? parseRatingCursor(query.cursor) : null;
    if (cursor) {
      conditions.push(ratingCursorCondition(cursor));
    }
  } else {
    const cursor = query.cursor ? parseLatestCursor(query.cursor) : null;
    if (cursor) {
      conditions.push(latestCursorCondition(cursor));
    }
  }

  const orderBy =
    query.sort === 'rating'
      ? [desc(reviews.rating), desc(reviews.createdAt), desc(reviews.id)]
      : [desc(reviews.createdAt), desc(reviews.id)];

  const rows = await reviewFeedQuery(db)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(...orderBy)
    .limit(query.limit + 1);

  const page = rows.slice(0, query.limit);
  const last = page.at(-1);
  const hasMore = rows.length > query.limit;
  const nextCursor =
    hasMore && last
      ? query.sort === 'rating'
        ? encodeRatingCursor(last)
        : encodeLatestCursor(last)
      : null;

  return { items: page.map(toReviewFeedItem), nextCursor };
}
