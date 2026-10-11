import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '../db';
import { bookmarks, breweries, sakes } from '../db/schema';

/** ブックマーク一覧の 1 件。画面がそのまま描ける形（酒と酒蔵を畳んで返す） */
export type BookmarkItem = {
  id: number;
  sakeId: number;
  createdAt: Date;
  sake: {
    id: number;
    name: string;
    type: string | null;
    category: string;
    isLimited: boolean;
    paidTastingPrice: number | null;
  };
  brewery: { id: number; name: string };
};

/**
 * 自分が保存した銘柄。登録した順（古い順）に返す。
 *
 * ブックマークは 1 人あたり数十件なので、ページネーションはしない。
 */
export async function listBookmarks(db: Db, userId: string): Promise<BookmarkItem[]> {
  const rows = await db
    .select({
      id: bookmarks.id,
      createdAt: bookmarks.createdAt,
      sakeId: sakes.id,
      sakeName: sakes.name,
      sakeType: sakes.type,
      sakeCategory: sakes.category,
      sakeIsLimited: sakes.isLimited,
      sakePaidTastingPrice: sakes.paidTastingPrice,
      breweryId: breweries.id,
      breweryName: breweries.name,
    })
    .from(bookmarks)
    .innerJoin(sakes, eq(sakes.id, bookmarks.sakeId))
    .innerJoin(breweries, eq(breweries.id, sakes.breweryId))
    .where(eq(bookmarks.userId, userId))
    // 同一ミリ秒の並びを安定させるため id も見る
    .orderBy(asc(bookmarks.createdAt), asc(bookmarks.id));

  return rows.map((row) => ({
    id: row.id,
    sakeId: row.sakeId,
    createdAt: row.createdAt,
    sake: {
      id: row.sakeId,
      name: row.sakeName,
      type: row.sakeType,
      category: row.sakeCategory,
      isLimited: row.sakeIsLimited,
      paidTastingPrice: row.sakePaidTastingPrice,
    },
    brewery: { id: row.breweryId, name: row.breweryName },
  }));
}

/**
 * ブックマークを追加する。すでに登録済みなら null を返す
 * （UNIQUE 制約違反を 500 にせず、route が 409 に変換する）。
 */
export async function insertBookmark(
  db: Db,
  userId: string,
  sakeId: number,
): Promise<{ id: number; sakeId: number; createdAt: Date } | null> {
  const rows = await db
    .insert(bookmarks)
    .values({ userId, sakeId })
    .onConflictDoNothing()
    .returning({
      id: bookmarks.id,
      sakeId: bookmarks.sakeId,
      createdAt: bookmarks.createdAt,
    });

  return rows[0] ?? null;
}

/** 自分のブックマークを解除する。無ければ false（route が 404 に変換する） */
export async function deleteBookmark(db: Db, userId: string, sakeId: number): Promise<boolean> {
  const rows = await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.sakeId, sakeId)))
    .returning({ id: bookmarks.id });

  return rows.length > 0;
}
