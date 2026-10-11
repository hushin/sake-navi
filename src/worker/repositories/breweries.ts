import { asc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { breweries, reviews, sakes } from '../db/schema';

/** フロアマップの 1 件。酒蔵ごとの平均評価と、自分がレビュー済みかを持つ */
export type BreweryListItem = {
  id: number;
  name: string;
  mapColumn: number;
  mapRow: number;
  area: string | null;
  reviewCount: number;
  averageRating: number | null;
  hasUserReviewed: boolean;
};

/**
 * マップに出す酒蔵の一覧（ブース番号順）。
 *
 * `hasUserReviewed` は「その酒蔵の出品酒のどれかを自分がレビューしたか」。
 * `userId` が null（未サインイン）なら常に false になる。
 */
export async function listBreweries(
  db: Db,
  options: { userId: string | null },
): Promise<BreweryListItem[]> {
  const rows = await db
    .select({
      id: breweries.id,
      name: breweries.name,
      mapColumn: breweries.mapColumn,
      mapRow: breweries.mapRow,
      area: breweries.area,
      reviewCount: sql<number>`count(${reviews.id})`,
      averageRating: sql<number | null>`avg(${reviews.rating})`,
      // 自分のレビューだけを数える。未サインイン（null）は 1 件も一致しない
      myReviewCount: sql<number>`count(${reviews.id}) filter (where ${reviews.userId} = ${options.userId})`,
    })
    .from(breweries)
    .leftJoin(sakes, eq(sakes.breweryId, breweries.id))
    .leftJoin(reviews, eq(reviews.sakeId, sakes.id))
    .groupBy(breweries.id, breweries.name, breweries.mapColumn, breweries.mapRow, breweries.area)
    .orderBy(asc(breweries.id));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    mapColumn: row.mapColumn,
    mapRow: row.mapRow,
    area: row.area,
    reviewCount: row.reviewCount,
    averageRating: row.averageRating,
    hasUserReviewed: row.myReviewCount > 0,
  }));
}
